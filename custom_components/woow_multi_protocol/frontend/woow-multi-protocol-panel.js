/* Woow Multi-Protocol Connect — placeholder panel (scaffold).
 *
 * Foundation bundle for issue #5. The tabbed KNX / DMX / Modbus shell (built
 * from panel_frontend/ and deployed here) replaces this in a later issue; for
 * now it renders a themed placeholder so the sidebar panel loads end-to-end and
 * follows the HA light/dark theme. Hand-written and self-contained — no build
 * step, no Lit dependency.
 */
class WoowMultiProtocolPanel extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (this._rendered) return;
    this._rendered = true;

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100vh;
          background: var(--primary-background-color, #fafafa);
          color: var(--primary-text-color, #212121);
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
        }
        .wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
        h1 { font-size: 1.5rem; font-weight: 500; margin: 0 0 12px; }
        p { color: var(--secondary-text-color, #727272); line-height: 1.6; }
        code {
          background: var(--divider-color, #e0e0e0);
          padding: 2px 6px;
          border-radius: 4px;
        }
      </style>
      <div class="wrap">
        <h1>Woow Multi-Protocol Connect</h1>
        <p>The unified KNX / DMX / Modbus setup panel is being assembled. This
           placeholder confirms the integration is installed and its panel is
           served from <code>/woow_multi_protocol/frontend/</code>.</p>
      </div>`;
  }
}

if (!customElements.get("woow-multi-protocol-panel")) {
  customElements.define("woow-multi-protocol-panel", WoowMultiProtocolPanel);
}
