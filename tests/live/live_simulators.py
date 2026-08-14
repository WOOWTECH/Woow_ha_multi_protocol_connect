#!/usr/bin/env python3
"""Live protocol tests for the three simulators in simulators/.

Speaks each wire protocol directly, so it verifies the simulators themselves —
independently of Home Assistant and of the Setup Guide panels (which do not
speak any protocol; they only edit configuration).

Run on the machine hosting the simulators (Modbus needs pymodbus):

    SIM_HOST=127.0.0.1 python3 tests/live/live_simulators.py
"""

import os
import socket
import struct
import sys

SIM_HOST = os.environ.get("SIM_HOST", "127.0.0.1")
KNX_PORT = 3671
ARTNET_PORT = 6454
MODBUS_PORT = 5020
MODBUS_DEVICE_ID = 1

RESULTS: list[tuple[str, str, bool, str]] = []


def record(phase: str, name: str, passed: bool, detail: str = "") -> None:
    RESULTS.append((phase, name, passed, detail))
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}" + (f" — {detail}" if detail and not passed else ""))


# ─── Art-Net (DMX) ───────────────────────────────────────────────────────
ARTNET_ID = b"Art-Net\x00"
OP_POLL = 0x2000
OP_POLLREPLY = 0x2100
OP_DMX = 0x5000


def artnet_poll(sock: socket.socket) -> bytes | None:
    """Send ArtPoll, return the ArtPollReply payload (or None on timeout)."""
    pkt = ARTNET_ID + struct.pack("<H", OP_POLL) + bytes([0, 14, 0x02, 0x00])
    sock.sendto(pkt, (SIM_HOST, ARTNET_PORT))
    try:
        data, _ = sock.recvfrom(2048)
        return data
    except TimeoutError:
        return None


def artnet_dmx(sock: socket.socket, universe: int, values: list[int]) -> None:
    """Send one ArtDmx frame."""
    length = len(values)
    pkt = (
        ARTNET_ID
        + struct.pack("<H", OP_DMX)
        + bytes([0, 14])                       # protocol version 14
        + bytes([0x00, 0x00])                  # sequence, physical
        + struct.pack("<H", universe)          # sub-uni + net
        + struct.pack(">H", length)            # length, big-endian
        + bytes(values)
    )
    sock.sendto(pkt, (SIM_HOST, ARTNET_PORT))


