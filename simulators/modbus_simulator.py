#!/usr/bin/env python3
"""
Modbus TCP 模擬伺服器 — 供 Home Assistant Modbus 整合測試
==========================================================

模擬設備：
  Holding Registers (FC03):
    0-1: 溫度 (float32, °C)
    2-3: 濕度 (float32, %)
    4-5: 功率 (float32, W)
    6:   電壓 (uint16, V)

  Coils (FC01/FC05/FC15):
    0: 照明開關
    1: 風扇開關
    2: 加熱器開關

  Discrete Inputs (FC02):
    0: 門感測器
    1: 窗感測器
    2: 動作感測器

所有感測器值會隨時間緩慢變動，模擬真實設備行為。
開關狀態可由 HA 讀寫控制。

啟動方式:
  python3 simulators/modbus_simulator.py

預設監聽: 0.0.0.0:5020  (Slave ID: 1)
"""

import asyncio
import logging
import struct
import random
import signal
import sys

from pymodbus.server import StartAsyncTcpServer
from pymodbus.datastore import (
    ModbusDeviceContext,
    ModbusServerContext,
    ModbusSequentialDataBlock,
)
from pymodbus import ModbusDeviceIdentification

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("modbus_sim")

# ── 參數 ──────────────────────────────────────────────────
HOST = "0.0.0.0"
PORT = 5020
DEVICE_ID = 1
UPDATE_INTERVAL = 2.0

# 模擬狀態
SIM = {
    "temperature": 24.5,
    "humidity": 55.0,
    "power": 1200.0,
    "voltage": 220,
    "switch_light": False,
    "switch_fan": False,
    "switch_heater": False,
    "door_open": False,
    "window_open": False,
    "motion_detected": False,
}


def float_to_regs(value: float) -> list:
    packed = struct.pack(">f", value)
    return [
        struct.unpack(">H", packed[0:2])[0],
        struct.unpack(">H", packed[2:4])[0],
    ]


def update_values():
    s = SIM
    drift = random.uniform(-0.3, 0.3)
    if s["switch_heater"]:
        drift += 0.5
    s["temperature"] = max(10.0, min(40.0, s["temperature"] + drift))
    s["humidity"] = max(20.0, min(95.0, s["humidity"] + random.uniform(-1.0, 1.0)))

    base = 50.0
    if s["switch_light"]:
        base += 60.0
    if s["switch_fan"]:
        base += 150.0
    if s["switch_heater"]:
        base += 2000.0
    s["power"] = base + random.uniform(-10, 10)
    s["voltage"] = max(210, min(240, s["voltage"] + random.randint(-2, 2)))

    if random.random() < 0.05:
        s["door_open"] = not s["door_open"]
    if random.random() < 0.03:
        s["window_open"] = not s["window_open"]
    if random.random() < 0.1:
        s["motion_detected"] = not s["motion_detected"]


def sync_to_context(context):
    s = SIM
    dev = context[DEVICE_ID]

    # Write sensor values to holding registers
    hr = (
        float_to_regs(s["temperature"])
        + float_to_regs(s["humidity"])
        + float_to_regs(s["power"])
        + [s["voltage"]]
    )
    dev.setValues(3, 0, hr)

    # Read coils (HA may have toggled them)
    coils = dev.getValues(1, 0, 3)
    s["switch_light"] = bool(coils[0])
    s["switch_fan"] = bool(coils[1])
    s["switch_heater"] = bool(coils[2])

    # Write discrete inputs
    dev.setValues(2, 0, [s["door_open"], s["window_open"], s["motion_detected"]])


async def updater(context):
    log.info("Sensor updater started (interval=%.1fs)", UPDATE_INTERVAL)
    while True:
        update_values()
        sync_to_context(context)
        s = SIM
        log.info(
            "T=%.1f°C H=%.1f%% P=%.0fW V=%dV | "
            "Light=%s Fan=%s Heat=%s | "
            "Door=%s Win=%s Motion=%s",
            s["temperature"], s["humidity"], s["power"], s["voltage"],
            "ON" if s["switch_light"] else "off",
            "ON" if s["switch_fan"] else "off",
            "ON" if s["switch_heater"] else "off",
            "OPEN" if s["door_open"] else "shut",
            "OPEN" if s["window_open"] else "shut",
            "YES" if s["motion_detected"] else "no",
        )
        await asyncio.sleep(UPDATE_INTERVAL)


async def run_server():
    di = ModbusSequentialDataBlock(0, [0] * 10)
    co = ModbusSequentialDataBlock(0, [0] * 10)
    ir = ModbusSequentialDataBlock(0, [0] * 10)
    hr = ModbusSequentialDataBlock(0, [0] * 20)

    dev_ctx = ModbusDeviceContext(di=di, co=co, hr=hr, ir=ir)
    context = ModbusServerContext(devices={DEVICE_ID: dev_ctx}, single=False)

    identity = ModbusDeviceIdentification()
    identity.VendorName = "Woow Technology"
    identity.ProductCode = "WOOW-MOD-SIM"
    identity.VendorUrl = "https://woow.tech"
    identity.ProductName = "Woow Modbus Simulator"
    identity.ModelName = "Smart Building Controller"
    identity.MajorMinorRevision = "1.0.0"

    asyncio.create_task(updater(context))

    log.info("=" * 60)
    log.info("Woow Modbus TCP Simulator")
    log.info("=" * 60)
    log.info("Listen: %s:%d  Device ID: %d", HOST, PORT, DEVICE_ID)
    log.info("")
    log.info("Holding Registers (FC03):")
    log.info("  0-1: Temperature (float32, C)")
    log.info("  2-3: Humidity    (float32, %%)")
    log.info("  4-5: Power      (float32, W)")
    log.info("  6:   Voltage    (uint16,  V)")
    log.info("Coils (FC01/05):")
    log.info("  0: Light  1: Fan  2: Heater")
    log.info("Discrete Inputs (FC02):")
    log.info("  0: Door  1: Window  2: Motion")
    log.info("=" * 60)

    await StartAsyncTcpServer(
        context=context,
        identity=identity,
        address=(HOST, PORT),
    )


if __name__ == "__main__":
    try:
        asyncio.run(run_server())
    except KeyboardInterrupt:
        log.info("Simulator stopped")
