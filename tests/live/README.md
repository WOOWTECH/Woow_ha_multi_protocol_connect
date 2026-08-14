# Live-integration scripts

Standalone scripts that test the Setup Guide panels against a **running** Home
Assistant and, for `live_simulators.py`, against the protocol simulators. They
are **not** pytest tests: run each one directly with `python`.

They are named `live_*.py` (not `test_*.py`) on purpose, so pytest never
collects them. They are excluded from `ruff` (see `ruff.toml`) and from CI (see
`.github/workflows/ci.yml`). The hermetic unit suite lives in `tests/services/`.

## Scripts

| Script | Needs | What it checks |
|--------|-------|----------------|
| `live_enterprise.py` | Live HA at `localhost:15126` | Full integration suite (175 cases) across all three panels |
| `live_integration_deploy.py` | Live HA + `config_samples/` | Deploys sample configs, then verifies save → load → list round-trips |
| `live_directory_isolation.py` | Live HA + volume access | Config subdirectory sandbox boundaries (cross-panel access is blocked) |
| `live_simulators.py` | The simulators in `simulators/` (`pymodbus` for Modbus) | Speaks each wire protocol directly to verify the simulators |

## Running

Run from the repo root. The scripts resolve `config_samples/` and
`tmp/ha_token.txt` relative to the root, two levels up from here.

```bash
# Provide a token: either the HA_TOKEN env var, or a tmp/ha_token.txt file.
export HA_TOKEN=<long-lived-access-token>
python tests/live/live_enterprise.py
python tests/live/live_integration_deploy.py
python tests/live/live_directory_isolation.py

# Simulator tests: run on the host with the simulators up.
SIM_HOST=127.0.0.1 python tests/live/live_simulators.py
```