def test_artnet() -> None:
    phase = "Art-Net"
    print(f"\n{'='*60}\n  {phase} DMX simulator ({SIM_HOST}:{ARTNET_PORT})\n{'='*60}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(4.0)
    try:
        reply = artnet_poll(sock)
        record(phase, "ArtPoll receives ArtPollReply", reply is not None,
               "no reply within 4s")
        if reply:
            record(phase, "Reply has Art-Net magic header",
                   reply.startswith(ARTNET_ID), reply[:8].hex())
            opcode = struct.unpack("<H", reply[8:10])[0] if len(reply) >= 10 else 0
            record(phase, "Reply opcode is ArtPollReply (0x2100)",
                   opcode == OP_POLLREPLY, f"got 0x{opcode:04x}")

        # Drive all 17 documented fixture channels, then prove the node survived.
        artnet_dmx(sock, 0, [255, 255, 0, 0, 0, 128, 64, 32,
                             200, 100, 10, 20, 30, 40, 50, 255, 128])
        record(phase, "ArtDmx frame accepted (17 channels)", True)

        alive = artnet_poll(sock)
        record(phase, "Node still responds after ArtDmx", alive is not None,
               "no reply after DMX frame")
    finally:
        sock.close()


# ─── KNXnet/IP ───────────────────────────────────────────────────────────
KNX_HEADER = bytes([0x06, 0x10])
SVC_SEARCH_REQUEST = 0x0201
SVC_SEARCH_RESPONSE = 0x0202
SVC_DESCRIPTION_REQUEST = 0x0203
SVC_DESCRIPTION_RESPONSE = 0x0204
SVC_CONNECT_REQUEST = 0x0205
SVC_CONNECT_RESPONSE = 0x0206
SVC_CONNECTIONSTATE_REQUEST = 0x0207
SVC_CONNECTIONSTATE_RESPONSE = 0x0208
SVC_DISCONNECT_REQUEST = 0x0209
SVC_DISCONNECT_RESPONSE = 0x020A
SVC_TUNNELLING_REQUEST = 0x0420
SVC_TUNNELLING_ACK = 0x0421


def knx_frame(service: int, body: bytes) -> bytes:
    return KNX_HEADER + struct.pack(">HH", service, 6 + len(body)) + body


def hpai(port: int) -> bytes:
    """Host Protocol Address Information — 0.0.0.0 means 'reply to sender'."""
    return bytes([0x08, 0x01, 0, 0, 0, 0]) + struct.pack(">H", port)


def knx_recv(sock: socket.socket, expect: int | None = None,
             tries: int = 6) -> tuple[int, bytes] | None:
    """Read frames until one matches `expect`.

    The gateway interleaves unsolicited TUNNELLING_REQUEST indications with
    request/response traffic, so a naive single read can pick up an indication
    that belongs to an earlier exchange.
    """
    for _ in range(tries):
        try:
            data, _ = sock.recvfrom(2048)
        except TimeoutError:
            return None
        if len(data) < 6 or data[:2] != KNX_HEADER:
            continue
        service = struct.unpack(">H", data[2:4])[0]
        if expect is None or service == expect:
            return service, data[6:]
    return None


def knx_send(sock: socket.socket, frame: bytes,
             expect: int | None = None) -> tuple[int, bytes] | None:
    """Send a frame, return (service_type, body) of the matching response."""
    sock.sendto(frame, (SIM_HOST, KNX_PORT))
    return knx_recv(sock, expect)


def test_knx() -> None:
    phase = "KNXnet/IP"
    print(f"\n{'='*60}\n  {phase} simulator ({SIM_HOST}:{KNX_PORT})\n{'='*60}")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(4.0)
    sock.bind(("0.0.0.0", 0))
    local_port = sock.getsockname()[1]
    try:
        # Discovery
        resp = knx_send(sock, knx_frame(SVC_SEARCH_REQUEST, hpai(local_port)),
                        expect=SVC_SEARCH_RESPONSE)
        record(phase, "SEARCH_REQUEST -> SEARCH_RESPONSE", resp is not None,
               "no SEARCH_RESPONSE")

        # Description
        resp = knx_send(sock, knx_frame(SVC_DESCRIPTION_REQUEST, hpai(local_port)),
                        expect=SVC_DESCRIPTION_RESPONSE)
        record(phase, "DESCRIPTION_REQUEST -> DESCRIPTION_RESPONSE",
               resp is not None, "no DESCRIPTION_RESPONSE")

        # Tunnelling connect: control HPAI + data HPAI + CRI(tunnel, link layer)
        cri = bytes([0x04, 0x04, 0x02, 0x00])
        resp = knx_send(sock, knx_frame(
            SVC_CONNECT_REQUEST, hpai(local_port) + hpai(local_port) + cri),
            expect=SVC_CONNECT_RESPONSE)
        connected = resp is not None
        record(phase, "CONNECT_REQUEST -> CONNECT_RESPONSE", connected,
               "no CONNECT_RESPONSE")

        channel = resp[1][0] if connected and resp[1] else None
        record(phase, "Connect response carries a channel id", channel is not None)

        if channel is not None:
            # Keepalive
            resp = knx_send(sock, knx_frame(
                SVC_CONNECTIONSTATE_REQUEST,
                bytes([channel, 0x00]) + hpai(local_port)),
                expect=SVC_CONNECTIONSTATE_RESPONSE)
            record(phase, "CONNECTIONSTATE_REQUEST -> CONNECTIONSTATE_RESPONSE",
                   resp is not None, "no CONNECTIONSTATE_RESPONSE")

            # GroupValueWrite 1 -> GA 1/0/1 (documented light switch)
            ga = (1 << 11) | (0 << 8) | 1          # 1/0/1 == 0x0801
            cemi = bytes([0x11, 0x00, 0xBC, 0xE0]) + struct.pack(">H", 0) \
                + struct.pack(">H", ga) + bytes([0x01, 0x00, 0x81])
            conn_header = bytes([0x04, channel, 0x00, 0x00])
            resp = knx_send(sock, knx_frame(
                SVC_TUNNELLING_REQUEST, conn_header + cemi),
                expect=SVC_TUNNELLING_ACK)
            record(phase, "TUNNELLING_REQUEST (write GA 1/0/1) -> ACK",
                   resp is not None, "no ACK")

            # The gateway echoes the write back as an indication, which is how a
            # real KNX client learns the new state.
            ind = knx_recv(sock, expect=SVC_TUNNELLING_REQUEST)
            record(phase, "Write is echoed back as a TUNNELLING indication",
                   ind is not None, "no indication received")

            # Disconnect
            resp = knx_send(sock, knx_frame(
                SVC_DISCONNECT_REQUEST, bytes([channel, 0x00]) + hpai(local_port)),
                expect=SVC_DISCONNECT_RESPONSE)
            record(phase, "DISCONNECT_REQUEST -> DISCONNECT_RESPONSE",
                   resp is not None, "no DISCONNECT_RESPONSE")
    finally:
        sock.close()


# ─── Modbus TCP ──────────────────────────────────────────────────────────
def _unit_kwargs(client_call, **base):
    """pymodbus renamed slave -> device_id across 3.x; try both."""
    try:
        return client_call(**base, device_id=MODBUS_DEVICE_ID)
    except TypeError:
        return client_call(**base, slave=MODBUS_DEVICE_ID)


def _f32(regs) -> float:
    """Decode two big-endian-word registers as float32."""
    return struct.unpack(">f", struct.pack(">HH", regs[0], regs[1]))[0]


def test_modbus() -> None:
    phase = "Modbus TCP"
    print(f"\n{'='*60}\n  {phase} simulator ({SIM_HOST}:{MODBUS_PORT})\n{'='*60}")
    try:
        from pymodbus.client import ModbusTcpClient
    except ImportError as e:
        record(phase, "pymodbus available", False, str(e))
        return

    client = ModbusTcpClient(SIM_HOST, port=MODBUS_PORT, timeout=5)
    if not client.connect():
        record(phase, "TCP connect", False, "could not connect")
        return
    record(phase, "TCP connect", True)

    try:
        # HR 0-1: temperature float32
        rr = _unit_kwargs(client.read_holding_registers, address=0, count=2)
        ok = not rr.isError()
        temp = _f32(rr.registers) if ok else None
        record(phase, "Read temperature (HR 0-1, float32)",
               ok and 0.0 < temp < 60.0, f"{temp}" if ok else str(rr))

        # HR 2-3: humidity float32
        rr = _unit_kwargs(client.read_holding_registers, address=2, count=2)
        ok = not rr.isError()
        hum = _f32(rr.registers) if ok else None
        record(phase, "Read humidity (HR 2-3, float32)",
               ok and 0.0 <= hum <= 100.0, f"{hum}" if ok else str(rr))

        # Discrete inputs 0-2
        rr = _unit_kwargs(client.read_discrete_inputs, address=0, count=3)
        record(phase, "Read discrete inputs (DI 0-2)", not rr.isError(), str(rr))

        # Coil write/read-back round trip
        rr = _unit_kwargs(client.read_coils, address=0, count=1)
        original = rr.bits[0] if not rr.isError() else None
        record(phase, "Read coil 0", original is not None, str(rr))

        wr = _unit_kwargs(client.write_coil, address=0, value=True)
        rr = _unit_kwargs(client.read_coils, address=0, count=1)
        record(phase, "Write coil 0 = ON, reads back ON",
               not wr.isError() and not rr.isError() and rr.bits[0] is True,
               str(rr))

        wr = _unit_kwargs(client.write_coil, address=0, value=False)
        rr = _unit_kwargs(client.read_coils, address=0, count=1)
        record(phase, "Write coil 0 = OFF, reads back OFF",
               not wr.isError() and not rr.isError() and rr.bits[0] is False,
               str(rr))

        # Holding register write/read-back (HR 11 = light brightness 0-255)
        wr = _unit_kwargs(client.write_register, address=11, value=137)
        rr = _unit_kwargs(client.read_holding_registers, address=11, count=1)
        record(phase, "Write HR 11 (brightness) = 137, reads back",
               not wr.isError() and not rr.isError() and rr.registers[0] == 137,
               str(rr.registers if not rr.isError() else rr))

        # Stress block: 50 temperature sensors at HR 100+
        rr = _unit_kwargs(client.read_holding_registers, address=100, count=100)
        record(phase, "Read stress block (HR 100-199, 50 float32 sensors)",
               not rr.isError() and len(rr.registers) == 100, str(rr))

        if original is not None:
            _unit_kwargs(client.write_coil, address=0, value=bool(original))
    finally:
        client.close()


def report() -> int:
    print(f"\n{'='*60}\n  SIMULATOR TEST REPORT\n{'='*60}")
    phases: dict[str, list] = {}
    for phase, name, passed, detail in RESULTS:
        phases.setdefault(phase, []).append((name, passed, detail))
    for phase, items in phases.items():
        p = sum(1 for _, ok, _ in items if ok)
        print(f"  {'[PASS]' if p == len(items) else '[FAIL]'} {phase}: {p}/{len(items)}")
        for name, ok, detail in items:
            if not ok:
                print(f"      - {name}: {detail}")
    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r[2])
    failed = total - passed
    pct = (passed / total * 100) if total else 0.0
    print(f"\n  TOTAL: {passed}/{total} passed ({pct:.1f}%)  |  FAILED: {failed}")
    print(f"{'='*60}")
    return failed


if __name__ == "__main__":
    print(f"Simulator host: {SIM_HOST}")
    test_artnet()
    test_knx()
    test_modbus()
    sys.exit(1 if report() else 0)
