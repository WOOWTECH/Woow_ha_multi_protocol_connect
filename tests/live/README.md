# Live-integration scripts

Standalone scripts that test the **merged** `woow_multi_protocol` integration
against a **running** Home Assistant (and, for `live_simulators.py`, against the
protocol simulators). They are **not** pytest tests: run each one directly with
`python`.

They are named `live_*.py` (not `test_*.py`) on purpose, so pytest never
collects them. They are excluded from `ruff` (see `ruff.toml`) and from CI (see
`.github/workflows/ci.yml`). The hermetic unit suites live in `tests/services/`
(the service seam, parametrized by `protocol`) and `tests/config/` (the
config/options/panel seam).

## The merged model (ADR-0003)

One domain, one WebSocket command, one tabbed panel — everything is keyed by
`protocol` (`knx` | `dmx` | `modbus`):

- WebSocket: a single `woow_multi_protocol/ws` command carrying a `protocol`
  field (instead of three per-domain commands).
- Services: `woow_multi_protocol.{list_files,load_file,save_file,apply}`, each
  taking a required `protocol` field.
- Panel: one sidebar entry at `/woow_multi_protocol`, a native custom-element
  bundle (`frontend/woow-multi-protocol-panel.js`) whose tabs are the enabled
  protocols — **not** a per-domain `panel.html` iframe.
- Sandbox: each protocol is confined to `<config>/woow_multi_protocol/<protocol>/`,
  so a file written under one protocol is **not** visible via another.

## Scripts

| Script | Needs | What it checks |
|--------|-------|----------------|
| `live_enterprise.py` | Live HA | Full merged-integration suite: component + singleton entry load, one WebSocket command per protocol, security boundaries, the single panel bundle, **options→tabs**, **cross-protocol isolation**, restart resilience, and the MCP-facing service layer (admin gating + `apply` contract) |
| `live_integration_deploy.py` | Live HA + `config_samples/` | Deploys sample configs per protocol, verifies save → load → list round-trips, and that cross-protocol reads are **blocked** |
| `live_directory_isolation.py` | Live HA + volume access | Per-protocol sandbox boundaries (cross-protocol access is blocked; path traversal is defended within each protocol's subdir) |
| `live_simulators.py` | The simulators in `simulators/` (`pymodbus` for Modbus) | Speaks each wire protocol directly to verify the simulators |

## Running

Run from the repo root. The scripts resolve `config_samples/` and
`tmp/ha_token.txt` relative to the root, two levels up from here.

Target selection is via environment variables, so the same scripts run against
the CI/dev container **and** the physical release-gate rig:

| Var | Default | Purpose |
|-----|---------|---------|
| `HA_HOST` | `localhost` | HA host |
| `HA_PORT` | `15126` | HA port |
| `HA_TOKEN` | — | long-lived token (or `tmp/ha_token.txt`) |
| `HA_VOL` | dev container path | volume path for `live_directory_isolation.py`'s filesystem checks |

```bash
# Provide a token: either the HA_TOKEN env var, or a tmp/ha_token.txt file.
export HA_TOKEN=<long-lived-access-token>

# CI / dev container (localhost:15126)
python tests/live/live_enterprise.py
python tests/live/live_integration_deploy.py
python tests/live/live_directory_isolation.py

# Physical rig — the Round-4 release gate for the merged integration
HA_HOST=192.168.2.6 HA_PORT=8123 python tests/live/live_enterprise.py

# Simulator tests: run on the host with the simulators up.
SIM_HOST=127.0.0.1 python tests/live/live_simulators.py
```

## Browser suites

The panel's browser coverage lives outside this folder:

- `tests/e2e-panels.sh` — a `playwright-cli` smoke test of the single tabbed
  panel (shell title, protocol tabs, per-protocol guide + editor).
- `tests/theme-sync/` — a `@playwright/test` suite for panel structure
  (tabs = enabled protocols, tab switching) and theme sync (the custom-element
  panel follows HA's primary color and dark mode via CSS-variable inheritance).
  Run `npm install && npx playwright install` there first; point at another
  instance with `HA_URL`.
