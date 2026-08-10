# Test Plan: Woow HA Multi-Protocol Components

> **Living document.** This is the durable test plan — the phases and canonical
> cases we run against the components. Point-in-time results live separately in
> [`2026-04-10-test-report.md`](./2026-04-10-test-report.md).
>
> The security fix referenced in Phase 3 is recorded as
> [ADR-0001](../adr/0001-reject-dotdot-path-components.md).

## 1. Overview

| Field | Value |
|-------|-------|
| Project | Woow HA Multi-Protocol Connect |
| Version | 2.0.0 |
| HA Instance | http://localhost:15126 |
| Container | ha-protocol (podman) |
| Components | woow_knx, woow_dmx, woow_modbus |
| Target Quality | Enterprise / Commercial Deployment |

## 2. Components Under Test

| Component | Domain | WebSocket | Panel URL | Theme |
|-----------|--------|-----------|-----------|-------|
| KNX Setup Guide | `woow_knx` | `woow_knx/ws` | `/woow_knx/frontend/panel.html` | Blue |
| DMX Setup Guide | `woow_dmx` | `woow_dmx/ws` | `/woow_dmx/frontend/panel.html` | Purple |
| Modbus Setup Guide | `woow_modbus` | `woow_modbus/ws` | `/woow_modbus/frontend/panel.html` | Orange |

## 3. Architecture

```
┌─────────────────────────────────────────┐
│  Home Assistant Core (2026.1.3)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ woow_knx │ │ woow_dmx │ │woow_modbus│ │
│  │  Panel   │ │  Panel   │ │  Panel   │ │
│  │  WS API  │ │  WS API  │ │  WS API  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│         │            │            │      │
│     ┌───┴────────────┴────────────┴──┐  │
│     │ Config Dir (/config)           │  │
│     │ - configuration.yaml           │  │
│     │ - automations.yaml             │  │
│     │ - secrets.yaml                 │  │
│     │ - custom_components/           │  │
│     └────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 4. Test Phases

> **On case counts:** the phases below enumerate the ~72 *canonical* cases that
> define the plan. Execution expands these per round, per component, and per
> input variation — the final run totalled 175 executed cases. See the
> [test report](./2026-04-10-test-report.md) for the executed counts.

### Phase 1: Deployment Lifecycle (7 tests)
- Fresh install via config flow
- Duplicate install prevention (abort)
- Unload (remove) integration
- Reinstall after removal
- Panel registration verification
- Component state after HA restart
- Config entry persistence check

### Phase 2: WebSocket Backend API (18 tests)
- **List action (6)**:
  - List YAML files (default ext)
  - List all file types (ext=all)
  - List with depth limit (depth=1 vs depth=10)
  - List with invalid ext (fallback to yaml)
  - Empty directory handling
  - Hidden/excluded directory filtering

- **Load action (6)**:
  - Load existing file
  - Load non-existent file (error)
  - Load binary/non-UTF-8 file (error)
  - Load empty file
  - Load file with unicode content
  - Load deeply nested file

- **Save action (6)**:
  - Save new file
  - Save existing file (overwrite)
  - Save with unicode content
  - Save preserves file permissions
  - Save empty content
  - Atomic write verification (no partial writes)

### Phase 3: Security Boundaries (12 tests)
- Path traversal: `../../../etc/passwd`
- Path traversal: `..\\..\\etc\\passwd`
- Double-encoded traversal: `....//....//etc/passwd`
- Null byte injection: `file%00.yaml`
- Absolute path: `/etc/passwd`
- Symlink escape attempt
- Non-admin user rejection (require_admin)
- Empty path handling
- Very long path (4096+ chars)
- Path with special chars (spaces, CJK)
- Save to excluded directory (.storage)
- Save to system path (/etc/shadow)

### Phase 4: Edge Cases & Stress (10 tests)
- Large file (1MB YAML)
- File with 10,000 lines
- Maximum filename length (255 chars)
- Concurrent save operations (race condition)
- Rapid WebSocket reconnection
- Save during HA restart
- Binary content in save
- Zero-byte file read/write
- File with Windows line endings (CRLF)
- File with no trailing newline

### Phase 5: Frontend Panel (8 tests)
- Panel HTML serves 200 OK
- HTML structure validation (DOCTYPE, charset, viewport)
- CSS dark mode variables present
- JavaScript WebSocket connection code present
- All external links valid (target=_blank, rel=noopener)
- Panel responsive meta tag
- Protocol-specific content (KNX/DMX/Modbus-specific text)
- Version footer present

### Phase 6: Cross-Component Isolation (6 tests)
- Each component has independent WebSocket namespace
- Panel URLs don't conflict
- Config entries are independent
- Unloading one doesn't affect others
- File changes via one are visible to others (shared config dir)
- Sidebar panels all registered with unique icons

### Phase 7: HA Restart Resilience (4 tests)
- Components survive HA restart
- Panels re-register after restart
- WebSocket reconnects after restart
- Config entries persist after restart

### Phase 8: Log & Error Handling (4 tests)
- No ERROR logs during normal operation
- Proper error logging on file operation failures
- Info log on successful save
- Info log on panel registration

### Phase 9: Multi-Round Regression (3 tests)
- Full test suite re-run (round 2)
- Full test suite re-run (round 3)
- Soak test: 100 rapid operations

## 5. Success Criteria

| Metric | Target |
|--------|--------|
| Total Tests | 72+ canonical (executed count expands per round/component) |
| Pass Rate | 100% |
| Security Tests | All blocked |
| Error Logs | 0 during normal operation |
| Regression Rounds | 3 complete passes |
| Enterprise Ready | Yes |
