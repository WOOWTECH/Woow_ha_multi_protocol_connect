# Woow Panel Frontend Redesign: iframe → LitElement panel_custom

## Summary

Rewrite all three Woow panels (KNX/DMX/Modbus) from standalone iframe HTML files to LitElement-based `panel_custom` Web Components that fully inherit Home Assistant's theme system.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Panel type | `panel_custom` (not iframe) |
| Theme integration | Full HA theme inheritance (all colors from HA CSS variables) |
| UI framework | LitElement (HA's own framework) |
| Code sharing | Shared `WoowPanelBase` class + protocol config subclasses |
| Bundler | Rollup (HA ecosystem standard) |

## Architecture

### Project Structure

```
custom_components/
├── woow_panel_frontend/              # NEW: shared frontend source
│   ├── package.json
│   ├── rollup.config.js
│   ├── scripts/
│   │   └── deploy.js                 # Copy dist → each component's frontend/
│   ├── src/
│   │   ├── woow-panel-base.js        # WoowPanelBase LitElement base class
│   │   ├── styles.js                 # Shared CSS (maps to HA theme variables)
│   │   ├── woow-knx-panel.js         # KNX subclass (~20 lines)
│   │   ├── woow-dmx-panel.js         # DMX subclass (~20 lines)
│   │   └── woow-modbus-panel.js      # Modbus subclass (~20 lines)
│   └── dist/                         # Rollup output
│       ├── woow-knx-panel.js
│       ├── woow-dmx-panel.js
│       └── woow-modbus-panel.js
├── woow_knx/
│   ├── __init__.py                   # MODIFY: iframe → panel_custom
│   └── frontend/
│       ├── woow-knx-panel.js         # NEW: built panel JS
│       └── sidebar-title.js          # KEEP: unchanged
├── woow_dmx/
│   ├── __init__.py                   # MODIFY
│   └── frontend/
│       ├── woow-dmx-panel.js         # NEW
│       └── sidebar-title.js          # KEEP
└── woow_modbus/
    ├── __init__.py                   # MODIFY
    └── frontend/
        ├── woow-modbus-panel.js      # NEW
        └── sidebar-title.js          # KEEP
```

### Files to Delete

- `custom_components/woow_knx/frontend/panel.html`
- `custom_components/woow_dmx/frontend/panel.html`
- `custom_components/woow_modbus/frontend/panel.html`

## Panel Registration Change

### Before (iframe)

```python
frontend.async_register_built_in_panel(
    hass,
    component_name="iframe",
    sidebar_title=PANEL_TITLE,
    sidebar_icon=PANEL_ICON,
    frontend_url_path=DOMAIN,
    require_admin=False,
    config={"url": f"/{DOMAIN}/frontend/panel.html"},
)
```

### After (panel_custom)

```python
frontend.async_register_built_in_panel(
    hass,
    component_name="custom",
    sidebar_title=PANEL_TITLE,
    sidebar_icon=PANEL_ICON,
    frontend_url_path=DOMAIN,
    require_admin=False,
    config={
        "_panel_custom": {
            "name": "woow-knx-panel",
            "js_url": f"/{DOMAIN}/frontend/woow-knx-panel.js",
            "embed_iframe": False,
        }
    },
)
```

## WoowPanelBase Design

### HA-Injected Properties

HA automatically sets these on any `panel_custom` element:

- `element.hass` — Full hass object (language, theme, WebSocket connection, etc.)
- `element.panel` — Panel config
- `element.narrow` — Boolean, narrow screen
- `element.route` — Routing info

### Base Class

```javascript
import { LitElement, html, css } from "lit";
import { styles } from "./styles.js";

export class WoowPanelBase extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      panel: { type: Object },
      narrow: { type: Boolean },
      _files: { type: Array },
      _currentFile: { type: String },
      _editorContent: { type: String },
      _connected: { type: Boolean },
    };
  }

  static get styles() { return styles; }

  // Subclass overrides
  get protocolName() { return ""; }
  get protocolIcon() { return ""; }
  get wsCommand() { return ""; }
  get configSubdir() { return ""; }
  get protocolDocs() { return ""; }
  get titles() { return {}; }

  render() {
    return html`
      <div class="panel-container">
        <div class="top-bar">...</div>
        <div class="hero">...</div>
        <div class="steps">...</div>
        <div class="editor-section">...</div>
        <div class="footer">...</div>
      </div>
    `;
  }
}
```

### Subclass Example (KNX)

```javascript
import { WoowPanelBase } from "./woow-panel-base.js";

class WoowKnxPanel extends WoowPanelBase {
  get protocolName() { return "KNX"; }
  get protocolIcon() { return "mdi:help-network"; }
  get wsCommand() { return "woow_knx/ws"; }
  get configSubdir() { return "knx"; }
  get protocolDocs() { return "https://www.home-assistant.io/integrations/knx/"; }
  get titles() {
    return { en: "KNX Setup Guide", "zh-Hant": "KNX 設定指南" };
  }
}
customElements.define("woow-knx-panel", WoowKnxPanel);
```

## CSS Theme Mapping

All colors come from HA theme CSS variables. Zero hardcoded colors.

```javascript
import { css } from "lit";

export const styles = css`
  :host {
    display: block;
    background: var(--primary-background-color);
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
  }

  .top-bar {
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, var(--text-primary-color));
  }

  .hero {
    background: linear-gradient(135deg,
      var(--primary-color),
      var(--accent-color, var(--primary-color))
    );
    color: var(--text-primary-color);
  }

  .step-card {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: var(--ha-card-box-shadow, none);
  }

  .editor-section {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
  }

  .btn-primary {
    background: var(--primary-color);
    color: var(--text-primary-color);
  }

  .status-success { color: var(--success-color); }
  .status-warning { color: var(--warning-color); }
  .status-error   { color: var(--error-color); }
  .text-secondary { color: var(--secondary-text-color); }
  .text-muted     { color: var(--disabled-text-color); }
`;
```

## Build System

### rollup.config.js

```javascript
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const panels = ["knx", "dmx", "modbus"];

export default panels.map((name) => ({
  input: `src/woow-${name}-panel.js`,
  output: {
    file: `dist/woow-${name}-panel.js`,
    format: "es",
  },
  plugins: [resolve(), terser()],
}));
```

### package.json

```json
{
  "name": "woow-panel-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c --watch",
    "deploy": "npm run build && node scripts/deploy.js"
  },
  "dependencies": {
    "lit": "^3.0.0"
  },
  "devDependencies": {
    "rollup": "^4.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-terser": "^0.4.0"
  }
}
```

### Deploy Script

Build outputs are copied to each component's `frontend/` directory, then committed to git. The `dist/` files are what HA actually loads.

## Deployment Flow

```
cd custom_components/woow_panel_frontend
npm install
npm run deploy     # build + copy to each component
                   # restart HA container
```

## Implementation Steps

1. Create `woow_panel_frontend/` project structure with package.json, rollup.config.js
2. Implement `styles.js` — full CSS theme mapping
3. Implement `woow-panel-base.js` — base LitElement with all shared UI and logic
4. Implement three subclass files (KNX/DMX/Modbus)
5. Build with Rollup, verify output
6. Modify three `__init__.py` files for panel_custom registration
7. Deploy built JS to each component's frontend/
8. Delete old panel.html files
9. Deploy to HA container, restart, test
10. Test theme switching (light/dark, multiple themes)
11. Verify sidebar title translation still works
