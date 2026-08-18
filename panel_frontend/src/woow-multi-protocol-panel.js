import { LitElement, html, css, svg } from "lit";

import { WoowPanelBase } from "./woow-panel-base.js";
import { knxConfig } from "./config/knx-config.js";
import { dmxConfig } from "./config/dmx-config.js";
import { modbusConfig } from "./config/modbus-config.js";
import { knxTranslations } from "./i18n/translations-knx.js";
import { dmxTranslations } from "./i18n/translations-dmx.js";
import { modbusTranslations } from "./i18n/translations-modbus.js";

/**
 * The merged integration exposes one WebSocket command, `woow_multi_protocol/ws`,
 * that carries a `protocol` field. Each protocol reuses the shared WoowPanelBase
 * (guide + YAML editor) but points it at that command; `embedded` tells the base
 * to drop its own top bar, since this shell provides one.
 */
const WS_TYPE = "woow_multi_protocol/ws";

class WoowMpKnxPanel extends WoowPanelBase {
  static get protocolConfig() {
    return { ...knxConfig, wsType: WS_TYPE, protocol: "knx" };
  }
  static get protocolTranslations() {
    return knxTranslations;
  }
}
customElements.define("woow-mp-knx-panel", WoowMpKnxPanel);

class WoowMpDmxPanel extends WoowPanelBase {
  static get protocolConfig() {
    return { ...dmxConfig, wsType: WS_TYPE, protocol: "dmx" };
  }
  static get protocolTranslations() {
    return dmxTranslations;
  }
}
customElements.define("woow-mp-dmx-panel", WoowMpDmxPanel);

class WoowMpModbusPanel extends WoowPanelBase {
  static get protocolConfig() {
    return { ...modbusConfig, wsType: WS_TYPE, protocol: "modbus" };
  }
  static get protocolTranslations() {
    return modbusTranslations;
  }
}
customElements.define("woow-mp-modbus-panel", WoowMpModbusPanel);

// Tab order + display metadata. Only protocols in the entry's options are shown.
const PROTOCOLS = [
  { key: "knx", label: "KNX", tag: "woow-mp-knx-panel" },
  { key: "dmx", label: "DMX", tag: "woow-mp-dmx-panel" },
  { key: "modbus", label: "Modbus", tag: "woow-mp-modbus-panel" },
];

/**
 * WoowMultiProtocolPanel — the single sidebar panel.
 *
 * Renders one top bar and a protocol tab strip whose tabs are exactly the
 * protocols enabled in the config entry's options (passed via `panel.config`).
 * The active protocol's panel is shown; the others are kept in the DOM (hidden)
 * so switching tabs preserves each editor's state.
 */
class WoowMultiProtocolPanel extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      panel: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },
      _activeProtocol: { type: String, state: true },
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        min-height: 100vh;
        background: var(--primary-background-color, #fafafa);
        color: var(--primary-text-color, #212121);
        font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      }
      .top-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 56px;
        padding: 0 16px;
        background: var(--app-header-background-color, var(--primary-color, #03a9f4));
        color: var(--app-header-text-color, #fff);
      }
      .menu-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        display: flex;
      }
      .menu-btn svg {
        width: 24px;
        height: 24px;
      }
      .top-bar-title {
        font-size: 1.1rem;
        font-weight: 500;
      }
      .proto-tabs {
        display: flex;
        gap: 4px;
        padding: 0 12px;
        background: var(--card-background-color, #fff);
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .proto-tab {
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--secondary-text-color, #727272);
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        padding: 14px 20px;
      }
      .proto-tab.active {
        color: var(--primary-color, #03a9f4);
        border-bottom-color: var(--primary-color, #03a9f4);
      }
      .empty {
        max-width: 720px;
        margin: 0 auto;
        padding: 48px 24px;
        color: var(--secondary-text-color, #727272);
      }
      [hidden] {
        display: none !important;
      }
    `;
  }

  constructor() {
    super();
    this._activeProtocol = "";
  }

  get _enabledProtocols() {
    const enabled = this.panel?.config?.enabled_protocols;
    const set = Array.isArray(enabled) ? enabled : PROTOCOLS.map((p) => p.key);
    return PROTOCOLS.filter((p) => set.includes(p.key));
  }

  updated() {
    // Default the active tab to the first enabled protocol, and recover if the
    // active one was just disabled via options.
    const enabled = this._enabledProtocols;
    if (enabled.length && !enabled.some((p) => p.key === this._activeProtocol)) {
      this._activeProtocol = enabled[0].key;
    }
  }

  _selectProtocol(key) {
    this._activeProtocol = key;
  }

  _toggleMenu() {
    this.dispatchEvent(
      new Event("hass-toggle-menu", { bubbles: true, composed: true })
    );
  }

  get _iconMenu() {
    return svg`<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>`;
  }

  render() {
    const enabled = this._enabledProtocols;
    const active = this._activeProtocol;

    return html`
      <div class="top-bar">
        <button class="menu-btn" @click=${this._toggleMenu} aria-label="Menu">
          <svg viewBox="0 0 24 24">${this._iconMenu}</svg>
        </button>
        <span class="top-bar-title">Woow Multi-Protocol Connect</span>
      </div>

      ${enabled.length
        ? html`
            <div class="proto-tabs" role="tablist">
              ${enabled.map(
                (p) => html`
                  <button
                    class="proto-tab ${p.key === active ? "active" : ""}"
                    role="tab"
                    aria-selected=${p.key === active}
                    @click=${() => this._selectProtocol(p.key)}
                  >
                    ${p.label}
                  </button>
                `
              )}
            </div>
            ${enabled.map((p) => this._renderPane(p, p.key === active))}
          `
        : html`<div class="empty">No protocols are enabled. Enable one in
            the integration's options.</div>`}
    `;
  }

  _renderPane(p, isActive) {
    // Each protocol's panel stays mounted (hidden when inactive) so its editor
    // state survives tab switches. Tags are static custom elements defined above.
    switch (p.key) {
      case "knx":
        return html`<woow-mp-knx-panel
          ?hidden=${!isActive}
          .hass=${this.hass}
          .narrow=${this.narrow}
          .route=${this.route}
          .embedded=${true}
        ></woow-mp-knx-panel>`;
      case "dmx":
        return html`<woow-mp-dmx-panel
          ?hidden=${!isActive}
          .hass=${this.hass}
          .narrow=${this.narrow}
          .route=${this.route}
          .embedded=${true}
        ></woow-mp-dmx-panel>`;
      case "modbus":
        return html`<woow-mp-modbus-panel
          ?hidden=${!isActive}
          .hass=${this.hass}
          .narrow=${this.narrow}
          .route=${this.route}
          .embedded=${true}
        ></woow-mp-modbus-panel>`;
      default:
        return "";
    }
  }
}

if (!customElements.get("woow-multi-protocol-panel")) {
  customElements.define("woow-multi-protocol-panel", WoowMultiProtocolPanel);
}
