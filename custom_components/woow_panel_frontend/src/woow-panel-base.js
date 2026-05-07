import { LitElement, html, svg } from "lit";
import { panelStyles } from "./styles.js";
import { getBaseTranslations } from "./i18n/translations-base.js";

/**
 * WoowPanelBase — shared LitElement base for KNX / DMX / Modbus panels.
 *
 * Subclasses MUST provide:
 *   static get protocolConfig()        → config object
 *   static get protocolTranslations()  → { en: {...}, "zh-Hant": {...} }
 *
 * HA injects: this.hass, this.panel, this.narrow, this.route
 */
export class WoowPanelBase extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      panel: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },

      _activeTab: { type: String, state: true },
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
    };
  }

  static get styles() {
    return panelStyles;
  }

  constructor() {
    super();
    this._activeTab = "guide";
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
    this._originalContent = "";
    this._hassReady = false;

    const base = getBaseTranslations();
    const proto = this.constructor.protocolTranslations;
    this._translations = {
      en: { ...base.en, ...proto.en },
      "zh-Hant": { ...base["zh-Hant"], ...proto["zh-Hant"] },
    };

    this._handleKeydown = this._onGlobalKeydown.bind(this);
    this._handleBeforeUnload = this._onBeforeUnload.bind(this);
  }

  get _cfg() {
    return this.constructor.protocolConfig;
  }

  /* i18n */
  get _language() {
    const lang = this.hass?.language || "en";
    const lower = lang.toLowerCase();
    if (lower === "zh-hant" || lower === "zh-tw" || lower === "zh-hk" || lower.startsWith("zh")) {
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

  /* Lifecycle */
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
    if (changedProps.has("hass") && this.hass && !this._hassReady) {
      this._hassReady = true;
      this._wsConnected = true;
      this._editorStatus = this._t("found_files", "...");
      this._refreshFileList();
    }
    if (changedProps.has("hass") && this.hass) {
      this._wsConnected = this.hass.connected !== false;
    }
  }

  /* WebSocket */
  async _callWS(payload) {
    if (!this.hass) throw new Error("Not connected");
    return this.hass.callWS(payload);
  }

  /* File operations */
  async _refreshFileList() {
    try {
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
      this._editorStatus = this._t("found_files", this._files.length);
      return;
    }

    if (this._editorDirty && this._currentFile) {
      if (!confirm(this._t("unsaved_switch"))) return;
    }

    try {
      this._editorStatus = this._t("loading_file", path);
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
    }
  }

  async _saveFile() {
    if (!this._currentFile) return;
    if (!confirm(this._t("confirm_save", this._currentFile))) return;

    this._editorStatus = this._t("saving_file", this._currentFile);
    try {
      await this._callWS({
        type: this._cfg.wsType,
        action: "save",
        path: this._currentFile,
        content: this._editorContent,
      });
      this._originalContent = this._editorContent;
      this._editorDirty = false;
      this._editorStatus = this._t("saved_file", this._currentFile);
      this._cacheState();
    } catch (err) {
      this._editorStatus = this._t("save_failed", err.message || err);
    }
  }

  _newFile() {
    const filename = prompt(this._t("new_file_prompt"), this._cfg.defaultNewFile);
    if (!filename) return;
    let name = filename.replace(/\.\./g, "").trim();
    if (!name.endsWith(".yaml") && !name.endsWith(".yml")) name += ".yaml";
    if (!this._files.includes(name)) this._files = [...this._files, name];
    this._currentFile = name;
    this._editorContent = "";
    this._originalContent = "";
    this._editorDirty = true;
    this._editorStatus = this._t("new_file_status", name);
  }

  /* Font size */
  _changeFontSize(delta) {
    this._fontSize = Math.max(10, Math.min(24, this._fontSize + delta));
    try {
      localStorage.setItem(`${this._cfg.localStoragePrefix}_fontsize`, this._fontSize);
    } catch (_) {}
  }

  _restoreFontSize() {
    try {
      const saved = localStorage.getItem(`${this._cfg.localStoragePrefix}_fontsize`);
      if (saved) this._fontSize = parseInt(saved, 10) || 14;
    } catch (_) {}
  }

  /* Cache */
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
    } catch (_) {}
  }

  _restoreCache() {
    try {
      const raw = localStorage.getItem(`${this._cfg.localStoragePrefix}_cache`);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.dirty && data.content && Date.now() - data.ts < 3600000) {
        this._editorContent = data.content;
        this._currentFile = data.file || "";
        this._editorDirty = true;
        this._editorStatus = this._t("cache_restored");
      }
    } catch (_) {}
  }

  /* Keyboard */
  _onGlobalKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (this._currentFile && this._activeTab === "editor") this._saveFile();
    }
  }

  _onBeforeUnload(e) {
    if (this._editorDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  /* Editor events */
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
      ta.value = ta.value.substring(0, start) + "  " + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this._editorContent = ta.value;
      this._editorDirty = true;
      this._cacheState();
    }
  }

  _onFileSelect(e) {
    this._loadFile(e.target.value);
  }

  /* Restart */
  _toggleRestart(e) {
    this._restartConfirmed = e.target.checked;
  }

  async _restartHA() {
    this._restartConfirmed = false;
    this._restartStatus = this._t("sending_restart");
    this._restartStatusColor = "var(--warning-color, #ff9800)";
    try {
      await this.hass.callService("homeassistant", "restart");
      this._restartStatus = this._t("restart_sent");
      this._restartStatusColor = "var(--success-color, #4caf50)";
    } catch (err) {
      this._restartStatus = this._t("restart_failed", err.message || err);
      this._restartStatusColor = "var(--error-color, #f44336)";
    }
  }

  /* Tab switching */
  _switchTab(tab) {
    this._activeTab = tab;
  }

  /* Menu toggle */
  _toggleMenu() {
    this.dispatchEvent(
      new Event("hass-toggle-menu", { bubbles: true, composed: true })
    );
  }

  /* SVG icons */
  get _iconMenu() {
    return svg`<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>`;
  }

  get _iconRefresh() {
    return svg`<path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>`;
  }

  get _iconInfo() {
    return svg`<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>`;
  }

  /* ============================================================
     RENDER
     ============================================================ */
  render() {
    const cfg = this._cfg;

    return html`
      <!-- Top Bar -->
      <div class="top-bar">
        <button class="menu-btn" @click=${this._toggleMenu}>
          <svg viewBox="0 0 24 24">${this._iconMenu}</svg>
        </button>
        <span class="top-bar-title">${this._t("panel_title")}</span>
        <span class="top-bar-version">v${cfg.version}</span>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab ${this._activeTab === "guide" ? "active" : ""}"
          @click=${() => this._switchTab("guide")}
        >${this._t("tab_guide")}</button>
        <button
          class="tab ${this._activeTab === "editor" ? "active" : ""}"
          @click=${() => this._switchTab("editor")}
        >${this._t("tab_editor")}</button>
      </div>

      <!-- Content -->
      <div class="content">
        ${this._activeTab === "guide" ? this._renderGuide() : this._renderEditorTab()}
      </div>
    `;
  }

  /* ============================================================
     Tab: Guide
     ============================================================ */
  _renderGuide() {
    const cfg = this._cfg;
    const steps = cfg.guideSteps || [];

    return html`
      <div class="guide-card">
        ${steps.map(
          (step, i) => html`
            <div class="step-item">
              <span class="step-number">${i + 1}</span>
              <div class="step-content">
                <div class="step-title">${this._t(step.titleKey)}</div>
                <div class="step-desc">${this._t(step.descKey)}</div>
              </div>
              ${step.linkKey
                ? html`<a class="step-link" href=${step.url} target="_blank" rel="noopener">${this._t(step.linkKey)}</a>`
                : ""}
            </div>
          `
        )}
      </div>

      ${cfg.infoTip
        ? html`
            <div class="info-card">
              <span class="info-icon">
                <svg viewBox="0 0 24 24">${this._iconInfo}</svg>
              </span>
              <span>${this._t(cfg.infoTip)}</span>
            </div>
          `
        : ""}
    `;
  }

  /* ============================================================
     Tab: Editor & System
     ============================================================ */
  _renderEditorTab() {
    return html`
      <!-- Editor Card -->
      <div class="editor-card">
        <div class="editor-toolbar">
          <select class="file-select" @change=${this._onFileSelect}>
            <option value="">${this._t("editor_select_placeholder")}</option>
            ${this._files.map(
              (f) => html`<option value=${f} ?selected=${f === this._currentFile}>${f}</option>`
            )}
          </select>
          <button class="icon-btn" @click=${this._refreshFileList} title=${this._t("editor_refresh_title")}>
            <svg viewBox="0 0 24 24">${this._iconRefresh}</svg>
          </button>
          <button class="icon-btn" @click=${() => this._changeFontSize(-1)} title="A-">A-</button>
          <button class="icon-btn" @click=${() => this._changeFontSize(1)} title="A+">A+</button>
        </div>

        <textarea
          class="editor-textarea"
          .value=${this._editorContent}
          @input=${this._onEditorInput}
          @keydown=${this._onEditorKeydown}
          style="font-size:${this._fontSize}px"
          placeholder=${this._t("editor_placeholder")}
          spellcheck="false"
        ></textarea>

        <div class="editor-statusbar">
          <span class="status-dot ${this._wsConnected ? "" : "disconnected"}"></span>
          <span>${this._wsConnected ? this._t("ws_connected") : this._t("ws_disconnected")}</span>
          <span>\u00b7</span>
          <span>${this._editorStatus}</span>
          <div class="editor-actions">
            <button class="btn btn-secondary" @click=${this._newFile}>${this._t("editor_new_file")}</button>
            <button class="btn btn-primary" ?disabled=${!this._currentFile} @click=${this._saveFile}>${this._t("editor_save")}</button>
          </div>
        </div>
      </div>

      <!-- Restart Card -->
      <div class="restart-card">
        <span class="restart-title">${this._t("restart_title")}</span>
        <label class="restart-confirm">
          <input type="checkbox" .checked=${this._restartConfirmed} @change=${this._toggleRestart} />
          ${this._t("restart_confirm_label")}
        </label>
        <button class="btn-danger" ?disabled=${!this._restartConfirmed} @click=${this._restartHA}>
          ${this._t("restart_btn")}
        </button>
        ${this._restartStatus
          ? html`<span class="restart-status" style="color:${this._restartStatusColor}">${this._restartStatus}</span>`
          : ""}
      </div>
    `;
  }
}
