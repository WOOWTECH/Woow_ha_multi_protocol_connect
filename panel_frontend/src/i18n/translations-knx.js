/**
 * KNX-specific translations — guide steps and protocol UI strings.
 */
export const knxTranslations = {
  en: {
    panel_title: "KNX Settings",
    step1_title: "Read Official Documentation",
    step1_desc: "Review the HA KNX integration docs to understand connection settings, group addresses, and supported entity types.",
    step1_link: "KNX Docs",
    step2_title: "Use Woow AI Assistant",
    step2_desc: "Provide your device model and group addresses to the AI assistant to generate ready-to-use YAML configurations.",
    step2_link: "AI Assistant",
    step3_title: "Add KNX Integration via UI",
    step3_desc: "Go to Settings > Devices & Services > Add Integration, search for KNX, and configure your gateway connection.",
    step4_title: "Edit YAML Configuration",
    step4_desc: "Use the built-in editor to write or paste your KNX device YAML configuration.",
    step5_title: "Restart & Verify",
    step5_desc: "Restart Home Assistant, then check Settings > Devices & Services > KNX to confirm devices loaded correctly.",
    info_tip: "KNX connection settings are configured via UI. YAML is only used for device and entity definitions.",
    editor_placeholder: "Select a file above to start editing, or paste AI-generated KNX YAML...",
    new_file_prompt: "Enter new file name (saved in config/knx/ directory):",
  },
  "zh-Hant": {
    panel_title: "KNX 設定",
    step1_title: "閱讀官方文檔",
    step1_desc: "瀏覽 HA KNX 整合文檔，了解連線設定、群組地址與支援的實體類型。",
    step1_link: "KNX 文檔",
    step2_title: "使用 Woow AI 助手",
    step2_desc: "提供裝置型號與群組地址給 AI 助手，即可取得可直接使用的 YAML 設定。",
    step2_link: "AI 助手",
    step3_title: "透過 UI 新增 KNX 整合",
    step3_desc: "前往 設定 > 裝置與服務 > 新增整合，搜尋 KNX 並設定 Gateway 連線。",
    step4_title: "編輯 YAML 設定",
    step4_desc: "使用內建編輯器撰寫或貼上 KNX 裝置 YAML 設定。",
    step5_title: "重啟並驗證",
    step5_desc: "重新啟動 Home Assistant，然後至 設定 > 裝置與服務 > KNX 確認裝置已載入。",
    info_tip: "KNX 連線設定透過 UI 完成，YAML 僅用於定義裝置與實體。",
    editor_placeholder: "選擇上方檔案開始編輯，或直接貼上 AI 產出的 KNX YAML 設定...",
    new_file_prompt: "請輸入新檔案名稱（儲存於 config/knx/ 目錄下）：",
  }
};
