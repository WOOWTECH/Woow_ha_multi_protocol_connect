/**
 * Modbus-specific translations — guide steps and protocol UI strings.
 */
export const modbusTranslations = {
  en: {
    panel_title: "Modbus Settings",
    step1_title: "Read Official Documentation",
    step1_desc: "Review the HA Modbus integration docs to understand TCP/RTU connections, Slave IDs, register types, and data formats.",
    step1_link: "Modbus Docs",
    step2_title: "Use Woow AI Assistant",
    step2_desc: "Provide your device model, register addresses, and Slave ID to the AI assistant for ready-to-use YAML.",
    step2_link: "AI Assistant",
    step3_title: "Prepare Device Info",
    step3_desc: "From the device manual, note the connection method (TCP/RTU), IP or serial port, Slave ID, and register address map.",
    step4_title: "Edit YAML Configuration",
    step4_desc: "Use the built-in editor to write or paste your Modbus device YAML configuration.",
    step5_title: "Restart & Verify",
    step5_desc: "Restart Home Assistant, then check Developer Tools > States to confirm Modbus entities are showing data.",
    info_tip: "Modbus is a built-in HA integration. No additional installation required — just configure via YAML.",
    editor_placeholder: "Select a file above to start editing, or paste AI-generated Modbus YAML...",
    new_file_prompt: "Enter new file name (saved in config/modbus/ directory):",
  },
  "zh-Hant": {
    panel_title: "Modbus 設定",
    step1_title: "閱讀官方文檔",
    step1_desc: "瀏覽 HA Modbus 整合文檔，了解 TCP/RTU 連線、Slave ID、暫存器類型與資料格式。",
    step1_link: "Modbus 文檔",
    step2_title: "使用 Woow AI 助手",
    step2_desc: "提供裝置型號、暫存器地址與 Slave ID 給 AI 助手，即可取得可用的 YAML 設定。",
    step2_link: "AI 助手",
    step3_title: "準備裝置資訊",
    step3_desc: "從裝置手冊取得連線方式（TCP/RTU）、IP 或串列埠路徑、Slave ID 與暫存器地址表。",
    step4_title: "編輯 YAML 設定",
    step4_desc: "使用內建編輯器撰寫或貼上 Modbus 裝置 YAML 設定。",
    step5_title: "重啟並驗證",
    step5_desc: "重新啟動 Home Assistant，然後至 開發者工具 > 狀態 確認 Modbus 實體已顯示數據。",
    info_tip: "Modbus 為 HA 內建整合，無需額外安裝，直接透過 YAML 設定即可使用。",
    editor_placeholder: "選擇上方檔案開始編輯，或直接貼上 AI 產出的 Modbus YAML 設定...",
    new_file_prompt: "請輸入新檔案名稱（儲存於 config/modbus/ 目錄下）：",
  }
};
