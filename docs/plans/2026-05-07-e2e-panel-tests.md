# E2E Panel Test Design

## Overview

Functional E2E test suite for the redesigned KNX/DMX/Modbus panels using `playwright-cli`.
Runs the same test suite against all 3 panels with protocol-specific expected data.

## Architecture

- **Format**: Single self-contained bash script (`tests/e2e-panels.sh`)
- **Execution**: Opens browser, logs in, tests all panels, prints summary, exits
- **Failure mode**: Continue-and-collect (runs all tests, reports all failures at end)
- **Exit code**: 0 = all pass, 1 = any fail

## Test Groups (per panel)

| ID | Group | Assertions |
|----|-------|-----------|
| T1 | Panel Load | Page loads, custom element in Shadow DOM, zero console errors |
| T2 | Top Bar | Title matches protocol, version v2.1.0, hamburger button exists |
| T3 | Tab Switching | Both tabs clickable, active state toggles, content changes |
| T4 | Guide Tab | 5 steps with numbers, titles match i18n, descriptions present |
| T5 | Info Tip | Info card visible with protocol-specific tip text |
| T6 | Editor Tab | File dropdown populated, correct count, buttons exist, textarea, status "Connected" |
| T7 | File Operations | Select file → content loads into textarea, status updates |
| T8 | Editor Controls | Font +/- buttons present, Save disabled when no dirty changes |
| T9 | Restart Section | Checkbox unchecked, button disabled, check → button enabled |
| T10 | No Legacy | Zero iframes, no emoji in rendered text, no raw HTML in visible text |

## Per-Panel Expected Data

| Field | KNX | DMX | Modbus |
|-------|-----|-----|--------|
| URL | /woow_knx | /woow_dmx | /woow_modbus |
| Title | KNX 設定 | DMX 設定 | Modbus 設定 |
| File count | 3 | 4 | 4 |
| Step1 link domain | home-assistant.io/integrations/knx | github.com/jnimmo/ha-artnet-led | home-assistant.io/integrations/modbus |
| Step2 link domain | aiot.woowtech.io/blog | aiot.woowtech.io/blog | aiot.woowtech.io/blog |

## Output Format

```
╔══════════════════════════════════════════════╗
║         E2E Panel Test Results               ║
╠══════════╦═══════╦═══════╦═══════════════════╣
║ Panel    ║ Pass  ║ Fail  ║ Status            ║
╠══════════╬═══════╬═══════╬═══════════════════╣
║ KNX      ║  10   ║   0   ║ PASS              ║
║ DMX      ║  10   ║   0   ║ PASS              ║
║ Modbus   ║  10   ║   0   ║ PASS              ║
╠══════════╬═══════╬═══════╬═══════════════════╣
║ TOTAL    ║  30   ║   0   ║ ALL PASS          ║
╚══════════╩═══════╩═══════╩═══════════════════╝
```
