import { css } from "lit";

export const panelStyles = css`
  /* ============================================
     HA Theme Variable Mapping
     ============================================ */
  :host {
    /* Background colors */
    --bg-base: var(--primary-background-color, #0F1114);
    --bg-surface: var(--card-background-color, #181B20);
    --bg-elevated: var(--secondary-background-color, #1F2329);
    --bg-input: var(--input-fill-color, var(--secondary-background-color, #14171B));

    /* Border colors */
    --border-subtle: var(--divider-color, rgba(255,255,255,0.06));
    --border-default: var(--divider-color, rgba(255,255,255,0.10));
    --border-strong: rgba(255,255,255,0.16);

    /* Text colors */
    --text-primary: var(--primary-text-color, #E8EAED);
    --text-secondary: var(--secondary-text-color, #9AA0A6);
    --text-muted: var(--disabled-text-color, #5F6368);
    --text-inverse: var(--text-primary-color, #FFFFFF);

    /* Status colors */
    --status-success: var(--success-color, #34A853);
    --status-warning: var(--warning-color, #FBBC04);
    --status-danger: var(--error-color, #EA4335);
    --status-info: var(--info-color, #4285F4);

    /* Protocol / accent colors */
    --protocol-primary: var(--accent-color, var(--primary-color, #009ac7));
    --protocol-primary-dark: var(--primary-color, #0288d1);
    --protocol-glow: color-mix(in srgb, var(--accent-color, var(--primary-color, #009ac7)) 15%, transparent);
    --protocol-glow-strong: color-mix(in srgb, var(--accent-color, var(--primary-color, #009ac7)) 25%, transparent);
    --protocol-gradient: linear-gradient(135deg, var(--primary-color, #009ac7), var(--accent-color, var(--primary-color, #0288d1)));

    /* Typography */
    --font-display: var(--ha-font-family, 'Roboto', system-ui, sans-serif);
    --font-mono: 'JetBrains Mono', 'Fira Code', var(--ha-font-family-code, monospace);

    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 40px;
    --space-2xl: 64px;

    /* Radii */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);

    /* Host base styles (replaces html/body) */
    display: block;
    font-family: var(--font-display);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  /* ============================================
     Reset
     ============================================ */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* ============================================
     Base Elements
     ============================================ */
  a {
    color: var(--protocol-primary);
    text-decoration: none;
    transition: color 0.2s ease;
  }
  a:hover {
    color: var(--protocol-primary-dark);
  }
  code {
    font-family: var(--font-mono);
    font-size: 13px;
    background: var(--bg-input);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  /* ============================================
     Layout Container
     ============================================ */
  .panel-container {
    max-width: 920px;
    margin: 0 auto;
    padding: 0 var(--space-lg);
    padding-bottom: var(--space-2xl);
  }

  /* ============================================
     Top Bar
     ============================================ */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-lg);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .protocol-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    background: var(--protocol-glow);
    border: 1px solid var(--protocol-primary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--protocol-primary);
  }
  .protocol-pill .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--protocol-primary);
    flex-shrink: 0;
  }
  .top-bar-brand {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }
  .top-bar-brand span {
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* ============================================
     Hero Section
     ============================================ */
  .hero {
    position: relative;
    background: var(--protocol-gradient);
    padding: var(--space-2xl) var(--space-xl);
    text-align: center;
    overflow: hidden;
    margin-bottom: var(--space-xl);
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px);
    animation: gridShift 30s linear infinite;
    pointer-events: none;
  }
  @keyframes gridShift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.3) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-content {
    position: relative;
    z-index: 1;
  }
  .hero-icon {
    font-size: 48px;
    margin-bottom: var(--space-md);
    display: block;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: var(--space-sm);
    letter-spacing: -0.01em;
  }
  .hero p {
    font-size: 15px;
    color: rgba(255,255,255,0.85);
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* ============================================
     Step Cards with Connecting Line
     ============================================ */
  .steps-container {
    position: relative;
    padding-left: 44px;
    margin-bottom: var(--space-xl);
  }
  .steps-container::before {
    content: '';
    position: absolute;
    left: 17px;
    top: 20px;
    bottom: 20px;
    width: 2px;
    background: linear-gradient(to bottom, var(--protocol-primary), var(--protocol-primary-dark), var(--border-default));
    border-radius: 1px;
  }
  .step-card {
    position: relative;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 2px solid var(--protocol-primary);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-md);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .step-card:hover {
    transform: scale(1.005);
    box-shadow: var(--shadow-md);
  }
  .step-number {
    position: absolute;
    left: -44px;
    top: var(--space-lg);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--protocol-primary);
    color: #FFFFFF;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 4px var(--bg-base), 0 0 0 5px var(--protocol-primary);
    z-index: 1;
  }
  .step-card h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .step-card h2 .icon {
    font-size: 22px;
    flex-shrink: 0;
  }
  .step-card p {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: var(--space-sm);
  }
  .step-card ul, .step-card ol {
    padding-left: 20px;
    margin-top: var(--space-sm);
  }
  .step-card li {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: var(--space-xs);
  }
  .step-card li strong {
    color: var(--text-primary);
  }

  /* ============================================
     Buttons
     ============================================ */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    text-align: center;
    line-height: 1;
  }
  .btn-filled {
    background: var(--protocol-primary);
    color: #FFFFFF;
  }
  .btn-filled:hover {
    background: var(--protocol-primary-dark);
    color: #FFFFFF;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-ghost {
    background: transparent;
    color: var(--protocol-primary);
    border: 1px solid var(--protocol-primary);
  }
  .btn-ghost:hover {
    background: var(--protocol-glow);
    color: var(--protocol-primary);
    transform: translateY(-1px);
  }
  .btn-danger {
    background: var(--status-danger);
    color: #FFFFFF;
    padding: 12px 28px;
    font-weight: 700;
  }
  .btn-danger:hover {
    background: #C62828;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-danger:disabled, .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-group {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    margin-top: var(--space-md);
  }
  .btn-arrow::after {
    content: '\u2192';
    font-size: 14px;
  }

  /* ============================================
     Sub-steps
     ============================================ */
  .sub-steps {
    margin-top: var(--space-md);
  }
  .sub-step {
    display: flex;
    gap: 12px;
    margin-bottom: var(--space-md);
    align-items: flex-start;
  }
  .sub-step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--protocol-glow-strong);
    color: var(--protocol-primary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .sub-step-content {
    flex: 1;
  }
  .sub-step-content strong {
    display: block;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 2px;
    font-weight: 600;
  }
  .sub-step-content span, .sub-step-content p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  /* ============================================
     Warning / Info Boxes (Callouts)
     ============================================ */
  .callout {
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin: var(--space-md) 0;
    border: 1px solid;
  }
  .callout-warning {
    background: rgba(251, 188, 4, 0.08);
    border-color: rgba(251, 188, 4, 0.3);
  }
  .callout-danger {
    background: rgba(234, 67, 53, 0.08);
    border-color: rgba(234, 67, 53, 0.3);
  }
  .callout-info {
    background: var(--protocol-glow);
    border-color: rgba(27, 143, 191, 0.3);
  }
  .callout-success {
    background: rgba(52, 168, 83, 0.08);
    border-color: rgba(52, 168, 83, 0.3);
  }
  .callout-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: var(--space-xs);
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary);
  }
  .callout p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
  .callout ul {
    padding-left: 18px;
    margin-top: var(--space-sm);
  }
  .callout li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--space-xs);
  }

  /* ============================================
     Code Block
     ============================================ */
  .code-block {
    background: var(--bg-input);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin: var(--space-md) 0;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    overflow-x: auto;
    color: var(--text-primary);
    white-space: pre;
  }

  /* ============================================
     YAML Editor Section
     ============================================ */
  .editor-section {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    position: relative;
  }
  .editor-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 60px;
    background: var(--protocol-primary);
    border-radius: 0 0 4px 0;
    z-index: 2;
  }
  .editor-header {
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    padding: 14px var(--space-lg);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .editor-header-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .ws-badge {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .ws-badge.connected {
    background: rgba(52, 168, 83, 0.15);
    color: var(--status-success);
    border: 1px solid rgba(52, 168, 83, 0.3);
  }
  .ws-badge.disconnected {
    background: rgba(234, 67, 53, 0.15);
    color: var(--status-danger);
    border: 1px solid rgba(234, 67, 53, 0.3);
  }
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
  }
  .editor-toolbar select {
    flex: 1;
    min-width: 160px;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-input);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .editor-toolbar select:focus {
    border-color: var(--protocol-primary);
  }
  .editor-toolbar button {
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .editor-toolbar button:hover {
    border-color: var(--protocol-primary);
    color: var(--protocol-primary);
    background: var(--protocol-glow);
  }
  .editor-textarea {
    display: block;
    width: 100%;
    min-height: 400px;
    padding: var(--space-md);
    background: var(--bg-input);
    color: var(--text-primary);
    border: none;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.7;
    resize: vertical;
    outline: none;
    tab-size: 2;
  }
  .editor-textarea::placeholder {
    color: var(--text-muted);
  }
  .editor-textarea:focus {
    box-shadow: inset 0 0 0 2px var(--protocol-glow-strong);
  }
  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .editor-status {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
    min-width: 100px;
  }
  .editor-footer-buttons {
    display: flex;
    gap: var(--space-sm);
  }
  .btn-editor {
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-editor:hover {
    border-color: var(--protocol-primary);
    color: var(--protocol-primary);
    background: var(--protocol-glow);
  }
  .btn-save {
    padding: 8px 20px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--status-success);
    color: #FFFFFF;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  .btn-save:hover {
    background: #2E7D32;
    transform: translateY(-1px);
  }
  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* ============================================
     Restart HA Section / Card
     ============================================ */
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 2px solid var(--protocol-primary);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card:hover {
    transform: scale(1.005);
    box-shadow: var(--shadow-md);
  }
  .card h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .card p {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }
  .restart-section {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-top: var(--space-md);
  }
  .checkbox-confirm {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .checkbox-confirm input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--protocol-primary);
  }
  .restart-status {
    margin-top: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    min-height: 20px;
    color: var(--text-secondary);
  }

  /* ============================================
     Footer
     ============================================ */
  .panel-footer {
    text-align: center;
    padding: var(--space-xl) 0 var(--space-lg);
    border-top: 1px solid var(--border-subtle);
    margin-top: var(--space-xl);
  }
  .panel-footer p {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }
  .panel-footer a {
    color: var(--protocol-primary);
    font-weight: 600;
  }

  /* ============================================
     Section Divider
     ============================================ */
  .section-divider {
    border: none;
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-xl) 0;
  }

  /* ============================================
     Responsive
     ============================================ */
  @media (max-width: 640px) {
    .panel-container { padding: 0 var(--space-md); }
    .hero { padding: var(--space-xl) var(--space-md); }
    .hero h1 { font-size: 24px; }
    .hero p { font-size: 13px; }
    .steps-container { padding-left: 36px; }
    .steps-container::before { left: 13px; }
    .step-number { left: -36px; width: 28px; height: 28px; font-size: 12px; }
    .step-card, .card { padding: var(--space-md); }
    .editor-textarea { min-height: 300px; font-size: 12px; }
    .top-bar { padding: var(--space-sm) var(--space-md); }
  }
`;
