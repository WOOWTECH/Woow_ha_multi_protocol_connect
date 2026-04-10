#!/usr/bin/env python3
"""
Art-Net DMX 模擬節點 — 供 Home Assistant DMX 整合測試
==========================================================

模擬一個 Art-Net DMX 節點（接收端），監聽 Art-Net UDP 封包
並顯示 DMX 通道值的變化。同時會回應 ArtPoll 請求。

模擬 DMX 燈具配置 (涵蓋 artnet_led 所有 7 種燈具類型)：
  Ch 1:     簡易調光燈 (Dimmer)        - 1 channel
  Ch 2-4:   RGB LED 燈條 (R, G, B)     - 3 channels
  Ch 5-8:   RGBW 投射燈 (R, G, B, W)   - 4 channels
  Ch 9-10:  色溫燈 (Cool, Hot)          - 2 channels
  Ch 11-15: RGBWW 燈 (R, G, B, C, H)   - 5 channels
  Ch 16:    Binary 開關燈               - 1 channel
  Ch 17:    Fixed 固定亮度燈             - 1 channel

啟動方式:
  python3 simulators/dmx_artnet_simulator.py

監聽: 0.0.0.0:6454 (Art-Net 標準埠)
"""

import asyncio
import logging
import socket
import struct
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("artnet_sim")

ARTNET_PORT = 6454
ARTNET_HEADER = b"Art-Net\x00"
ARTNET_OPCODE_POLL = 0x2000
ARTNET_OPCODE_POLLREPLY = 0x2100
ARTNET_OPCODE_DMX = 0x5000

# 模擬燈具定義 — 涵蓋 ha-artnet-led 所有 7 種類型
FIXTURES = {
    "Dimmer":     {"start": 1,  "channels": 1, "type": "dimmer"},
    "RGB Strip":  {"start": 2,  "channels": 3, "type": "rgb"},
    "RGBW Spot":  {"start": 5,  "channels": 4, "type": "rgbw"},
    "CCT Light":  {"start": 9,  "channels": 2, "type": "cct"},
    "RGBWW Lamp": {"start": 11, "channels": 5, "type": "rgbww"},
    "Binary Sw":  {"start": 16, "channels": 1, "type": "binary"},
    "Fixed Out":  {"start": 17, "channels": 1, "type": "fixed"},
}

# 當前 DMX 值
dmx_universe = bytearray(512)
last_update = 0
frame_count = 0


