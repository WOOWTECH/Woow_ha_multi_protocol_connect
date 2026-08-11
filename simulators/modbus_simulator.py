#!/usr/bin/env python3
"""
Modbus TCP Simulator -- Home Assistant Modbus Integration Test Server
=====================================================================

Supports ALL 7 HA Modbus entity types:
  1. sensor        - temperature, humidity, power, voltage
  2. binary_sensor - door, window, motion
  3. switch        - light, fan, heater (coils)
  4. light         - brightness + color temperature (holding registers)
  5. climate       - thermostat with current/target temp, HVAC/fan mode
  6. cover         - blind/shade with position and open/close commands
  7. fan           - on/off + speed control

Register Map:
  Holding Registers (FC03):
    0-1:   Temperature       (float32, deg C)
    2-3:   Humidity          (float32, %)
    4-5:   Power             (float32, W)
    6:     Voltage           (uint16, V)
    10:    Light on/off      (0/1)
    11:    Light brightness   (0-255)
    12:    Light color temp   (2000-7000 K)
    20-21: Climate current temp  (float32, deg C) - mirrors HR 0-1
    22-23: Climate target temp   (float32, deg C) - settable, default 22.0
    24:    HVAC mode         (0=off, 1=heat, 2=cool, 3=auto)
    25:    Fan mode          (0=auto, 1=low, 2=medium, 3=high)
    26:    HVAC action       (0=off, 1=heating, 2=cooling, 3=idle)
    30:    Cover position    (0=closed .. 100=open)
    31:    Cover state       (0=closed, 1=open, 2=opening, 3=closing)
    35:    Fan2 speed        (0=off, 1=low, 2=medium, 3=high)

  Stress-Test Holding Registers (FC03):
    100-101: Stress temp sensor #0   (float32, deg C)
    102-103: Stress temp sensor #1   (float32, deg C)
    ...
    198-199: Stress temp sensor #49  (float32, deg C)

  Coils (FC01/FC05/FC15):
    0: Light switch
    1: Fan switch
    2: Heater switch
    5: Cover open command
    6: Cover close command
    8: Fan2 on/off
    100-119: Stress-test switches (20 switches)

  Discrete Inputs (FC02):
    0: Door sensor
    1: Window sensor
    2: Motion sensor
    100-109: Stress-test binary sensors (10 sensors)

Startup:
  pip install -r simulators/requirements.txt
  python3 simulators/modbus_simulator.py

Default listen: 0.0.0.0:5020  (Slave ID: 1)

Requires pymodbus==3.11.2 (see simulators/requirements.txt). pymodbus >= 3.13
breaks this simulator: ModbusSequentialDataBlock(0, ...) became
SimData(address - 1), so a block starting at address 0 raises
"TypeError: 0 <= address < 65535" before the server binds.
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

# -- Parameters ------------------------------------------------
HOST = "0.0.0.0"
PORT = 5020
DEVICE_ID = 1
UPDATE_INTERVAL = 2.0

# -- HVAC mode / action constants ------------------------------
HVAC_OFF = 0
HVAC_HEAT = 1
HVAC_COOL = 2
HVAC_AUTO = 3

ACTION_OFF = 0
ACTION_HEATING = 1
ACTION_COOLING = 2
ACTION_IDLE = 3

# -- Cover state constants -------------------------------------
COVER_CLOSED = 0
COVER_OPEN = 1
COVER_OPENING = 2
COVER_CLOSING = 3

# -- Cover movement rate (percent per update cycle) -------------
COVER_SPEED = 5  # 5% per cycle -> ~20 cycles (40s) full travel

# -- Stress-test entity counts -----------------------------------
STRESS_TEMP_COUNT = 50        # 50 float32 temperature sensors
STRESS_TEMP_HR_START = 100    # HR 100-199 (2 regs each)
STRESS_SWITCH_COUNT = 20      # 20 coil switches
STRESS_SWITCH_COIL_START = 100  # Coils 100-119
STRESS_BINARY_COUNT = 10      # 10 discrete-input binary sensors
STRESS_BINARY_DI_START = 100  # DI 100-109

# -- Simulation state ------------------------------------------
SIM = {
    # Existing sensors
    "temperature": 24.5,
    "humidity": 55.0,
    "power": 1200.0,
    "voltage": 220,
    # Existing switches (coils 0-2)
    "switch_light": False,
    "switch_fan": False,
    "switch_heater": False,
    # Existing binary sensors (discrete inputs 0-2)
    "door_open": False,
    "window_open": False,
    "motion_detected": False,
    # Light entity (HR 10-12)
    "light_on": False,
    "light_brightness": 128,
    "light_color_temp": 4000,
    # Climate entity (HR 20-26)
    "climate_target_temp": 22.0,
    "hvac_mode": HVAC_OFF,
    "fan_mode": 0,       # 0=auto
    "hvac_action": ACTION_OFF,
    # Cover entity (HR 30-31, coils 5-6)
    "cover_position": 0,    # 0=closed, 100=open
    "cover_state": COVER_CLOSED,
    "cover_cmd_open": False,
    "cover_cmd_close": False,
    # Fan2 entity (coil 8, HR 35)
    "fan2_on": False,
    "fan2_speed": 0,  # 0=off, 1=low, 2=medium, 3=high
    # Stress-test: 50 temperature sensors (HR 100-199, float32 each)
    "stress_temps": [round(20.0 + i * 0.2, 1) for i in range(STRESS_TEMP_COUNT)],
    # Stress-test: 10 binary sensors (DI 100-109)
    "stress_binary": [random.choice([True, False]) for _ in range(STRESS_BINARY_COUNT)],
}


def float_to_regs(value: float) -> list:
    """Encode a float32 into two big-endian uint16 registers."""
    packed = struct.pack(">f", value)
    return [
        struct.unpack(">H", packed[0:2])[0],
        struct.unpack(">H", packed[2:4])[0],
    ]


def regs_to_float(regs: list) -> float:
    """Decode two big-endian uint16 registers into a float32."""
    packed = struct.pack(">HH", regs[0], regs[1])
    return struct.unpack(">f", packed)[0]


def update_values():
    """Advance the simulation by one tick.  All physics/logic lives here."""
    s = SIM

    # ---- Temperature drift (affected by heater + climate) ----
    drift = random.uniform(-0.3, 0.3)
    if s["switch_heater"]:
        drift += 0.5
    # Climate heating/cooling influence
    if s["hvac_action"] == ACTION_HEATING:
        drift += 0.4
    elif s["hvac_action"] == ACTION_COOLING:
        drift -= 0.4
    s["temperature"] = max(10.0, min(40.0, s["temperature"] + drift))

    # ---- Humidity drift ----
    s["humidity"] = max(20.0, min(95.0, s["humidity"] + random.uniform(-1.0, 1.0)))

    # ---- Power calculation ----
    base = 50.0
    if s["switch_light"]:
        base += 60.0
    if s["switch_fan"]:
        base += 150.0
    if s["switch_heater"]:
        base += 2000.0
    if s["light_on"]:
        base += s["light_brightness"] * 0.4  # up to ~102W at full brightness
    if s["fan2_on"]:
        speed_watts = {0: 0, 1: 30, 2: 75, 3: 150}
        base += speed_watts.get(s["fan2_speed"], 0)
    if s["hvac_action"] == ACTION_HEATING:
        base += 1500.0
    elif s["hvac_action"] == ACTION_COOLING:
        base += 1200.0
    s["power"] = base + random.uniform(-10, 10)

    # ---- Voltage drift ----
    s["voltage"] = max(210, min(240, s["voltage"] + random.randint(-2, 2)))

    # ---- Binary sensors (random toggles) ----
    if random.random() < 0.05:
        s["door_open"] = not s["door_open"]
    if random.random() < 0.03:
        s["window_open"] = not s["window_open"]
    if random.random() < 0.1:
        s["motion_detected"] = not s["motion_detected"]

    # ---- Climate logic ----
    mode = s["hvac_mode"]
    target = s["climate_target_temp"]
    current = s["temperature"]
    if mode == HVAC_OFF:
        s["hvac_action"] = ACTION_OFF
    elif mode == HVAC_HEAT:
        if current < target - 0.5:
            s["hvac_action"] = ACTION_HEATING
        elif current >= target:
            s["hvac_action"] = ACTION_IDLE
        # else keep current action (hysteresis band)
    elif mode == HVAC_COOL:
        if current > target + 0.5:
            s["hvac_action"] = ACTION_COOLING
        elif current <= target:
            s["hvac_action"] = ACTION_IDLE
    elif mode == HVAC_AUTO:
        if current < target - 0.5:
            s["hvac_action"] = ACTION_HEATING
        elif current > target + 0.5:
            s["hvac_action"] = ACTION_COOLING
        elif target - 0.3 <= current <= target + 0.3:
            s["hvac_action"] = ACTION_IDLE

    # ---- Cover logic ----
    if s["cover_cmd_open"] and not s["cover_cmd_close"]:
        if s["cover_position"] < 100:
            s["cover_state"] = COVER_OPENING
            s["cover_position"] = min(100, s["cover_position"] + COVER_SPEED)
        if s["cover_position"] >= 100:
            s["cover_state"] = COVER_OPEN
    elif s["cover_cmd_close"] and not s["cover_cmd_open"]:
        if s["cover_position"] > 0:
            s["cover_state"] = COVER_CLOSING
            s["cover_position"] = max(0, s["cover_position"] - COVER_SPEED)
        if s["cover_position"] <= 0:
            s["cover_state"] = COVER_CLOSED
    else:
        # Neither or both commands -- stop where we are
        if s["cover_state"] in (COVER_OPENING, COVER_CLOSING):
            if s["cover_position"] >= 100:
                s["cover_state"] = COVER_OPEN
            elif s["cover_position"] <= 0:
                s["cover_state"] = COVER_CLOSED
            else:
                # Stopped mid-travel; report as open (partially)
                s["cover_state"] = COVER_OPEN

    # ---- Fan2 speed -> if fan is off, force speed to 0 ----
    if not s["fan2_on"]:
        s["fan2_speed"] = 0

    # ---- Stress-test: drift all 50 temperature sensors ----
    for i in range(STRESS_TEMP_COUNT):
        s["stress_temps"][i] += random.uniform(-0.2, 0.2)
        s["stress_temps"][i] = max(15.0, min(35.0, s["stress_temps"][i]))

    # ---- Stress-test: randomly toggle binary sensors (~5% chance each) ----
    for i in range(STRESS_BINARY_COUNT):
        if random.random() < 0.05:
            s["stress_binary"][i] = not s["stress_binary"][i]


def sync_to_context(context):
    """Synchronize SIM state <-> Modbus data store (bidirectional)."""
    s = SIM
    dev = context[DEVICE_ID]

    # ==================================================================
    # READ from data store: values that HA may have written
    # ==================================================================

    # -- Original coils 0-2 (switches) --
    coils_0_2 = dev.getValues(1, 0, 3)
    s["switch_light"] = bool(coils_0_2[0])
    s["switch_fan"] = bool(coils_0_2[1])
    s["switch_heater"] = bool(coils_0_2[2])

    # -- Light entity: read HR 10-12 (HA writes on/off, brightness, color temp) --
    hr_10_12 = dev.getValues(3, 10, 3)
    s["light_on"] = bool(hr_10_12[0])
    s["light_brightness"] = max(0, min(255, hr_10_12[1]))
    s["light_color_temp"] = max(2000, min(7000, hr_10_12[2]))

    # -- Climate: read HR 22-25 (HA writes target temp, modes) --
    hr_22_23 = dev.getValues(3, 22, 2)
    raw_target = regs_to_float(hr_22_23)
    # Sanity-check the float (protect against NaN / garbage writes)
    if 5.0 <= raw_target <= 40.0:
        s["climate_target_temp"] = raw_target
    hr_24_25 = dev.getValues(3, 24, 2)
    raw_mode = hr_24_25[0]
    if 0 <= raw_mode <= 3:
        s["hvac_mode"] = raw_mode
    raw_fan = hr_24_25[1]
    if 0 <= raw_fan <= 3:
        s["fan_mode"] = raw_fan

    # -- Cover: read coils 5-6 (open/close commands from HA) --
    cover_coils = dev.getValues(1, 5, 2)
    s["cover_cmd_open"] = bool(cover_coils[0])
    s["cover_cmd_close"] = bool(cover_coils[1])

    # -- Cover: read HR 30 (HA may write a direct position) --
    hr_30 = dev.getValues(3, 30, 1)
    written_pos = hr_30[0]
    if 0 <= written_pos <= 100:
        # Accept external position writes only when cover is not actively moving
        if s["cover_state"] not in (COVER_OPENING, COVER_CLOSING):
            s["cover_position"] = written_pos

    # -- Fan2: read coil 8 and HR 35 --
    fan2_coil = dev.getValues(1, 8, 1)
    s["fan2_on"] = bool(fan2_coil[0])
    hr_35 = dev.getValues(3, 35, 1)
    raw_speed = hr_35[0]
    if 0 <= raw_speed <= 3:
        s["fan2_speed"] = raw_speed

    # ==================================================================
    # WRITE to data store: updated simulation values
    # ==================================================================

    # -- Holding registers 0-6: sensor values (read-only from HA side) --
    hr_sensors = (
        float_to_regs(s["temperature"])
        + float_to_regs(s["humidity"])
        + float_to_regs(s["power"])
        + [s["voltage"]]
    )
    dev.setValues(3, 0, hr_sensors)

    # -- HR 10-12: light state (echo back clamped values) --
    dev.setValues(3, 10, [
        1 if s["light_on"] else 0,
        s["light_brightness"],
        s["light_color_temp"],
    ])

    # -- HR 20-26: climate state --
    dev.setValues(3, 20, float_to_regs(s["temperature"]))   # current temp = main sensor
    dev.setValues(3, 22, float_to_regs(s["climate_target_temp"]))
    dev.setValues(3, 24, [s["hvac_mode"], s["fan_mode"], s["hvac_action"]])

    # -- HR 30-31: cover state --
    dev.setValues(3, 30, [s["cover_position"], s["cover_state"]])

    # -- HR 35: fan2 speed --
    dev.setValues(3, 35, [s["fan2_speed"]])

    # -- Coils: write back cover command state and fan2 --
    dev.setValues(1, 5, [s["cover_cmd_open"], s["cover_cmd_close"]])
    dev.setValues(1, 8, [1 if s["fan2_on"] else 0])

    # -- Discrete inputs 0-2: binary sensors --
    dev.setValues(2, 0, [s["door_open"], s["window_open"], s["motion_detected"]])

    # ==================================================================
    # STRESS-TEST: write expanded entities to data store
    # ==================================================================

    # -- HR 100-199: 50 float32 temperature sensors (2 regs each) --
    stress_hr = []
    for temp in s["stress_temps"]:
        stress_hr.extend(float_to_regs(temp))
    dev.setValues(3, STRESS_TEMP_HR_START, stress_hr)

    # -- Coils 100-119: read back switch states written by HA --
    stress_coils = dev.getValues(1, STRESS_SWITCH_COIL_START, STRESS_SWITCH_COUNT)
    # (switches are purely writable by HA; we just preserve whatever HA wrote)

    # -- DI 100-109: stress-test binary sensors --
    dev.setValues(2, STRESS_BINARY_DI_START, [int(b) for b in s["stress_binary"]])


# -- Label helpers for log output --------------------------------
_HVAC_MODE_NAMES = {0: "off", 1: "heat", 2: "cool", 3: "auto"}
_HVAC_ACTION_NAMES = {0: "off", 1: "heating", 2: "cooling", 3: "idle"}
_COVER_STATE_NAMES = {0: "closed", 1: "open", 2: "opening", 3: "closing"}
_FAN_SPEED_NAMES = {0: "off", 1: "low", 2: "med", 3: "high"}


async def updater(context):
    """Periodically update simulation and sync to Modbus data store."""
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
        log.info(
            "  Light2: %s bri=%d ct=%dK | "
            "Climate: mode=%s target=%.1f action=%s | "
            "Cover: pos=%d%% %s | "
            "Fan2: %s spd=%s",
            "ON" if s["light_on"] else "off",
            s["light_brightness"], s["light_color_temp"],
            _HVAC_MODE_NAMES.get(s["hvac_mode"], "?"),
            s["climate_target_temp"],
            _HVAC_ACTION_NAMES.get(s["hvac_action"], "?"),
            s["cover_position"],
            _COVER_STATE_NAMES.get(s["cover_state"], "?"),
            "ON" if s["fan2_on"] else "off",
            _FAN_SPEED_NAMES.get(s["fan2_speed"], "?"),
        )
        # Stress-test summary (avoid flooding logs -- just min/avg/max)
        temps = s["stress_temps"]
        bins_on = sum(1 for b in s["stress_binary"] if b)
        log.info(
            "  Stress: %d temps [%.1f..%.1f avg=%.1f] | "
            "%d DI active/%d | 20 switches",
            STRESS_TEMP_COUNT,
            min(temps), max(temps),
            sum(temps) / len(temps),
            bins_on, STRESS_BINARY_COUNT,
        )
        await asyncio.sleep(UPDATE_INTERVAL)


async def run_server():
    # Data blocks -- sized to cover all used addresses with headroom
    # Stress-test expansion: HR up to 200, Coils up to 120, DI up to 110
    di = ModbusSequentialDataBlock(0, [0] * 120)   # discrete inputs 0-2 + 100-109
    co = ModbusSequentialDataBlock(0, [0] * 130)   # coils 0-8 + 100-119
    ir = ModbusSequentialDataBlock(0, [0] * 16)    # input registers (reserved)
    hr = ModbusSequentialDataBlock(0, [0] * 210)   # holding registers 0-35 + 100-199

    # Seed writable registers with sensible defaults so first reads aren't zero/garbage
    # Light: off, brightness=128, color_temp=4000K
    hr.setValues(10, [0, 128, 4000])
    # Climate: target=22.0 C, mode=off, fan=auto, action=off
    hr.setValues(22, float_to_regs(22.0))
    hr.setValues(24, [HVAC_OFF, 0, ACTION_OFF])
    # Cover: position=0 (closed), state=closed
    hr.setValues(30, [0, COVER_CLOSED])
    # Fan2: speed=0
    hr.setValues(35, [0])

    # Stress-test: seed 50 temperature sensors at HR 100-199
    stress_seed_hr = []
    for temp in SIM["stress_temps"]:
        stress_seed_hr.extend(float_to_regs(temp))
    hr.setValues(STRESS_TEMP_HR_START, stress_seed_hr)

    # Stress-test: seed 10 binary sensors at DI 100-109
    di.setValues(STRESS_BINARY_DI_START, [int(b) for b in SIM["stress_binary"]])

    # Stress-test: seed 20 switches at Coils 100-119 (all off)
    co.setValues(STRESS_SWITCH_COIL_START, [0] * STRESS_SWITCH_COUNT)

    dev_ctx = ModbusDeviceContext(di=di, co=co, hr=hr, ir=ir)
    context = ModbusServerContext(devices={DEVICE_ID: dev_ctx}, single=False)

    identity = ModbusDeviceIdentification()
    identity.VendorName = "Woow Technology"
    identity.ProductCode = "WOOW-MOD-SIM"
    identity.VendorUrl = "https://woow.tech"
    identity.ProductName = "Woow Modbus Simulator"
    identity.ModelName = "Smart Building Controller"
    identity.MajorMinorRevision = "2.0.0"

    asyncio.create_task(updater(context))

    log.info("=" * 64)
    log.info("Woow Modbus TCP Simulator v2 -- All 7 HA Entity Types")
    log.info("=" * 64)
    log.info("Listen: %s:%d  Device ID: %d", HOST, PORT, DEVICE_ID)
    log.info("")
    log.info("Holding Registers (FC03):")
    log.info("  0-1:   Temperature       (float32, C)")
    log.info("  2-3:   Humidity           (float32, %%)")
    log.info("  4-5:   Power             (float32, W)")
    log.info("  6:     Voltage           (uint16,  V)")
    log.info("  10:    Light on/off      (0/1)")
    log.info("  11:    Light brightness  (0-255)")
    log.info("  12:    Light color temp  (2000-7000 K)")
    log.info("  20-21: Climate current T (float32, C)")
    log.info("  22-23: Climate target T  (float32, C)")
    log.info("  24:    HVAC mode         (0=off,1=heat,2=cool,3=auto)")
    log.info("  25:    Fan mode          (0=auto,1=low,2=med,3=high)")
    log.info("  26:    HVAC action       (0=off,1=heating,2=cooling,3=idle)")
    log.info("  30:    Cover position    (0-100)")
    log.info("  31:    Cover state       (0=closed,1=open,2=opening,3=closing)")
    log.info("  35:    Fan2 speed        (0=off,1=low,2=med,3=high)")
    log.info("  --- Stress-test (50 float32 temperatures) ---")
    log.info("  100-199: Temp sensors #0..#49 (2 regs each, float32)")
    log.info("Coils (FC01/05/15):")
    log.info("  0: Light  1: Fan  2: Heater")
    log.info("  5: Cover open  6: Cover close")
    log.info("  8: Fan2 on/off")
    log.info("  100-119: Stress-test switches (20)")
    log.info("Discrete Inputs (FC02):")
    log.info("  0: Door  1: Window  2: Motion")
    log.info("  100-109: Stress-test binary sensors (10)")
    log.info("=" * 64)

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
