# Woow HA Multi-Protocol Connect

One Home Assistant custom integration (`woow_multi_protocol`) that provides guided, browser-based YAML editing for the DMX, KNX, and Modbus protocols through a single tabbed sidebar panel. It authors configuration; it does not talk to hardware. (Superseding the former three integrations `woow_dmx` / `woow_knx` / `woow_modbus` — see [ADR-0003](docs/adr/0003-merge-into-single-hacs-integration.md).)

## Language

**Protocol tab**:
One of the panel's tabs (`knx`, `dmx`, `modbus`). Each tab is a guided setup view over a single Config subdirectory; which tabs appear is controlled by the Options flow's per-protocol enable toggles. A tab edits configuration only — it owns no device connection.
_Avoid_: driver, integration, controller (those name the underlying stock integrations, not this panel)

**Config subdirectory**:
The sandboxed directory the panel and Service layer read and write for a protocol — `<config>/woow_multi_protocol/<protocol>/` (`knx/`, `dmx/`, `modbus/`). All file operations are confined here by a 7-layer path sanitizer, keyed by `protocol`.

**Underlying integration**:
The stock/HACS integration that actually drives hardware for a protocol — HA KNX, `ha-artnet-led` (DMX), HA Modbus. The panel produces YAML that these consume once it is wired into `configuration.yaml`.

**Service layer**:
The `services.py` + `services.yaml` — a single service set (`list_files`/`load_file`/`save_file`/`apply`), each taking a required `protocol` field — so that `ha_mcp_tools` (which speaks HA services, not WebSocket) can drive the panel's file operations.

**Apply**:
The service that makes freshly-saved config take effect by reloading the Underlying integration for a protocol (falling back to a heavier action where hot reload is unsupported). The reload target is the Underlying integration, never this panel itself.
