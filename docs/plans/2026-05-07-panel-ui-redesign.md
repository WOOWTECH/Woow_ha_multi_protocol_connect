# Panel UI Redesign: 統一 Woow 套件視覺語言

## 目標

將 KNX/DMX/Modbus 設定面板的 UI 重新設計，使其與 `Woow_ha_records` 系列套件（財務、資產、健康紀錄、筆記）的視覺語言完全一致。

## 設計決策摘要

| 項目 | 決定 |
|------|------|
| 參考基準 | ha-finance-panel 佈局方式 |
| 頁籤劃分 | 兩頁籤：「設定指南」/「編輯器 & 系統」 |
| 設定指南呈現 | 精簡摘要 + 連結（非大段教學文字） |
| 頂部工具列 | 漢堡選單 + 標題 + 右側版本號 |
| 編輯器 & 系統佈局 | 上下排列：編輯器大區塊在上，重啟區塊精簡在下 |

---

## 一、整體頁面結構

```
┌─────────────────────────────────────────────────┐
│ ☰  KNX 設定                              v2.1.0 │  56px sticky top-bar
├─────────────────────────────────────────────────┤
│  設定指南        編輯器 & 系統                    │  頁籤列 (Material bottom-border indicator)
├─────────────────────────────────────────────────┤
│                                                 │
│  [頁籤內容區]                                    │  padding: 16px (mobile: 8px)
│                                                 │
└─────────────────────────────────────────────────┘
```

### 結構規則

- `:host` — `display: block; height: 100%; background: var(--primary-background-color)`
- Top-bar — `height: 56px; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--divider-color); background: var(--app-header-background-color, var(--primary-background-color))`
- 頁籤列 — 緊貼 top-bar 下方，`border-bottom: 1px solid var(--divider-color)`
- 內容區 — `padding: 16px`（`@media (max-width: 600px)` 時 `padding: 8px`）

### 色彩系統

完全移除自定義變數，100% 使用 HA CSS 變數：

```css
/* 使用 */
--primary-color               /* 主色調 (#03a9f4) */
--primary-text-color          /* 主文字色 */
--secondary-text-color        /* 次要文字色 */
--card-background-color       /* 卡片背景 */
--primary-background-color    /* 頁面背景 */
--secondary-background-color  /* 淺灰背景 */
--divider-color               /* 分隔線 */
--success-color               /* 綠色 (連線狀態) */
--error-color                 /* 紅色 (重啟按鈕) */
--text-primary-color          /* 主色上的白色文字 */

/* 移除 */
--protocol-primary
--protocol-glow
color-mix() 自創色彩
```

---

## 二、Top-bar 設計

```css
.top-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: var(--app-header-background-color, var(--primary-background-color));
  color: var(--app-header-text-color, var(--primary-text-color));
  border-bottom: 1px solid var(--divider-color);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
  margin: -16px -16px 0 -16px;
}
```

內容：
- 左：漢堡選單按鈕（40x40 圓形 icon-btn，觸發 `hass-toggle-menu` 事件）
- 中：標題文字 `font-size: 20px; font-weight: 500; flex: 1`
- 右：版本號 `font-size: 12px; color: var(--secondary-text-color)`

---

## 三、頁籤列設計

```css
.tabs {
  display: flex;
  border-bottom: 1px solid var(--divider-color);
  margin: 0 -16px;
  padding: 0 16px;
}

.tab {
  padding: 12px 16px;
  border: none;
  background: none;
  color: var(--secondary-text-color);
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  color: var(--primary-text-color);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}
```

---

## 四、「設定指南」頁籤

### 步驟列表卡片

一張卡片包含所有步驟，步驟之間用 divider 分隔：

```css
.guide-card {
  background: var(--card-background-color);
  border-radius: 8px;
  box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1));
  overflow: hidden;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--divider-color);
}
.step-item:last-child { border-bottom: none; }

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--text-primary-color, white);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content { flex: 1; }

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-text-color);
  margin-bottom: 4px;
}

.step-desc {
  font-size: 13px;
  color: var(--secondary-text-color);
  line-height: 1.4;
}

.step-link {
  font-size: 13px;
  color: var(--primary-color);
  text-decoration: none;
  white-space: nowrap;
  align-self: center;
}
```

### 步驟內容（以 KNX 為例）