def get_local_ip():
    """取得本機 IP。"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def build_artpoll_reply(ip_str: str) -> bytes:
    """建構 ArtPollReply 封包。"""
    ip_bytes = socket.inet_aton(ip_str)

    reply = bytearray(239)
    # Header
    reply[0:8] = ARTNET_HEADER
    # OpCode: ArtPollReply (0x2100) little-endian
    reply[8] = 0x00
    reply[9] = 0x21
    # IP address
    reply[10:14] = ip_bytes
    # Port (little-endian)
    reply[14] = ARTNET_PORT & 0xFF
    reply[15] = (ARTNET_PORT >> 8) & 0xFF
    # Version Hi/Lo
    reply[16] = 0x00
    reply[17] = 0x0E  # Art-Net 4
    # Net/Sub
    reply[18] = 0x00  # NetSwitch
    reply[19] = 0x00  # SubSwitch
    # OEM
    reply[20] = 0x00
    reply[21] = 0xFF
    # Ubea version
    reply[22] = 0x00
    # Status1
    reply[23] = 0xF0  # Indicators Normal, Port-Address Programming Authority: Network
    # ESTA manufacturer
    reply[24] = 0x57  # 'W'
    reply[25] = 0x4F  # 'O' — "WO" for Woow
    # Short Name (18 bytes)
    short_name = b"WoowDMX Sim"
    reply[26:26 + len(short_name)] = short_name
    # Long Name (64 bytes)
    long_name = b"Woow Art-Net DMX Simulator Node"
    reply[44:44 + len(long_name)] = long_name
    # Node Report (64 bytes)
    report = b"#0001 [0000] Woow OK"
    reply[108:108 + len(report)] = report
    # NumPorts
    reply[172] = 0x00
    reply[173] = 0x01  # 1 port
    # Port Types (4 bytes)
    reply[174] = 0x80  # Port 0: output (can receive Art-Net)
    # Good Input (4 bytes)
    reply[178] = 0x80
    # Good Output (4 bytes)
    reply[182] = 0x80
    # SwIn (4 bytes)
    reply[186] = 0x00  # Universe 0
    # SwOut (4 bytes)
    reply[190] = 0x00  # Universe 0

    return bytes(reply)


def display_fixture_state():
    """顯示所有燈具的當前狀態。"""
    lines = []
    for name, fix in FIXTURES.items():
        start = fix["start"] - 1  # 0-indexed
        ch_count = fix["channels"]
        values = list(dmx_universe[start:start + ch_count])

        if fix["type"] == "dimmer":
            pct = int(values[0] * 100 / 255) if values[0] else 0
            lines.append(f"  {name:12s} Ch{fix['start']:3d}     Dim={values[0]:3d} ({pct}%)")
        elif fix["type"] == "rgb":
            lines.append(f"  {name:12s} Ch{fix['start']:3d}-{fix['start']+2}  "
                         f"R={values[0]:3d} G={values[1]:3d} B={values[2]:3d}")
        elif fix["type"] == "rgbw":
            lines.append(f"  {name:12s} Ch{fix['start']:3d}-{fix['start']+3}  "
                         f"R={values[0]:3d} G={values[1]:3d} B={values[2]:3d} W={values[3]:3d}")
        elif fix["type"] == "cct":
            lines.append(f"  {name:12s} Ch{fix['start']:3d}-{fix['start']+1}  "
                         f"Cool={values[0]:3d} Hot={values[1]:3d}")
        elif fix["type"] == "rgbww":
            lines.append(f"  {name:12s} Ch{fix['start']:3d}-{fix['start']+4}  "
                         f"R={values[0]:3d} G={values[1]:3d} B={values[2]:3d} "
                         f"C={values[3]:3d} H={values[4]:3d}")
        elif fix["type"] == "binary":
            state = "ON" if values[0] > 127 else "off"
            lines.append(f"  {name:12s} Ch{fix['start']:3d}     Val={values[0]:3d} ({state})")
        elif fix["type"] == "fixed":
            lines.append(f"  {name:12s} Ch{fix['start']:3d}     Out={values[0]:3d}")

    return "\n".join(lines)


class ArtNetSimulator:
    def __init__(self):
        self.sock = None
        self.local_ip = get_local_ip()
        self.running = True

    def setup_socket(self):
        """建立 UDP socket 監聽 Art-Net。"""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self.sock.bind(("0.0.0.0", ARTNET_PORT))
        self.sock.setblocking(False)
        log.info("Art-Net socket bound to 0.0.0.0:%d", ARTNET_PORT)

    def handle_artpoll(self, addr):
        """回應 ArtPoll。"""
        log.info("RX ArtPoll from %s — sending ArtPollReply", addr[0])
        reply = build_artpoll_reply(self.local_ip)
        self.sock.sendto(reply, addr)

    def handle_dmx(self, data, addr):
        """處理 Art-Net DMX (OpDmx) 封包。"""
        global dmx_universe, last_update, frame_count

        if len(data) < 18:
            return

        # Parse OpDmx
        # Bytes 12-13: Universe (little-endian)
        universe = data[14] | (data[15] << 8)
        # Bytes 16-17: Length (big-endian)
        length = (data[16] << 8) | data[17]

        if len(data) < 18 + length:
            return

        dmx_data = data[18:18 + length]
        old_universe = bytes(dmx_universe[:length])

        # 更新 DMX 值
        dmx_universe[:length] = dmx_data
        frame_count += 1

        # 只在值變化時顯示
        if dmx_data != old_universe or time.time() - last_update > 10:
            last_update = time.time()
            log.info("RX DMX Universe %d (%d channels) from %s  [frame #%d]",
                     universe, length, addr[0], frame_count)
            state = display_fixture_state()
            if state:
                print(state)

    async def receive_loop(self):
        """主接收迴圈。"""
        loop = asyncio.get_event_loop()

        while self.running:
            try:
                data, addr = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: self.sock.recvfrom(8192)),
                    timeout=1.0,
                )

                if len(data) < 12:
                    continue

                # Verify Art-Net header
                if data[:8] != ARTNET_HEADER:
                    continue

                # OpCode (little-endian at bytes 8-9)
                opcode = data[8] | (data[9] << 8)

                if opcode == ARTNET_OPCODE_POLL:
                    self.handle_artpoll(addr)
                elif opcode == ARTNET_OPCODE_DMX:
                    self.handle_dmx(data, addr)
                else:
                    log.debug("Unknown opcode: 0x%04X from %s", opcode, addr[0])

            except asyncio.TimeoutError:
                pass
            except BlockingIOError:
                await asyncio.sleep(0.01)
            except Exception as e:
                log.error("receive error: %s", e)
                await asyncio.sleep(0.1)

    async def status_loop(self):
        """定期顯示狀態。"""
        while self.running:
            await asyncio.sleep(30)
            log.info("Status: %d frames received total", frame_count)
            state = display_fixture_state()
            if any(dmx_universe[:17]):
                print(state)

    async def run(self):
        """啟動模擬器。"""
        self.setup_socket()

        log.info("=" * 60)
        log.info("Woow Art-Net DMX 模擬節點")
        log.info("=" * 60)
        log.info("Local IP: %s", self.local_ip)
        log.info("監聽: 0.0.0.0:%d  (Universe 0)", ARTNET_PORT)
        log.info("")
        log.info("模擬燈具:")
        for name, fix in FIXTURES.items():
            log.info("  %-12s  Ch %d-%d  (%s)",
                     name, fix["start"],
                     fix["start"] + fix["channels"] - 1,
                     fix["type"])
        log.info("")
        log.info("等待 Art-Net DMX 封包...")
        log.info("=" * 60)

        await asyncio.gather(
            self.receive_loop(),
            self.status_loop(),
        )


if __name__ == "__main__":
    sim = ArtNetSimulator()
    try:
        asyncio.run(sim.run())
    except KeyboardInterrupt:
        sim.running = False
        log.info("Art-Net 模擬器已停止")
