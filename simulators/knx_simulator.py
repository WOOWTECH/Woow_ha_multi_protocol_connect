#!/usr/bin/env python3
"""
KNXnet/IP Tunnelling 模擬伺服器 — 供 Home Assistant KNX 整合測試
================================================================

使用 XKNX 程式庫的框架類別實作 KNXnet/IP Tunnelling 伺服器。
HA 的 KNX 整合（透過 XKNX）可以用 tunnelling 模式連入此伺服器。

模擬設備 (12 entity types):
  1.  燈光開關     (GA 1/0/1 開關, 1/0/2 狀態)                    DPT 1.001
  2.  調光燈       (GA 1/0/3 開關, 1/0/4 亮度, 1/0/5 狀態)        DPT 1/5
  3.  溫度感測器   (GA 2/0/1 值)                                   DPT 9.001
  4.  窗簾控制     (GA 3/0/1 上下, 3/0/2 位置, 3/0/3 位置狀態)    DPT 1/5
  5.  開關         (GA 4/0/1 命令, 4/0/2 狀態)                    DPT 1.001
  6.  二進制感測器 (GA 4/0/3 狀態, read-only)                     DPT 1.002
  7.  空調         (GA 5/0/1-2 溫度, 5/0/3-4 模式, 5/0/5-6 開關) DPT 9/20/1
  8.  風扇         (GA 6/0/1-2 開關, 6/0/3-4 速度)               DPT 1/5
  9.  數值         (GA 7/0/1 命令, 7/0/2 狀態)                    DPT 9.001
  10. 濕度感測器   (GA 2/0/2 值)                                   DPT 9.007
  11. 場景         (GA 7/0/3 啟動)                                 DPT 17.001
  12. 選擇器       (GA 7/0/4 命令, 7/0/5 狀態)                    DPT 5.005

Stress-test entities (80 total):
  50 temperature sensors (GA 10/0/1 .. 10/0/50)                     DPT 9.001
  20 switches            (GA 11/0/1..11/0/40, odd=cmd, even=state)  DPT 1.001
  10 lights              (GA 12/0/1..12/0/20, odd=cmd, even=state)  DPT 1.001

啟動方式:
  python3 simulators/knx_simulator.py

注意：使用 KNXnet/IP Tunnelling (UDP unicast) on port 3671
"""

import asyncio
import logging
import random
import socket
import struct
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("knx_sim")

# ── 常數 ────────────────────────────────────────────────
KNX_PORT = 3671
KNX_MULTICAST = "224.0.23.12"
UPDATE_INTERVAL = 10.0  # seconds between state broadcasts

# KNXnet/IP Service Types
SVC_SEARCH_REQUEST = 0x0201
SVC_SEARCH_RESPONSE = 0x0202
SVC_SEARCH_REQUEST_EXT = 0x020B
SVC_SEARCH_RESPONSE_EXT = 0x020C
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

# Error codes
E_NO_ERROR = 0x00
E_NO_MORE_CONNECTIONS = 0x24

# Connection type
TUNNEL_CONNECTION = 0x04
DATA_LINK_LAYER = 0x02

# cEMI message codes
L_DATA_REQ = 0x11
L_DATA_IND = 0x29
L_DATA_CON = 0x2E


# ── 工具函式 ─────────────────────────────────────────────

