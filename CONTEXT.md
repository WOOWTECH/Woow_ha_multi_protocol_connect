# Woow HA Multi-Protocol Connect

Three Home Assistant custom components (`woow_dmx`, `woow_knx`, `woow_modbus`) that provide guided, browser-based YAML editing for the DMX, KNX, and Modbus protocols. They author configuration; they do not talk to hardware.

## Language

**Setup Guide panel**:
One of the three custom components. A sidebar panel plus a WebSocket file API (`list`/`load`/`save`) scoped to a single Config subdirectory. It edits configuration only — it owns no device connection.
_Avoid_: driver, integration, controller (those name the underlying stock integrations, not these components)

**Config subdirectory**:
The sandboxed directory under the HA config dir that a Setup Guide panel reads and writes (`dmx/`, `knx/`, `modbus/`). All file operations are confined here by a 7-layer path sanitizer.

**Underlying integration**:
The stock/HACS integration that actually drives hardware for a protocol — HA KNX, `ha-artnet-led` (DMX), HA Modbus. A Setup Guide panel produces YAML that these consume once it is wired into `configuration.yaml`.

**Service layer**:
The `services.py` + `services.yaml` being added to each Setup Guide panel so that `ha_mcp_tools` (which speaks HA services, not WebSocket) can drive the panel's file operations.

**Apply**:
The service that makes freshly-saved config take effect by reloading the Underlying integration (falling back to a heavier action where hot reload is unsupported). The reload target is the Underlying integration, never the Setup Guide panel itself.
