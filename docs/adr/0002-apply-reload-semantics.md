# ADR-0002: `apply` reloads the underlying integration, never auto-restarts

- **Status:** Accepted
- **Date:** 2026-08-10
- **Applies to:** `woow_dmx`, `woow_knx`, `woow_modbus` (`services.py` — the `apply` service)

## Context

The Setup Guide panels author protocol YAML into a sandboxed Config subdirectory
(`dmx/`, `knx/`, `modbus/`), but the config only takes effect when the **underlying
integration** (`artnet` / `ha-artnet-led`, `knx`, `modbus`) re-reads it. We are
adding a service layer so `ha_mcp_tools` can drive these panels over
`ha_call_service`, including an `apply` service that makes freshly-saved config
live.

Two facts collide:

1. **Reload support is uneven.** HA Modbus has historically required a full
   restart; `ha-artnet-led` is a third-party HACS integration with no expected
   reload; KNX's reload is config-entry-centric and does not cleanly re-read
   arbitrary included files. There is no reload service we can assume exists.
2. **The caller is automated.** `ha_mcp_tools` is an AI-driven MCP that can invoke
   `apply` unattended. An unexpected `homeassistant.restart` disconnects every
   HA user and interrupts every running automation.

A naive `apply` that "just makes it live" would therefore either fail silently on
non-reloadable protocols or trigger surprise restarts from an automated caller.

## Decision

`apply` is **runtime-introspective and restart-averse**:

```python
# Map component -> underlying integration domain
UNDERLYING = {"woow_dmx": "artnet", "woow_knx": "knx", "woow_modbus": "modbus"}

domain = UNDERLYING[DOMAIN]
if hass.services.has_service(domain, "reload"):
    await hass.services.async_call(domain, "reload", blocking=True)
    return {"reloaded": True,  "restart_required": False, "restarting": False, ...}
# No reload available for this protocol/version
if force_restart:                       # opt-in only
    await hass.services.async_call("homeassistant", "restart", blocking=False)
    return {"reloaded": False, "restart_required": True,  "restarting": True,  ...}
return {"reloaded": False, "restart_required": True,  "restarting": False, ...}
```

**Response contract:** all three branches return the *same four keys* —
`reloaded`, `restart_required`, `restarting`, `underlying_domain`. A caller can
read any key on any path without a presence check. `underlying_domain` is
reported so an automated caller can see *which* integration was targeted.

- Capability is discovered at call time via `has_service`, so the behaviour tracks
  whatever the installed integration/version actually supports — no hard-coded
  assumption about which protocols can reload.
- A restart happens **only** when the caller explicitly passes `force_restart: true`.
  The default path never restarts; it reports `restart_required: true` and returns.
- `apply` targets the **underlying integration**, never the Setup Guide panel
  itself (reloading the panel would do nothing to the live protocol config).

## Consequences

- **Positive:** An automated MCP can call `apply` safely — the worst default
  outcome is "config saved, restart still needed," surfaced explicitly in the
  response rather than as a surprise outage.
- **Trade-off:** Where the Underlying integration offers no reload, `apply`
  reports `restart_required` rather than making config live; a human (or a
  deliberate `force_restart: true`) must complete the loop.
- **Precondition, not enforced:** `apply` only matters if the operator has wired
  the Config subdirectory YAML into `configuration.yaml` (via `!include` /
  packages). The service layer assumes that wiring; it does not create it.
- **Applies uniformly:** All three components use the same mapping-plus-introspection
  logic; a future protocol panel must follow the same pattern.

## Validated in production (2026-08-11)

Verified against a live HA 2026.7.2, with the protocol simulators from
`simulators/` standing in for hardware. The **same unchanged code** returned
different results purely because the Underlying integrations became available:

| `apply()` | Before (integration absent) | After (integration configured) |
| --------- | --------------------------- | ------------------------------ |
| `woow_knx`    | `reloaded: false, restart_required: true` | `reloaded: true` |
| `woow_modbus` | `reloaded: false, restart_required: true` | `reloaded: true` |
| `woow_dmx`    | `reloaded: false, restart_required: true` | unchanged — `ha-artnet-led` not installed |

This is the behaviour the runtime `has_service()` check exists to produce, and it
**corrects an assumption made when this ADR was written**: the original context
claimed HA Modbus "has historically required a full restart." In HA 2026.7 a
`modbus.reload` service does exist. Had the reload targets been hard-coded from
that assumption, `apply` would have wrongly reported `restart_required` for
Modbus forever. Capability must keep being discovered at call time, never
hard-coded per protocol.
