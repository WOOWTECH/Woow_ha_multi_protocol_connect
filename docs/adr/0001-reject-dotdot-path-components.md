# ADR-0001: Reject `..` path components for WebSocket file access

- **Status:** Accepted
- **Date:** 2026-04-10
- **Applies to:** `woow_knx`, `woow_dmx`, `woow_modbus` (`_sanitize_path()` / `_is_safe_path()` in each `__init__.py`)

## Context

Each component exposes a WebSocket `load`/`save` API that reads and writes files
under the Home Assistant config directory. The original path sanitization used
string stripping:

```python
sanitized = raw.replace("../", "").replace("..\\", "").strip("/").strip("\\")
```

This is a **critical path-traversal vulnerability**: an authenticated admin user
could read or write files outside the config directory by sending crafted paths
such as `../../../etc/passwd`. Naive `.replace("../", "")` is bypassable with
double-encoded input — `....//` collapses back to `../` after a single strip.

Found in Round 1 testing (see
[2026-04-10 test report](../testing/2026-04-10-test-report.md)).

## Decision

Reject **any** path whose components include `..`, rather than trying to strip or
normalize traversal sequences. Validate before use:

```python
# Layer 1 — reject dangerous input outright
if "\x00" in raw:                                  # reject null bytes
    return ""
if raw.startswith("/") or raw.startswith("\\"):    # reject absolute paths
    return ""
normalized = raw.replace("\\", "/")
parts = normalized.split("/")
if ".." in parts:                                  # reject ANY ".." component
    return ""
sanitized = normalized.strip("/")
```

```python
# Layer 2 — defense in depth: resolved real path must stay within config dir
return real.startswith(config_real + os.sep) or real == config_real
```

The `os.sep` suffix on Layer 2 prevents a sibling-prefix escape
(e.g. `/config-evil` matching a naive `startswith("/config")`).

## Consequences

- **Positive:** Rejecting `..` wholesale is not bypassable by encoding tricks; the
  two layers are independent, so a bypass of one is still caught by the other. All
  34 executed security-boundary tests pass.
- **Trade-off:** Legitimate relative paths containing `..` are unsupported — an
  acceptable constraint, since the API only ever addresses files *within* the
  config directory.
- **Applies uniformly:** All three components share the same hardened logic; any
  future component exposing file access must adopt both layers.
