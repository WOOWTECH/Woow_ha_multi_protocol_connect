import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { panelStyles } from "./styles.js";
import { getBaseTranslations } from "./i18n/translations-base.js";

/**
 * WoowPanelBase — shared LitElement base for KNX / DMX / Modbus panels.
 *
 * Subclasses MUST provide:
 *   static get protocolConfig()        → config object (domain, wsType, etc.)
 *   static get protocolTranslations()  → { en: {...}, "zh-Hant": {...} }
 *
 * HA injects: this.hass, this.panel, this.narrow, this.route
 */
export class WoowPanelBase extends LitElement {
  /* ----------------------------------------------------------
     Reactive properties
     ---------------------------------------------------------- */
  static get properties() {
    return {
      hass: { type: Object },
      panel: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },

      _files: { type: Array, state: true },
      _currentFile: { type: String, state: true },
      _editorContent: { type: String, state: true },
      _editorDirty: { type: Boolean, state: true },
      _fontSize: { type: Number, state: true },
      _wsConnected: { type: Boolean, state: true },
      _restartConfirmed: { type: Boolean, state: true },
      _restartStatus: { type: String, state: true },
      _restartStatusColor: { type: String, state: true },
      _editorStatus: { type: String, state: true },
      _editorStatusColor: { type: String, state: true },
    };
  }

  static get styles() {
    return panelStyles;
  }

  /* ----------------------------------------------------------
     Constructor
     ---------------------------------------------------------- */
  constructor() {
    super();
    this._files = [];
    this._currentFile = "";
    this._editorContent = "";
    this._editorDirty = false;
    this._fontSize = 14;
    this._wsConnected = false;
    this._restartConfirmed = false;
    this._restartStatus = "";
    this._restartStatusColor = "";
    this._editorStatus = "";
    this._editorStatusColor = "";
    this._originalContent = "";
    this._hassReady = false;

    // Merge base + protocol translations once
    const base = getBaseTranslations();
    const proto = this.constructor.protocolTranslations;
    this._translations = {
      en: { ...base.en, ...proto.en },
      "zh-Hant": { ...base["zh-Hant"], ...proto["zh-Hant"] },
    };

    // Bound handlers (for cleanup)
    this._handleKeydown = this._onGlobalKeydown.bind(this);
    this._handleBeforeUnload = this._onBeforeUnload.bind(this);
  }

  /* ----------------------------------------------------------
     Config shortcut
     ---------------------------------------------------------- */
  get _cfg() {
    return this.constructor.protocolConfig;
  }

  /* ----------------------------------------------------------
     i18n
     ---------------------------------------------------------- */
  get _language() {
    const lang = this.hass?.language || "en";
    const lower = lang.toLowerCase();
    if (
      lower === "zh-hant" ||
      lower === "zh-tw" ||
      lower === "zh-hk" ||
      lower.startsWith("zh")
    ) {
      return "zh-Hant";
    }
    return "en";
  }

  _t(key, ...args) {
    const dict = this._translations[this._language] || this._translations.en;
    let str = dict[key] || this._translations.en[key] || key;
    args.forEach((val, i) => {
      str = str.replace(`{${i}}`, val);
    });
    return str;
  }

  /* ----------------------------------------------------------
     Lifecycle
     ---------------------------------------------------------- */
  connectedCallback() {
    super.connectedCallback();
    this._restoreFontSize();
    this._restoreCache();
    window.addEventListener("keydown", this._handleKeydown);
    window.addEventListener("beforeunload", this._handleBeforeUnload);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._handleKeydown);
    window.removeEventListener("beforeunload", this._handleBeforeUnload);
  }

  updated(changedProps) {
    super.updated(changedProps);
    // First time hass becomes available → refresh files
    if (changedProps.has("hass") && this.hass && !this._hassReady) {
      this._hassReady = true;
      this._wsConnected = true;
      this._editorStatus = this._t("editor_ready");
      this._refreshFileList();
    }
    // Track WS connection status from hass
    if (changedProps.has("hass") && this.hass) {
      this._wsConnected = this.hass.connected !== false;
    }
  }

  /* ----------------------------------------------------------
     WebSocket helpers (via hass.callWS)
     ---------------------------------------------------------- */
  async _callWS(payload) {
    if (!this.hass) throw new Error(this._t("ws_not_connected"));
    return this.hass.callWS(payload);
  }

  /* ----------------------------------------------------------
     File operations
     ---------------------------------------------------------- */
  async _refreshFileList() {
    try {
      this._editorStatus = this._t("loading_files");
      this._editorStatusColor = "";
      const result = await this._callWS({
        type: this._cfg.wsType,
        action: "list",
        ext: "yaml",
        depth: 10,
      });
      this._files = result.files || [];
      this._editorStatus = this._t("found_files", this._files.length);
    } catch (err) {
      this._editorStatus = this._t("load_failed", err.message || err);
    }
  }

  async _loadFile(path) {
    if (!path) {
      this._currentFile = "";
      this._editorContent = "";
      this._originalContent = "";
      this._editorDirty = false;
      this._editorStatus = this._t("editor_ready");
      this._editorStatusColor = "";
      return;
    }

    if (this._editorDirty && this._currentFile) {
      if (!confirm(this._t("unsaved_switch"))) return;
    }

    try {
      this._editorStatus = this._t("loading_file", path);
      this._editorStatusColor = "";
      const result = await this._callWS({
        type: this._cfg.wsType,
        action: "load",
        path,
      });
      this._editorContent = result.content;
      this._originalContent = result.content;
      this._currentFile = result.path || path;
      this._editorDirty = false;
      this._editorStatus = this._t("loaded_file", this._currentFile);
      this._cacheState();
    } catch (err) {
      this._editorStatus = this._t("file_load_failed", err.message || err);
      this._editorStatusColor = "var(--status-danger)";
    }
  }

  async _saveFile() {
    if (!this._currentFile) {
      this._editorStatus = this._t("select_or_new");
      return;
    }
    if (!confirm(this._t("confirm_save", this._currentFile))) return;

    this._editorStatus = this._t("saving_file", this._currentFile);
    this._editorStatusColor = "";

    try {
      await this._callWS({
        type: this._cfg.wsType,
        action: "save",
        path: this._currentFile,
        content: this._editorContent,
      });
      this._originalContent = this._editorContent;
      this._editorDirty = false;
      this._editorStatusColor = "var(--status-success)";
      this._editorStatus = this._t("saved_file", this._currentFile);
      this._cacheState();
      setTimeout(() => {
        this._editorStatusColor = "";
      }, 4000);
    } catch (err) {
      this._editorStatusColor = "var(--status-danger)";
      this._editorStatus = this._t("save_failed", err.message || err);
      setTimeout(() => {
        this._editorStatusColor = "";
      }, 5000);
    }
  }

  _newFile() {
    const filename = prompt(
      this._t("new_file_prompt"),
      this._cfg.defaultNewFile
    );
    if (!filename) return;

    let name = filename.replace(/\.\./g, "").trim();
    if (!name.endsWith(".yaml") && !name.endsWith(".yml")) {
      name += ".yaml";
    }

    if (!this._files.includes(name)) {
      this._files = [...this._files, name];
    }
    this._currentFile = name;
    this._editorContent = "";
    this._originalContent = "";
    this._editorDirty = true;
    this._editorStatus = this._t("new_file_status", name);
    this._editorStatusColor = "";
  }

  /* ----------------------------------------------------------
     Font size
     ---------------------------------------------------------- */
  _changeFontSize(delta) {
    this._fontSize = Math.max(10, Math.min(24, this._fontSize + delta));
    try {
      localStorage.setItem(
        `${this._cfg.localStoragePrefix}_fontsize`,
        this._fontSize
      );
    } catch (_) {
      /* ignored */
    }
  }

  _restoreFontSize() {
    try {
      const saved = localStorage.getItem(
        `${this._cfg.localStoragePrefix}_fontsize`
      );
      if (saved) this._fontSize = parseInt(saved, 10) || 14;
    } catch (_) {
      /* ignored */
    }
  }

  /* ----------------------------------------------------------
     Cache / crash recovery
     ---------------------------------------------------------- */
  _cacheState() {
    try {
      localStorage.setItem(
        `${this._cfg.localStoragePrefix}_cache`,
        JSON.stringify({
          file: this._currentFile,
          content: this._editorContent,
          dirty: this._editorDirty,
          ts: Date.now(),
        })
      );
    } catch (_) {
      /* ignored */
    }
  }

  _restoreCache() {
    try {
      const raw = localStorage.getItem(
        `${this._cfg.localStoragePrefix}_cache`
      );
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.dirty && data.content && Date.now() - data.ts < 3600000) {
        this._editorContent = data.content;
        this._currentFile = data.file || "";
        this._editorDirty = true;
        this._editorStatus = data.file
          ? this._t("cache_restored_file", data.file)
          : this._t("cache_restored");
      }
    } catch (_) {
      /* ignored */
    }
  }

  /* ----------------------------------------------------------
     Keyboard & unload handlers
     ---------------------------------------------------------- */
  _onGlobalKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (this._currentFile) this._saveFile();
    }
  }

  _onBeforeUnload(e) {
    if (this._editorDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  /* ----------------------------------------------------------
     Editor event handlers
     ---------------------------------------------------------- */
  _onEditorInput(e) {
    this._editorContent = e.target.value;
    this._editorDirty = this._editorContent !== this._originalContent;
    this._cacheState();
  }

  _onEditorKeydown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      ta.value = val.substring(0, start) + "  " + val.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this._editorContent = ta.value;
      this._editorDirty = true;
      this._cacheState();
    }
  }

  _onFileSelect(e) {
    this._loadFile(e.target.value);
  }

  /* ----------------------------------------------------------
     Restart HA
     ---------------------------------------------------------- */
  _toggleRestart(e) {
    this._restartConfirmed = e.target.checked;
  }

  async _restartHA() {
    this._restartConfirmed = false;
    this._restartStatusColor = "var(--status-warning)";
    this._restartStatus = this._t("sending_restart");

    try {
      await this.hass.callService("homeassistant", "restart");
      this._restartStatusColor = "var(--status-success)";
      this._restartStatus = this._t("restart_sent");
    } catch (err) {
      this._restartStatusColor = "var(--status-danger)";
      this._restartStatus = this._t("restart_failed", err.message || err);
    }
  }

  /* ----------------------------------------------------------
     Render
     ---------------------------------------------------------- */
  render() {
    const cfg = this._cfg;
    const t = (k, ...a) => this._t(k, ...a);
    const ut = (k) => unsafeHTML(this._t(k));

    return html`
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="protocol-pill">
          <span class="dot"></span>
          ${cfg.protocolLabel} SETUP
        </div>
        <div class="top-bar-brand">
          <span>Woow Tech</span> &middot; v${cfg.version}
        </div>
      </div>

      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <span class="hero-icon">${cfg.heroIcon}</span>
          <h1>${t("hero_title")}</h1>
          <p>${t("hero_subtitle")}</p>
        </div>
      </div>

      <div class="panel-container">
        <!-- Step Cards -->
        <div class="steps-container">
          ${this._renderStep1(t, ut, cfg)}
          ${this._renderStep2(t, ut, cfg)}
          ${this._renderStep3(t, ut, cfg)}
        </div>

        <hr class="section-divider" />

        <!-- YAML Editor -->
        ${this._renderEditor(t, ut)}

        <hr class="section-divider" />

        <!-- Restart HA -->
        ${this._renderRestart(t, ut)}

        <!-- Footer -->
        <div class="panel-footer">
          <p>${ut("footer")}</p>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     Step 1 — Read Official Docs
     ---------------------------------------------------------- */
  _renderStep1(t, ut, cfg) {
    return html`
      <div class="step-card">
        <div class="step-number">1</div>
        <h2>${ut("step1_title")}</h2>
        <p>${t("step1_desc")}</p>
        <ul>
          ${cfg.step1ListItems.map(
            (key) => html`<li>${ut(key)}</li>`
          )}
        </ul>
        <div class="btn-group">
          <a
            class="btn btn-filled btn-arrow"
            href=${cfg.officialDocsUrl}
            target="_blank"
            rel="noopener"
          >
            ${t("step1_btn")}
          </a>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     Step 2 — AI Assistant
     ---------------------------------------------------------- */
  _renderStep2(t, ut, cfg) {
    return html`
      <div class="step-card">
        <div class="step-number">2</div>
        <h2>${ut("step2_title")}</h2>
        <p>${t("step2_desc1")}</p>
        <p>${ut("step2_desc2")}</p>
        <div class="btn-group">
          <a
            class="btn btn-ghost btn-arrow"
            href=${cfg.woowAiUrl}
            target="_blank"
            rel="noopener"
          >
            ${t("step2_btn")}
          </a>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     Step 3 — Full Tutorial + Sub-steps + Code Example
     ---------------------------------------------------------- */
  _renderStep3(t, ut, cfg) {
    return html`
      <div class="step-card">
        <div class="step-number">3</div>
        <h2>${ut("step3_title")}</h2>
        <p>${t("step3_desc")}</p>

        <div class="sub-steps">
          ${cfg.subSteps.map(
            (sub, i) => html`
              <div class="sub-step">
                <span class="sub-step-number">${i + 1}</span>
                <div class="sub-step-content">
                  <strong>${t(sub.titleKey)}</strong>
                  ${sub.descIsHtml
                    ? html`<span>${ut(sub.descKey)}</span>`
                    : html`<span>${t(sub.descKey)}</span>`}
                  ${sub.extraKey
                    ? sub.extraIsHtml
                      ? html`<p style="padding-left:8px;margin-top:4px;">
                          ${ut(sub.extraKey)}
                        </p>`
                      : html`<p>${t(sub.extraKey)}</p>`
                    : ""}
                </div>
              </div>
            `
          )}
        </div>

        <p style="margin-top:16px;">${ut("yaml_example_label")}</p>

        <div class="callout callout-${cfg.calloutType}">
          <div class="callout-title">${ut("callout_ui_title")}</div>
          <p>${ut("callout_ui_desc")}</p>
        </div>

        <div class="code-block">${cfg.yamlExample}</div>

        <div class="callout callout-success">
          <p>${ut("callout_done")}</p>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     YAML Editor
     ---------------------------------------------------------- */
  _renderEditor(t, ut) {
    return html`
      <div class="editor-section">
        <div class="editor-header">
          <div class="editor-header-title">${ut("editor_title")}</div>
          <span
            class="ws-badge ${this._wsConnected ? "connected" : "disconnected"}"
          >
            ${this._wsConnected ? t("ws_connected") : t("ws_disconnected")}
          </span>
        </div>

        <div class="editor-toolbar">
          <select @change=${this._onFileSelect}>
            <option value="">${t("editor_select_placeholder")}</option>
            ${this._files.map(
              (f) =>
                html`<option value=${f} ?selected=${f === this._currentFile}>
                  ${f}
                </option>`
            )}
          </select>
          <button @click=${this._refreshFileList} title=${t("editor_refresh_title")}>
            ${t("editor_refresh")}
          </button>
          <button @click=${() => this._changeFontSize(-1)} title=${t("editor_font_smaller")}>
            A-
          </button>
          <button @click=${() => this._changeFontSize(1)} title=${t("editor_font_larger")}>
            A+
          </button>
        </div>

        <textarea
          class="editor-textarea"
          .value=${this._editorContent}
          @input=${this._onEditorInput}
          @keydown=${this._onEditorKeydown}
          style="font-size:${this._fontSize}px"
          placeholder=${t("editor_placeholder")}
          spellcheck="false"
        ></textarea>

        <div class="editor-footer">
          <span
            class="editor-status"
            style="color:${this._editorStatusColor || "inherit"}"
          >
            ${this._editorStatus || t("editor_ready")}
          </span>
          <div class="editor-footer-buttons">
            <button class="btn-editor" @click=${this._newFile}>
              ${t("editor_new_file")}
            </button>
            <button
              class="btn-save"
              ?disabled=${!this._currentFile}
              @click=${this._saveFile}
            >
              ${t("editor_save")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------------
     Restart HA
     ---------------------------------------------------------- */
  _renderRestart(t, ut) {
    return html`
      <div class="card">
        <h2>${ut("restart_title")}</h2>
        <p>${ut("restart_desc")}</p>

        <div class="callout callout-danger">
          <div class="callout-title">${ut("restart_warning_title")}</div>
          <p>${ut("restart_warning_desc")}</p>
          <ul>
            <li>${t("restart_li1")}</li>
            <li>${t("restart_li2")}</li>
            <li>${t("restart_li3")}</li>
            <li>${t("restart_li4")}</li>
          </ul>
        </div>

        <div class="callout callout-info">
          <div class="callout-title">${ut("restart_tip_title")}</div>
          <p>${ut("restart_tip_desc")}</p>
        </div>

        <div class="restart-section">
          <label class="checkbox-confirm">
            <input
              type="checkbox"
              .checked=${this._restartConfirmed}
              @change=${this._toggleRestart}
            />
            <span>${t("restart_confirm_label")}</span>
          </label>
        </div>
        <div class="restart-section">
          <button
            class="btn btn-danger"
            ?disabled=${!this._restartConfirmed}
            @click=${this._restartHA}
          >
            ${t("restart_btn")}
          </button>
        </div>
        ${this._restartStatus
          ? html`<div
              class="restart-status"
              style="color:${this._restartStatusColor || "inherit"}"
            >
              ${this._restartStatus}
            </div>`
          : ""}
      </div>
    `;
  }
}