| # | 標題 | 摘要 | 連結 |
|---|------|------|------|
| 1 | 閱讀官方設定文檔 | 瀏覽 KNX 整合文檔，了解連線與裝置設定參數。 | 前往文檔 → |
| 2 | 使用 AI 助手取得設定 | 提供裝置型號與群組地址，AI 產生對應 YAML。 | 前往助手 → |
| 3 | 透過 UI 新增整合 | 設定 → 裝置與服務 → 新增整合 → KNX，輸入 Gateway IP。 | — |
| 4 | 編輯 YAML 設定檔 | 切換至「編輯器」頁籤，寫入 AI 產生的設定。 | — |
| 5 | 重新啟動並驗證 | 儲存後重啟 HA，至裝置與服務確認實體載入。 | — |

### 底部提示卡片

```css
.info-card {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--secondary-background-color);
  border-radius: 8px;
  font-size: 13px;
  color: var(--secondary-text-color);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.info-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}
```

內容：「KNX 連線設定需透過 UI 完成，YAML 僅用於定義裝置與實體。」

---

## 五、「編輯器 & 系統」頁籤

### 編輯器卡片

```css
.editor-card {
  background: var(--card-background-color);
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
  border-bottom: 1px solid var(--divider-color);
}

.file-select {
  padding: 6px 8px;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  font-size: 14px;
  background: var(--card-background-color);
  color: var(--primary-text-color);
  flex: 1;
  max-width: 240px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--secondary-text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.icon-btn:hover {
  background: var(--secondary-background-color);
}

.editor-textarea {
  min-height: 50vh;
  padding: 12px;
  border: none;
  font-family: "Noto Sans Mono", Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: var(--primary-text-color);
  background: var(--primary-background-color);
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}
.editor-textarea:focus { outline: none; }

.editor-statusbar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-top: 1px solid var(--divider-color);
  font-size: 12px;
  color: var(--secondary-text-color);
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
  background: var(--primary-color);
  color: var(--text-primary-color, white);
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  background: var(--secondary-background-color);
  color: var(--primary-text-color);
}
.btn-secondary:hover { background: var(--divider-color); }
```

### 重啟區塊

```css
.restart-card {
  margin-top: 16px;
  background: var(--card-background-color);
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
  color: var(--primary-text-color);
  margin-right: auto;
}

.restart-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--secondary-text-color);
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
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger:hover:not(:disabled) { opacity: 0.9; }
```

佈局：`重啟標題` 靠左 → `☐ checkbox + 確認文字` 中間 → `[重新啟動]` 按鈕靠右。一行排列，手機時 `flex-wrap` 換行。

---

## 六、響應式設計

```css
@media (max-width: 600px) {
  .content { padding: 8px; }
  .top-bar { margin: -8px -8px 0 -8px; }
  .tabs { margin: 0 -8px; padding: 0 8px; }
  .editor-textarea { min-height: 40vh; }
  .restart-card { flex-direction: column; align-items: flex-start; }
}
```

---

## 七、移除的元素

從目前設計中完全刪除：
- Hero 區塊（emoji 大圖標 + 標題 + 描述段落）
- 漸層背景、`color-mix()` 自創色
- 大數字圓圈步驟指示器
- 子步驟展開列表（7 步或 6 步細節）
- YAML 程式碼範例區塊
- 「⚠️ 重要警告」和「💡 提示」大型 callout 方塊
- Footer 區塊（「Powered by Woow Tech」）
- 所有 emoji（改用 SVG icon 或純文字）

---

## 八、各協議差異

三個面板共用相同結構，僅以下內容不同：

| 配置項 | KNX | DMX | Modbus |
|--------|-----|-----|--------|
| top-bar 標題 | KNX 設定 | DMX 設定 | Modbus 設定 |
| 步驟 1 連結 | HA KNX 文檔 | ha-artnet-led GitHub | HA Modbus 文檔 |
| 步驟 3 描述 | 新增 KNX 整合 | 安裝 HACS 自訂元件 | 新增 Modbus 整合 |
| 提示卡片內容 | 連線設定需透過 UI | 需先安裝 ha-artnet-led | 支援 TCP/RTU 兩種模式 |
| WebSocket domain | woow_knx | woow_dmx | woow_modbus |
| 檔案副檔名 | knx_*.yaml | dmx_*.yaml | modbus_*.yaml |

---

## 九、實作步驟

1. **重寫 `styles.js`** — 按照上述 CSS 規範，移除所有自定義變數和裝飾性樣式
2. **重寫 `woow-panel-base.js` 的 `render()` 方法** — 新的 DOM 結構（top-bar + tabs + content）
3. **更新 config 檔** — 精簡步驟資料結構（移除子步驟、YAML 範例、callout 內容）
4. **更新 i18n 翻譯** — 刪除不再需要的大段文字翻譯鍵，新增頁籤標籤
5. **增加 `_activeTab` 響應式屬性** — 切換頁籤狀態
6. **Rollup 重新建置 + 部署測試**