def get_local_ip() -> str:
    """Detect local IP that can reach the network."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "0.0.0.0"


def make_header(service_type: int, body_len: int) -> bytes:
    """Build KNXnet/IP header (6 bytes)."""
    total = 6 + body_len
    return struct.pack("!BBHH", 0x06, 0x10, service_type, total)


def make_hpai(ip: str, port: int, protocol: int = 0x01) -> bytes:
    """Build HPAI (8 bytes)."""
    return struct.pack("!BB", 0x08, protocol) + socket.inet_aton(ip) + struct.pack("!H", port)


def parse_hpai(data: bytes, offset: int = 0) -> tuple:
    """Parse HPAI, return (ip, port, next_offset)."""
    length = data[offset]
    protocol = data[offset + 1]
    ip = socket.inet_ntoa(data[offset + 2:offset + 6])
    port = struct.unpack("!H", data[offset + 6:offset + 8])[0]
    return ip, port, offset + length


def encode_individual_address(area: int, line: int, device: int) -> bytes:
    """Encode individual address like 1.0.1 to 2 bytes."""
    return struct.pack("!H", (area << 12) | (line << 8) | device)


def encode_group_address(ga_str: str) -> bytes:
    """Encode '1/0/1' style group address to 2 bytes."""
    parts = ga_str.split("/")
    main, mid, sub = int(parts[0]), int(parts[1]), int(parts[2])
    return struct.pack("!H", (main << 11) | (mid << 8) | sub)


def decode_group_address(data: bytes) -> str:
    """Decode 2-byte group address to '1/0/1' string."""
    val = struct.unpack("!H", data)[0]
    return f"{(val >> 11) & 0x1F}/{(val >> 8) & 0x07}/{val & 0xFF}"


# ── DPT 編碼 ────────────────────────────────────────────

def encode_dpt1(value: bool) -> bytes:
    return bytes([0x01 if value else 0x00])


def encode_dpt5(value: int) -> bytes:
    scaled = max(0, min(255, int(value * 255 / 100)))
    return bytes([scaled])


def encode_dpt9(value: float) -> bytes:
    """DPT 9.001 (2-byte float)."""
    sign = 0
    mantissa = int(round(value * 100))
    if mantissa < 0:
        sign = 1
        mantissa = -mantissa
    exponent = 0
    while mantissa > 2047:
        mantissa = mantissa >> 1
        exponent += 1
    if sign:
        mantissa = (~mantissa + 1) & 0x7FF
    return struct.pack("!H", (sign << 15) | (exponent << 11) | (mantissa & 0x7FF))


def encode_dpt17(value: int) -> bytes:
    """DPT 17.001 (scene number 0-63)."""
    return bytes([max(0, min(63, int(value)))])


def encode_dpt20(value: int) -> bytes:
    """DPT 20.102 (HVAC mode: 0=Auto, 1=Comfort, 2=Standby, 3=Economy, 4=Building Protection)."""
    return bytes([max(0, min(4, int(value)))])


def encode_dpt5_raw(value: int) -> bytes:
    """DPT 5.005 / 5.010 — raw unsigned byte, no scaling."""
    return bytes([max(0, min(255, int(value)))])


def decode_dpt9(data: bytes) -> float:
    """Decode DPT 9.x (2-byte float) from raw bytes."""
    if len(data) < 2:
        return 0.0
    raw = struct.unpack("!H", data[:2])[0]
    sign = (raw >> 15) & 0x01
    exponent = (raw >> 11) & 0x0F
    mantissa = raw & 0x07FF
    if sign:
        mantissa = mantissa - 2048
    return 0.01 * mantissa * (2 ** exponent)


# ── DIB 區塊 ────────────────────────────────────────────

def make_dib_device_info(local_ip: str) -> bytes:
    """Build DIBDeviceInformation (54 bytes)."""
    buf = bytearray(54)
    buf[0] = 54           # structure length
    buf[1] = 0x01         # DEVICE_INFO
    buf[2] = 0x02         # KNX Medium: TP1
    buf[3] = 0x00         # device status
    # Individual address 1.0.1
    struct.pack_into("!H", buf, 4, 0x1001)
    # Project installation ID
    struct.pack_into("!H", buf, 6, 0x0001)
    # Serial number (6 bytes)
    buf[8:14] = b"\x00\x01\x02\x03\x04\x05"
    # Multicast address (224.0.23.12)
    buf[14:18] = socket.inet_aton(KNX_MULTICAST)
    # MAC address
    buf[18:24] = b"\xAA\xBB\xCC\xDD\xEE\xFF"
    # Device name (30 bytes, null-padded)
    name = b"Woow KNX Simulator"
    buf[24:24 + len(name)] = name
    return bytes(buf)


def make_dib_supp_svc() -> bytes:
    """Build DIBSuppSVCFamilies — announce CORE v1 + TUNNELING v1."""
    families = [
        (0x02, 0x01),  # CORE version 1
        (0x04, 0x01),  # TUNNELING version 1
    ]
    length = 2 + 2 * len(families)
    buf = bytearray([length, 0x02])  # length, type=SUPP_SVC_FAMILIES
    for fam, ver in families:
        buf += bytes([fam, ver])
    return bytes(buf)


# ── cEMI 工具 ───────────────────────────────────────────

def make_cemi_group_write(source_ia: bytes, dest_ga: str, payload: bytes,
                          msg_code: int = L_DATA_IND, force_long: bool = False) -> bytes:
    """Build a cEMI L_Data frame for GroupValueWrite.

    force_long: if True, always use long format even for 1-byte payloads.
    This is needed for DPT5, DPT9, etc. where XKNX expects separate data bytes.
    """
    dest_bytes = encode_group_address(dest_ga)
    if len(payload) <= 1 and not force_long:
        # Short frame (for DPT1 boolean values)
        val = payload[0] if payload else 0
        apci = bytes([0x00, 0x80 | (val & 0x3F)])
        npdu_len = 1
    else:
        # Long frame (separate data bytes after APCI)
        apci = bytes([0x00, 0x80]) + payload
        npdu_len = 1 + len(payload)

    return bytes([
        msg_code,
        0x00,        # additional info length
        0xBC,        # ctrl1: standard frame, no repeat, broadcast, priority low
        0xE0,        # ctrl2: group address, hop count 6
    ]) + source_ia + dest_bytes + bytes([npdu_len]) + apci


def make_cemi_group_response(source_ia: bytes, dest_ga: str, payload: bytes,
                             force_long: bool = False) -> bytes:
    """Build a cEMI L_Data.ind for GroupValueResponse."""
    dest_bytes = encode_group_address(dest_ga)
    if len(payload) <= 1 and not force_long:
        val = payload[0] if payload else 0
        apci = bytes([0x00, 0x40 | (val & 0x3F)])
        npdu_len = 1
    else:
        apci = bytes([0x00, 0x40]) + payload
        npdu_len = 1 + len(payload)

    return bytes([
        L_DATA_IND,
        0x00,
        0xBC,
        0xE0,
    ]) + source_ia + dest_bytes + bytes([npdu_len]) + apci


# ── 模擬狀態 ────────────────────────────────────────────

SIM_STATE = {
    # Existing
    "light_on": False,
    "dimmer_on": False,
    "dimmer_brightness": 0,
    "temperature": 23.5,
    "cover_position": 100,
    # New: Switch (#5)
    "switch_on": False,
    # New: Binary Sensor (#6)
    "binary_sensor_motion": False,
    # New: Climate (#7)
    "climate_on": True,
    "climate_setpoint": 22.0,
    "climate_hvac_mode": 0,  # 0=Auto, 1=Comfort, 2=Standby, 3=Economy, 4=Building Protection
    # New: Fan (#8)
    "fan_on": False,
    "fan_speed": 0,  # 0-100 percent
    # New: Number (#9)
    "number_value": 50.0,
    # New: Humidity sensor (#10)
    "humidity": 55.0,
    # New: Scene (#11)
    "scene_number": 0,
    # New: Select (#12)
    "select_value": 0,
    # ── Stress-test entities ──────────────────────────────
    # 50 temperature sensors (GA 10/0/1 .. 10/0/50)  DPT 9.001
    "stress_temps": [20.0 + i * 0.5 for i in range(50)],
    # 20 switches (GA 11/0/1 cmd, 11/0/2 state .. 11/0/39 cmd, 11/0/40 state) DPT 1.001
    "stress_switches": [False] * 20,
    # 10 lights  (GA 12/0/1 cmd, 12/0/2 state .. 12/0/19 cmd, 12/0/20 state) DPT 1.001
    "stress_lights": [False] * 10,
}


# ── 連線管理 ────────────────────────────────────────────

class TunnelConnection:
    def __init__(self, channel_id: int, client_addr: tuple, individual_addr: bytes):
        self.channel_id = channel_id
        self.client_addr = client_addr
        self.individual_addr = individual_addr
        self.server_seq = 0  # sequence for server → client
        self.client_seq = 0  # expected sequence from client
        self.last_heartbeat = time.time()


# ── 主要伺服器 ──────────────────────────────────────────

class KNXTunnelServer:
    def __init__(self):
        self.local_ip = get_local_ip()
        self.connections: dict[int, TunnelConnection] = {}
        self.next_channel = 1
        self.server_ia = encode_individual_address(1, 0, 1)
        self.running = True
        self.transport = None
        self.sock = None

    def get_next_channel(self) -> int:
        """Assign a free channel ID."""
        for i in range(1, 255):
            if i not in self.connections:
                return i
        return 0

    # ── UDP 收送 ─────────────────────────────────────────

    def send_to(self, data: bytes, addr: tuple):
        """Send UDP packet."""
        if self.sock:
            self.sock.sendto(data, addr)

    def resolve_hpai_addr(self, hpai_ip: str, hpai_port: int, sender_addr: tuple) -> tuple:
        """Resolve HPAI address, falling back to sender addr if 0.0.0.0:0."""
        if hpai_ip == "0.0.0.0" and hpai_port == 0:
            return sender_addr
        return (hpai_ip, hpai_port)

    # ── 封包處理 ─────────────────────────────────────────

    def handle_packet(self, data: bytes, addr: tuple):
        """Dispatch incoming KNXnet/IP frame."""
        if len(data) < 6:
            return

        header_len, version, svc_type, total_len = struct.unpack("!BBHH", data[:6])
        if header_len != 0x06 or version != 0x10:
            return

        body = data[6:]

        handlers = {
            SVC_SEARCH_REQUEST: self.handle_search,
            SVC_SEARCH_REQUEST_EXT: self.handle_search_ext,
            SVC_DESCRIPTION_REQUEST: self.handle_description,
            SVC_CONNECT_REQUEST: self.handle_connect,
            SVC_CONNECTIONSTATE_REQUEST: self.handle_connectionstate,
            SVC_DISCONNECT_REQUEST: self.handle_disconnect,
            SVC_TUNNELLING_REQUEST: self.handle_tunnelling,
            SVC_TUNNELLING_ACK: self.handle_tunnelling_ack,
        }

        handler = handlers.get(svc_type)
        if handler:
            handler(body, addr)
        else:
            log.debug("Unknown service type 0x%04X from %s", svc_type, addr)

    # ── Search ───────────────────────────────────────────

    def handle_search(self, body: bytes, addr: tuple):
        """Handle SearchRequest → reply with SearchResponse."""
        if len(body) < 8:
            return
        hpai_ip, hpai_port, _ = parse_hpai(body, 0)
        reply_addr = self.resolve_hpai_addr(hpai_ip, hpai_port, addr)

        log.info("SearchRequest from %s", addr)

        # Build response body
        control_hpai = make_hpai(self.local_ip, KNX_PORT)
        dib_dev = make_dib_device_info(self.local_ip)
        dib_svc = make_dib_supp_svc()
        resp_body = control_hpai + dib_dev + dib_svc

        frame = make_header(SVC_SEARCH_RESPONSE, len(resp_body)) + resp_body
        self.send_to(frame, reply_addr)
        log.info("SearchResponse → %s", reply_addr)

    def handle_search_ext(self, body: bytes, addr: tuple):
        """Handle SearchRequestExtended → reply with SearchResponseExtended."""
        if len(body) < 8:
            return
        hpai_ip, hpai_port, _ = parse_hpai(body, 0)
        reply_addr = self.resolve_hpai_addr(hpai_ip, hpai_port, addr)

        log.info("SearchRequestExtended from %s", addr)

        control_hpai = make_hpai(self.local_ip, KNX_PORT)
        dib_dev = make_dib_device_info(self.local_ip)
        dib_svc = make_dib_supp_svc()
        resp_body = control_hpai + dib_dev + dib_svc

        frame = make_header(SVC_SEARCH_RESPONSE_EXT, len(resp_body)) + resp_body
        self.send_to(frame, reply_addr)
        log.info("SearchResponseExtended → %s", reply_addr)

    # ── Description ──────────────────────────────────────

    def handle_description(self, body: bytes, addr: tuple):
        """Handle DescriptionRequest → reply with DescriptionResponse."""
        log.info("DescriptionRequest from %s", addr)

        dib_dev = make_dib_device_info(self.local_ip)
        dib_svc = make_dib_supp_svc()
        resp_body = dib_dev + dib_svc

        frame = make_header(SVC_DESCRIPTION_RESPONSE, len(resp_body)) + resp_body
        self.send_to(frame, addr)
        log.info("DescriptionResponse → %s", addr)

    # ── Connect ──────────────────────────────────────────

    def handle_connect(self, body: bytes, addr: tuple):
        """Handle ConnectRequest → assign channel, reply ConnectResponse."""
        if len(body) < 20:
            log.warning("ConnectRequest too short from %s", addr)
            return

        ctrl_ip, ctrl_port, off1 = parse_hpai(body, 0)
        data_ip, data_port, off2 = parse_hpai(body, off1)

        # CRI
        cri_len = body[off2]
        conn_type = body[off2 + 1]
        knx_layer = body[off2 + 2] if cri_len >= 3 else DATA_LINK_LAYER

        client_addr = self.resolve_hpai_addr(ctrl_ip, ctrl_port, addr)
        log.info("ConnectRequest from %s (type=%d, layer=%d)", client_addr, conn_type, knx_layer)

        if conn_type != TUNNEL_CONNECTION:
            # Unsupported
            resp = struct.pack("!BB", 0, 0x22)  # E_CONNECTION_TYPE
            frame = make_header(SVC_CONNECT_RESPONSE, len(resp)) + resp
            self.send_to(frame, client_addr)
            return

        channel_id = self.get_next_channel()
        if channel_id == 0:
            resp = struct.pack("!BB", 0, E_NO_MORE_CONNECTIONS)
            frame = make_header(SVC_CONNECT_RESPONSE, len(resp)) + resp
            self.send_to(frame, client_addr)
            return

        # Assign individual address for this tunnel (1.0.240 + channel)
        tunnel_ia = encode_individual_address(1, 0, 240 + channel_id)

        conn = TunnelConnection(channel_id, client_addr, tunnel_ia)
        self.connections[channel_id] = conn

        # Build ConnectResponse
        # channel_id (1) + status (1) + data HPAI (8) + CRD (4)
        resp = bytes([channel_id, E_NO_ERROR])
        resp += make_hpai(self.local_ip, KNX_PORT)
        # CRD: length(4), type(TUNNEL_CONNECTION), individual address(2)
        resp += bytes([0x04, TUNNEL_CONNECTION]) + tunnel_ia

        frame = make_header(SVC_CONNECT_RESPONSE, len(resp)) + resp
        self.send_to(frame, client_addr)
        log.info("ConnectResponse → %s (channel=%d, IA=1.0.%d)",
                 client_addr, channel_id, 240 + channel_id)

    # ── ConnectionState ──────────────────────────────────

    def handle_connectionstate(self, body: bytes, addr: tuple):
        """Handle ConnectionStateRequest → reply ConnectionStateResponse."""
        if len(body) < 2:
            return
        channel_id = body[0]

        conn = self.connections.get(channel_id)
        if conn:
            conn.last_heartbeat = time.time()
            status = E_NO_ERROR
        else:
            status = 0x21  # E_CONNECTION_ID

        resp = bytes([channel_id, status])
        frame = make_header(SVC_CONNECTIONSTATE_RESPONSE, len(resp)) + resp
        self.send_to(frame, addr)
        log.debug("ConnectionStateResponse → %s (ch=%d, status=0x%02X)",
                  addr, channel_id, status)

    # ── Disconnect ───────────────────────────────────────

    def handle_disconnect(self, body: bytes, addr: tuple):
        """Handle DisconnectRequest → cleanup and reply."""
        if len(body) < 2:
            return
        channel_id = body[0]

        if channel_id in self.connections:
            del self.connections[channel_id]
            log.info("Disconnected channel %d from %s", channel_id, addr)

        resp = bytes([channel_id, E_NO_ERROR])
        frame = make_header(SVC_DISCONNECT_RESPONSE, len(resp)) + resp
        self.send_to(frame, addr)

    # ── Tunnelling ───────────────────────────────────────

    def handle_tunnelling(self, body: bytes, addr: tuple):
        """Handle TunnellingRequest from client → ACK + process cEMI."""
        if len(body) < 4:
            return

        # Tunnelling header
        th_len = body[0]  # should be 4
        channel_id = body[1]
        seq = body[2]

        conn = self.connections.get(channel_id)
        if not conn:
            log.warning("TunnellingRequest for unknown channel %d", channel_id)
            return

        # Send ACK
        ack = bytes([0x04, channel_id, seq, E_NO_ERROR])
        frame = make_header(SVC_TUNNELLING_ACK, len(ack)) + ack
        self.send_to(frame, addr)

        # Check sequence
        if seq != conn.client_seq:
            if seq == (conn.client_seq - 1) & 0xFF:
                log.debug("Retransmission detected (seq=%d), ACK only", seq)
            else:
                log.warning("Unexpected seq %d (expected %d)", seq, conn.client_seq)
            return

        conn.client_seq = (conn.client_seq + 1) & 0xFF

        # Parse cEMI
        cemi = body[th_len:]
        if len(cemi) < 9:
            return

        self.process_cemi(cemi, conn)

    def handle_tunnelling_ack(self, body: bytes, addr: tuple):
        """Handle TunnellingAck from client."""
        if len(body) < 4:
            return
        # Just acknowledge it's received; no action needed for a simulator
        log.debug("TunnellingAck received (ch=%d, seq=%d)", body[1], body[2])

    def process_cemi(self, cemi: bytes, conn: TunnelConnection):
        """Process incoming cEMI frame from client."""
        msg_code = cemi[0]
        add_info_len = cemi[1]
        offset = 2 + add_info_len

        if len(cemi) < offset + 7:
            return

        ctrl1 = cemi[offset]
        ctrl2 = cemi[offset + 1]
        source = cemi[offset + 2:offset + 4]
        dest = cemi[offset + 4:offset + 6]
        npdu_len = cemi[offset + 6]
        apci_data = cemi[offset + 7:offset + 7 + npdu_len + 1]

        # Check if destination is a group address (bit 7 of ctrl2)
        is_group = bool(ctrl2 & 0x80)
        if not is_group:
            return

        ga = decode_group_address(dest)

        # Determine APCI type
        if len(apci_data) < 2:
            return

        apci = (apci_data[0] << 8) | apci_data[1]
        apci_type = apci & 0x03C0  # APCI bits

        if apci_type == 0x0000:
            # GroupValueRead
            log.info("RX GroupValueRead GA %s", ga)
            self.handle_group_read(ga, conn)
        elif apci_type == 0x0080:
            # GroupValueWrite
            if npdu_len <= 1:
                value = apci_data[1] & 0x3F
                log.info("RX GroupValueWrite GA %s = %d (short)", ga, value)
                self.handle_group_write(ga, bytes([value]), conn)
            else:
                payload = apci_data[2:]
                log.info("RX GroupValueWrite GA %s = %s (long)", ga, payload.hex())
                self.handle_group_write(ga, payload, conn)
        elif apci_type == 0x0040:
            # GroupValueResponse
            log.debug("RX GroupValueResponse GA %s (ignored)", ga)

        # Send L_Data.con (confirmation) back to client
        con_cemi = bytes([L_DATA_CON]) + cemi[1:]
        self.send_tunnelling_request(conn, con_cemi)

    def handle_group_read(self, ga: str, conn: TunnelConnection):
        """Handle a GroupValueRead by sending a GroupValueResponse."""
        s = SIM_STATE
        # (description, payload, force_long)
        response_map = {
            "1/0/2": ("Light state", encode_dpt1(s["light_on"]), False),
            "1/0/5": ("Dimmer state", encode_dpt1(s["dimmer_on"]), False),
            "1/0/4": ("Brightness", encode_dpt5(s["dimmer_brightness"]), True),
            "2/0/1": ("Temperature", encode_dpt9(s["temperature"]), True),
            "3/0/3": ("Cover position", encode_dpt5(s["cover_position"]), True),
            # New entries
            "4/0/2": ("Switch state", encode_dpt1(s["switch_on"]), False),
            "4/0/3": ("Binary sensor", encode_dpt1(s["binary_sensor_motion"]), False),
            "5/0/2": ("Climate setpoint", encode_dpt9(s["climate_setpoint"]), True),
            "5/0/4": ("Climate HVAC mode", encode_dpt20(s["climate_hvac_mode"]), True),
            "5/0/6": ("Climate on/off", encode_dpt1(s["climate_on"]), False),
            "6/0/2": ("Fan on/off", encode_dpt1(s["fan_on"]), False),
            "6/0/4": ("Fan speed", encode_dpt5(s["fan_speed"]), True),
            "7/0/2": ("Number value", encode_dpt9(s["number_value"]), True),
            "2/0/2": ("Humidity", encode_dpt9(s["humidity"]), True),
            "7/0/3": ("Scene number", encode_dpt17(s["scene_number"]), True),
            "7/0/5": ("Select value", encode_dpt5_raw(s["select_value"]), True),
        }

        if ga in response_map:
            desc, payload, force_long = response_map[ga]
            cemi = make_cemi_group_response(self.server_ia, ga, payload,
                                            force_long=force_long)
            self.send_tunnelling_request(conn, cemi)
            log.info("TX GroupValueResponse GA %s (%s)", ga, desc)
            return

        # ── Stress-test GA reads ──────────────────────────
        parts = ga.split("/")
        main_g, mid_g, sub_g = int(parts[0]), int(parts[1]), int(parts[2])

        # 50 temperature sensors: GA 10/0/1..10/0/50 → DPT 9.001
        if main_g == 10 and mid_g == 0 and 1 <= sub_g <= 50:
            idx = sub_g - 1
            val = s["stress_temps"][idx]
            cemi = make_cemi_group_response(
                self.server_ia, ga, encode_dpt9(val), force_long=True)
            self.send_tunnelling_request(conn, cemi)
            log.info("TX GroupValueResponse GA %s (stress temp #%d = %.1f°C)", ga, idx + 1, val)
            return

        # 20 switches: state GAs are even 11/0/2,4,...,40 → DPT 1.001
        if main_g == 11 and mid_g == 0 and 1 <= sub_g <= 40 and sub_g % 2 == 0:
            idx = (sub_g // 2) - 1
            val = s["stress_switches"][idx]
            cemi = make_cemi_group_response(
                self.server_ia, ga, encode_dpt1(val), force_long=False)
            self.send_tunnelling_request(conn, cemi)
            log.info("TX GroupValueResponse GA %s (stress switch #%d = %s)", ga, idx + 1, val)
            return

        # 10 lights: state GAs are even 12/0/2,4,...,20 → DPT 1.001
        if main_g == 12 and mid_g == 0 and 1 <= sub_g <= 20 and sub_g % 2 == 0:
            idx = (sub_g // 2) - 1
            val = s["stress_lights"][idx]
            cemi = make_cemi_group_response(
                self.server_ia, ga, encode_dpt1(val), force_long=False)
            self.send_tunnelling_request(conn, cemi)
            log.info("TX GroupValueResponse GA %s (stress light #%d = %s)", ga, idx + 1, val)
            return

    def handle_group_write(self, ga: str, payload: bytes, conn: TunnelConnection):
        """Handle a GroupValueWrite from HA — update simulation state."""
        s = SIM_STATE

        if ga == "1/0/1":
            val = bool(payload[0] & 0x01) if payload else False
            s["light_on"] = val
            log.info("Light → %s", "ON" if val else "OFF")
            # Send state feedback on 1/0/2
            cemi = make_cemi_group_write(self.server_ia, "1/0/2", encode_dpt1(val))
            self.send_tunnelling_to_all(cemi)

        elif ga == "1/0/3":
            val = bool(payload[0] & 0x01) if payload else False
            s["dimmer_on"] = val
            log.info("Dimmer → %s", "ON" if val else "OFF")
            cemi = make_cemi_group_write(self.server_ia, "1/0/5", encode_dpt1(val))
            self.send_tunnelling_to_all(cemi)

        elif ga == "1/0/4":
            if payload:
                raw = payload[0]
                s["dimmer_brightness"] = int(raw * 100 / 255)
                # Auto-set dimmer on/off based on brightness
                new_on = s["dimmer_brightness"] > 0
                if new_on != s["dimmer_on"]:
                    s["dimmer_on"] = new_on
                    cemi = make_cemi_group_write(self.server_ia, "1/0/5",
                                                 encode_dpt1(new_on))
                    self.send_tunnelling_to_all(cemi)
                log.info("Dimmer brightness → %d%% (on=%s)",
                         s["dimmer_brightness"], s["dimmer_on"])

        elif ga == "3/0/1":
            val = bool(payload[0] & 0x01) if payload else False
            if val:  # down
                s["cover_position"] = max(0, s["cover_position"] - 10)
            else:  # up
                s["cover_position"] = min(100, s["cover_position"] + 10)
            log.info("Cover → %d%%", s["cover_position"])
            cemi = make_cemi_group_write(
                self.server_ia, "3/0/3", encode_dpt5(s["cover_position"]),
                force_long=True)
            self.send_tunnelling_to_all(cemi)

        elif ga == "3/0/2":
            if payload:
                raw = payload[0]
                s["cover_position"] = int(raw * 100 / 255)
                log.info("Cover position → %d%%", s["cover_position"])
                cemi = make_cemi_group_write(
                    self.server_ia, "3/0/3", encode_dpt5(s["cover_position"]),
                    force_long=True)
                self.send_tunnelling_to_all(cemi)

        # Switch (#5)
        elif ga == "4/0/1":
            val = bool(payload[0] & 0x01) if payload else False
            s["switch_on"] = val
            log.info("Switch → %s", "ON" if val else "OFF")
            cemi = make_cemi_group_write(self.server_ia, "4/0/2", encode_dpt1(val))
            self.send_tunnelling_to_all(cemi)

        # Climate setpoint (#7)
        elif ga == "5/0/1":
            if len(payload) >= 2:
                s["climate_setpoint"] = decode_dpt9(payload)
                log.info("Climate setpoint → %.1f°C", s["climate_setpoint"])
                cemi = make_cemi_group_write(
                    self.server_ia, "5/0/2", encode_dpt9(s["climate_setpoint"]),
                    force_long=True)
                self.send_tunnelling_to_all(cemi)

        # Climate HVAC mode (#7)
        elif ga == "5/0/3":
            if payload:
                s["climate_hvac_mode"] = payload[0] & 0xFF
                mode_names = {0: "Auto", 1: "Comfort", 2: "Standby",
                              3: "Economy", 4: "Building Protection"}
                log.info("Climate HVAC mode → %s (%d)",
                         mode_names.get(s["climate_hvac_mode"], "Unknown"),
                         s["climate_hvac_mode"])
                cemi = make_cemi_group_write(
                    self.server_ia, "5/0/4",
                    encode_dpt20(s["climate_hvac_mode"]), force_long=True)
                self.send_tunnelling_to_all(cemi)

        # Climate on/off (#7)
        elif ga == "5/0/5":
            val = bool(payload[0] & 0x01) if payload else False
            s["climate_on"] = val
            log.info("Climate → %s", "ON" if val else "OFF")
            cemi = make_cemi_group_write(self.server_ia, "5/0/6", encode_dpt1(val))
            self.send_tunnelling_to_all(cemi)

        # Fan on/off (#8)
        elif ga == "6/0/1":
            val = bool(payload[0] & 0x01) if payload else False
            s["fan_on"] = val
            log.info("Fan → %s", "ON" if val else "OFF")
            cemi = make_cemi_group_write(self.server_ia, "6/0/2", encode_dpt1(val))
            self.send_tunnelling_to_all(cemi)

        # Fan speed (#8)
        elif ga == "6/0/3":
            if payload:
                raw = payload[0]
                s["fan_speed"] = int(raw * 100 / 255)
                new_on = s["fan_speed"] > 0
                if new_on != s["fan_on"]:
                    s["fan_on"] = new_on
                    cemi = make_cemi_group_write(
                        self.server_ia, "6/0/2", encode_dpt1(new_on))
                    self.send_tunnelling_to_all(cemi)
                log.info("Fan speed → %d%% (on=%s)", s["fan_speed"], s["fan_on"])
                cemi = make_cemi_group_write(
                    self.server_ia, "6/0/4", encode_dpt5(s["fan_speed"]),
                    force_long=True)
                self.send_tunnelling_to_all(cemi)

        # Number value (#9)
        elif ga == "7/0/1":
            if len(payload) >= 2:
                s["number_value"] = decode_dpt9(payload)
                log.info("Number value → %.1f", s["number_value"])
                cemi = make_cemi_group_write(
                    self.server_ia, "7/0/2", encode_dpt9(s["number_value"]),
                    force_long=True)
                self.send_tunnelling_to_all(cemi)

        # Scene activate (#11)
        elif ga == "7/0/3":
            if payload:
                s["scene_number"] = payload[0] & 0x3F
                log.info("Scene activated → #%d", s["scene_number"])

        # Select value (#12)
        elif ga == "7/0/4":
            if payload:
                s["select_value"] = payload[0] & 0xFF
                option_names = {0: "Off", 1: "Mode A", 2: "Mode B", 3: "Mode C"}
                log.info("Select → %s (%d)",
                         option_names.get(s["select_value"], "Unknown"),
                         s["select_value"])
                cemi = make_cemi_group_write(
                    self.server_ia, "7/0/5",
                    encode_dpt5_raw(s["select_value"]), force_long=True)
                self.send_tunnelling_to_all(cemi)

        else:
            # ── Stress-test GA writes ─────────────────────
            parts = ga.split("/")
            main_g, mid_g, sub_g = int(parts[0]), int(parts[1]), int(parts[2])

            # 20 switches: command GAs are odd 11/0/1,3,...,39 → DPT 1.001
            if main_g == 11 and mid_g == 0 and 1 <= sub_g <= 39 and sub_g % 2 == 1:
                idx = (sub_g // 2)  # 11/0/1→0, 11/0/3→1, ...
                val = bool(payload[0] & 0x01) if payload else False
                s["stress_switches"][idx] = val
                state_ga = f"11/0/{sub_g + 1}"
                log.info("Stress switch #%d → %s", idx + 1, "ON" if val else "OFF")
                cemi = make_cemi_group_write(
                    self.server_ia, state_ga, encode_dpt1(val))
                self.send_tunnelling_to_all(cemi)

            # 10 lights: command GAs are odd 12/0/1,3,...,19 → DPT 1.001
            elif main_g == 12 and mid_g == 0 and 1 <= sub_g <= 19 and sub_g % 2 == 1:
                idx = (sub_g // 2)  # 12/0/1→0, 12/0/3→1, ...
                val = bool(payload[0] & 0x01) if payload else False
                s["stress_lights"][idx] = val
                state_ga = f"12/0/{sub_g + 1}"
                log.info("Stress light #%d → %s", idx + 1, "ON" if val else "OFF")
                cemi = make_cemi_group_write(
                    self.server_ia, state_ga, encode_dpt1(val))
                self.send_tunnelling_to_all(cemi)

    # ── 發送隧道資料 ────────────────────────────────────

    def send_tunnelling_request(self, conn: TunnelConnection, cemi: bytes):
        """Send a TunnellingRequest to a specific client."""
        th = bytes([0x04, conn.channel_id, conn.server_seq, 0x00])
        body = th + cemi
        frame = make_header(SVC_TUNNELLING_REQUEST, len(body)) + body
        self.send_to(frame, conn.client_addr)
        conn.server_seq = (conn.server_seq + 1) & 0xFF

    def send_tunnelling_to_all(self, cemi: bytes):
        """Send a tunnelling request to all connected clients."""
        for conn in list(self.connections.values()):
            self.send_tunnelling_request(conn, cemi)

    # ── 定期廣播 ─────────────────────────────────────────

    def broadcast_states(self):
        """Broadcast all device states to connected clients."""
        if not self.connections:
            return

        s = SIM_STATE
        # (GA, payload, description, force_long)
        telegrams = [
            # Existing
            ("1/0/2", encode_dpt1(s["light_on"]), "Light", False),
            ("1/0/5", encode_dpt1(s["dimmer_on"]), "Dimmer", False),
            ("1/0/4", encode_dpt5(s["dimmer_brightness"]), "Brightness", True),
            ("2/0/1", encode_dpt9(s["temperature"]), f"Temp {s['temperature']:.1f}°C", True),
            ("3/0/3", encode_dpt5(s["cover_position"]), f"Cover {s['cover_position']}%", True),
            # New
            ("4/0/2", encode_dpt1(s["switch_on"]), "Switch", False),
            ("4/0/3", encode_dpt1(s["binary_sensor_motion"]), "Motion", False),
            ("5/0/2", encode_dpt9(s["climate_setpoint"]), f"Setpoint {s['climate_setpoint']:.1f}°C", True),
            ("5/0/4", encode_dpt20(s["climate_hvac_mode"]), f"HVAC mode {s['climate_hvac_mode']}", True),
            ("5/0/6", encode_dpt1(s["climate_on"]), "Climate on/off", False),
            ("6/0/2", encode_dpt1(s["fan_on"]), "Fan on/off", False),
            ("6/0/4", encode_dpt5(s["fan_speed"]), f"Fan {s['fan_speed']}%", True),
            ("7/0/2", encode_dpt9(s["number_value"]), f"Number {s['number_value']:.1f}", True),
            ("2/0/2", encode_dpt9(s["humidity"]), f"Humidity {s['humidity']:.1f}%", True),
            ("7/0/5", encode_dpt5_raw(s["select_value"]), f"Select {s['select_value']}", True),
        ]

        # ── Stress-test broadcasts ────────────────────────
        # 50 temperature sensors  (GA 10/0/1..10/0/50, DPT 9.001)
        for i in range(50):
            ga = f"10/0/{i + 1}"
            telegrams.append((ga, encode_dpt9(s["stress_temps"][i]),
                              f"ST temp#{i + 1}", True))

        # 20 switch states  (GA 11/0/2,4,...,40, DPT 1.001)
        for i in range(20):
            ga = f"11/0/{(i + 1) * 2}"
            telegrams.append((ga, encode_dpt1(s["stress_switches"][i]),
                              f"ST sw#{i + 1}", False))

        # 10 light states  (GA 12/0/2,4,...,20, DPT 1.001)
        for i in range(10):
            ga = f"12/0/{(i + 1) * 2}"
            telegrams.append((ga, encode_dpt1(s["stress_lights"][i]),
                              f"ST lt#{i + 1}", False))

        for ga, payload, desc, force_long in telegrams:
            cemi = make_cemi_group_write(self.server_ia, ga, payload,
                                         force_long=force_long)
            self.send_tunnelling_to_all(cemi)

        st_sw_on = sum(1 for v in s["stress_switches"] if v)
        st_lt_on = sum(1 for v in s["stress_lights"] if v)
        log.info(
            "Broadcast %d telegrams to %d client(s) | Temp=%.1f°C Hum=%.1f%% "
            "Light=%s Dimmer=%s(%d%%) Cover=%d%% Switch=%s "
            "Climate=%s(%.1f°C,m=%d) Fan=%s(%d%%) Num=%.1f Sel=%d "
            "| stress: 50 temps, %d/20 sw ON, %d/10 lt ON",
            len(telegrams), len(self.connections),
            s["temperature"], s["humidity"],
            "ON" if s["light_on"] else "OFF",
            "ON" if s["dimmer_on"] else "OFF", s["dimmer_brightness"],
            s["cover_position"],
            "ON" if s["switch_on"] else "OFF",
            "ON" if s["climate_on"] else "OFF",
            s["climate_setpoint"], s["climate_hvac_mode"],
            "ON" if s["fan_on"] else "OFF", s["fan_speed"],
            s["number_value"], s["select_value"],
            st_sw_on, st_lt_on,
        )

    def update_simulated_values(self):
        """Update simulated sensor values with natural drift."""
        s = SIM_STATE
        s["temperature"] = max(15.0, min(35.0,
            s["temperature"] + random.uniform(-0.3, 0.3)))
        s["humidity"] = max(20.0, min(90.0,
            s["humidity"] + random.uniform(-0.5, 0.5)))
        if random.random() < 0.10:
            s["binary_sensor_motion"] = not s["binary_sensor_motion"]

        # ── Stress-test temperature drift ─────────────────
        for i in range(50):
            s["stress_temps"][i] = max(10.0, min(45.0,
                s["stress_temps"][i] + random.uniform(-0.3, 0.3)))

    # ── 連線超時清理 ─────────────────────────────────────

    def cleanup_stale_connections(self):
        """Remove connections that haven't sent heartbeat in 120s."""
        now = time.time()
        stale = [ch for ch, conn in self.connections.items()
                 if now - conn.last_heartbeat > 120]
        for ch in stale:
            log.warning("Connection channel %d timed out, removing", ch)
            del self.connections[ch]

    # ── 主迴圈 ───────────────────────────────────────────

    async def run(self):
        """Start the KNXnet/IP tunnelling server."""
        log.info("=" * 60)
        log.info("Woow KNXnet/IP Tunnelling 模擬伺服器")
        log.info("=" * 60)
        log.info("Local IP: %s", self.local_ip)
        log.info("監聽: 0.0.0.0:%d (UDP Tunnelling)", KNX_PORT)
        log.info("")
        log.info("模擬設備 (12 entity types + 80 stress-test entities):")
        log.info("  燈光開關    GA 1/0/1(cmd) 1/0/2(state)         DPT 1.001")
        log.info("  調光燈      GA 1/0/3(cmd) 1/0/4(bri) 1/0/5(st) DPT 1/5")
        log.info("  溫度感測器  GA 2/0/1(value)                     DPT 9.001")
        log.info("  濕度感測器  GA 2/0/2(value)                     DPT 9.007")
        log.info("  窗簾        GA 3/0/1(updn) 3/0/2(pos) 3/0/3(st) DPT 1/5")
        log.info("  開關        GA 4/0/1(cmd) 4/0/2(state)         DPT 1.001")
        log.info("  二進制感測  GA 4/0/3(state, read-only)         DPT 1.002")
        log.info("  空調        GA 5/0/1-2(temp) 5/0/3-4(mode) 5/0/5-6(on)")
        log.info("  風扇        GA 6/0/1-2(on) 6/0/3-4(speed)     DPT 1/5")
        log.info("  數值        GA 7/0/1(cmd) 7/0/2(state)         DPT 9.001")
        log.info("  場景        GA 7/0/3(activate)                  DPT 17.001")
        log.info("  選擇器      GA 7/0/4(cmd) 7/0/5(state)         DPT 5.005")
        log.info("")
        log.info("Stress-test entities (80):")
        log.info("  50 temps    GA 10/0/1..10/0/50 (read-only)      DPT 9.001")
        log.info("  20 switches GA 11/0/1..11/0/40 (odd=cmd,even=st) DPT 1.001")
        log.info("  10 lights   GA 12/0/1..12/0/20 (odd=cmd,even=st) DPT 1.001")
        log.info("")
        log.info("等待 KNXnet/IP 連線...")
        log.info("=" * 60)

        # Create UDP socket
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("0.0.0.0", KNX_PORT))
        self.sock.settimeout(1.0)

        # Also join multicast for search requests
        try:
            mreq = struct.pack("4sl", socket.inet_aton(KNX_MULTICAST), socket.INADDR_ANY)
            self.sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            log.info("Joined multicast group %s", KNX_MULTICAST)
        except Exception as e:
            log.warning("Could not join multicast: %s (search discovery won't work)", e)

        loop = asyncio.get_event_loop()
        last_broadcast = time.time()
        last_cleanup = time.time()

        while self.running:
            # Receive packets
            try:
                result = await loop.run_in_executor(None, self._recv)
                if result:
                    data, addr = result
                    self.handle_packet(data, addr)
            except Exception as e:
                log.debug("recv error: %s", e)

            now = time.time()

            # Periodic state broadcast
            if now - last_broadcast >= UPDATE_INTERVAL:
                self.update_simulated_values()
                self.broadcast_states()
                last_broadcast = now

            # Periodic connection cleanup
            if now - last_cleanup >= 30:
                self.cleanup_stale_connections()
                last_cleanup = now

    def _recv(self):
        """Blocking receive with timeout."""
        try:
            return self.sock.recvfrom(1024)
        except socket.timeout:
            return None


if __name__ == "__main__":
    server = KNXTunnelServer()
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        server.running = False
        log.info("KNX 模擬器已停止")
