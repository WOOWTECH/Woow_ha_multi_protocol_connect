import { css } from "lit";

export const panelStyles = css`
  /* ============================================
     Host
     ============================================ */
  :host {
    display: block;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.5;
  }

  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* ============================================
     Loading Screen (before hass injected)
     ============================================ */
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 100vh;
  }
  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color, #03a9f4);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ============================================
     Top Bar (56px, sticky)
     ============================================ */
  .top-bar {
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 16px;
    background: var(--app-header-background-color, var(--primary-background-color, #fafafa));
    color: var(--app-header-text-color, var(--primary-text-color, #212121));
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    position: sticky;
    top: 0;
    z-index: 100;
    gap: 12px;
  }

  .menu-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .menu-btn:hover {
    background: var(--secondary-background-color, #e0e0e0);
  }
  .menu-btn svg {
    width: 24px;
    height: 24px;
  }

  .top-bar-title {
    font-size: 20px;
    font-weight: 500;
    flex: 1;
  }

  .top-bar-version {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  /* ============================================
     Tabs
     ============================================ */
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    padding: 0 16px;
  }

  .tab {
    padding: 12px 16px;
    border: none;
    background: none;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .tab:hover {
    color: var(--primary-text-color, #212121);
  }
  .tab.active {
    color: var(--primary-color, #03a9f4);
    border-bottom-color: var(--primary-color, #03a9f4);
  }

  /* ============================================
     Content Area
     ============================================ */
  .content {
    padding: 16px;
  }

  /* ============================================
     Guide Card (step list)
     ============================================ */
  .guide-card {
    background: var(--card-background-color, white);
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1));
    overflow: hidden;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .step-item:last-child {
    border-bottom: none;
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, white);
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    margin-bottom: 4px;
  }

  .step-desc {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    line-height: 1.4;
  }

  .step-link {
    font-size: 13px;
    color: var(--primary-color, #03a9f4);
    text-decoration: none;
    white-space: nowrap;
    align-self: center;
    flex-shrink: 0;
  }
  .step-link:hover {
    opacity: 0.8;
  }

  /* ============================================
     Info Card (bottom tip)
     ============================================ */
  .info-card {
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 8px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    display: flex;
    gap: 8px;
    align-items: flex-start;
    line-height: 1.4;
  }

  .info-icon {
    color: var(--primary-color, #03a9f4);
    flex-shrink: 0;
  }
  .info-icon svg {
    width: 16px;
    height: 16px;
  }

  /* ============================================
     Editor Card
     ============================================ */
  .editor-card {
    background: var(--card-background-color, white);
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1));
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 12px;
    gap: 8px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .file-select {
    padding: 6px 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-size: 14px;
    background: var(--card-background-color, white);
    color: var(--primary-text-color, #212121);
    flex: 1;
    max-width: 240px;
    outline: none;
  }
  .file-select:focus {
    border-color: var(--primary-color, #03a9f4);
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    font-size: 14px;
    font-weight: 500;
  }
  .icon-btn:hover {
    background: var(--secondary-background-color, #e0e0e0);
  }
  .icon-btn svg {
    width: 20px;
    height: 20px;
  }

  .editor-textarea {
    min-height: 50vh;
    padding: 12px;
    border: none;
    font-family: "Noto Sans Mono", Consolas, monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--primary-text-color, #212121);
    background: var(--primary-background-color, #fafafa);
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    tab-size: 2;
  }
  .editor-textarea::placeholder {
    color: var(--disabled-text-color, #bdbdbd);
  }

  .editor-statusbar {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    border-top: 1px solid var(--divider-color, #e0e0e0);
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    gap: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success-color, #4caf50);
  }
  .status-dot.disconnected {
    background: var(--error-color, #f44336);
  }

  .editor-actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }

  /* ============================================
     Buttons
     ============================================ */
  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, white);
  }
  .btn-primary:hover {
    opacity: 0.9;
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-secondary {
    background: var(--secondary-background-color, #e0e0e0);
    color: var(--primary-text-color, #212121);
  }
  .btn-secondary:hover {
    background: var(--divider-color, #bdbdbd);
  }
  .btn-danger {
    padding: 8px 16px;
    background: var(--error-color, #f44336);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-danger:hover:not(:disabled) {
    opacity: 0.9;
  }

  /* ============================================
     Restart Card
     ============================================ */
  .restart-card {
    margin-top: 16px;
    background: var(--card-background-color, white);
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1));
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .restart-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    margin-right: auto;
  }

  .restart-confirm {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
  }
  .restart-confirm input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--primary-color, #03a9f4);
  }

  .restart-status {
    width: 100%;
    font-size: 12px;
    margin-top: 4px;
    min-height: 16px;
  }

  /* ============================================
     Responsive (< 600px)
     ============================================ */
  @media (max-width: 600px) {
    .content {
      padding: 8px;
    }
    .tabs {
      padding: 0 8px;
    }
    .editor-textarea {
      min-height: 40vh;
    }
    .restart-card {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;
