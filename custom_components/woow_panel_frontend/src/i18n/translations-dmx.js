/**
 * DMX-specific translations — guide steps and protocol UI strings.
 */
export const dmxTranslations = {
  en: {
    panel_title: "DMX Settings",
    step1_title: "Read Official Documentation",
    step1_desc: "Review the ha-artnet-led docs to understand Art-Net node settings, Universe configuration, and fixture types.",
    step1_link: "Art-Net Docs",
    step2_title: "Use Woow AI Assistant",
    step2_desc: "Provide your fixture type, DMX channels, and Universe number to the AI assistant for ready-to-use YAML.",
    step2_link: "AI Assistant",
    step3_title: "Install Art-Net LED Integration",
    step3_desc: "Install via HACS by searching for Art-Net LED, or manually copy the artnet_led component to custom_components/.",
    step4_title: "Edit YAML Configuration",
    step4_desc: "Use the built-in editor to write or paste your Art-Net DMX fixture YAML configuration.",
    step5_title: "Restart & Verify",
    step5_desc: "Restart Home Assistant, then check Settings > Devices & Services to confirm fixtures loaded correctly.",
    info_tip: "Art-Net LED is a third-party integration installed via HACS. All fixture configs are defined in YAML.",
    editor_placeholder: "Select a file above to start editing, or paste AI-generated DMX YAML...",
    new_file_prompt: "Enter new file name (saved in config/dmx/ directory):",
  },
  "zh-Hant": {
    panel_title: "DMX 設定",
    step1_title: "閱讀官方文檔",
    step1_desc: "瀏覽 ha-artnet-led 文檔，了解 Art-Net node 設定、Universe 配置與燈具類型。",
    step1_link: "Art-Net 文檔",
    step2_title: "使用 Woow AI 助手",
    step2_desc: "提供燈具類型、DMX 通道與 Universe 編號給 AI 助手，即可取得可用的 YAML 設定。",
    step2_link: "AI 助手",
    step3_title: "安裝 Art-Net LED 整合",
    step3_desc: "透過 HACS 搜尋 Art-Net LED 安裝，或手動複製 artnet_led 元件至 custom_components/ 目錄。",
    step4_title: "編輯 YAML 設定",
    step4_desc: "使用內建編輯器撰寫或貼上 Art-Net DMX 燈具 YAML 設定。",
    step5_title: "重啟並驗證",
    step5_desc: "重新啟動 Home Assistant，然後至 設定 > 裝置與服務 確認燈具已載入。",
    info_tip: "Art-Net LED 為第三方整合，透過 HACS 安裝。所有燈具設定均在 YAML 中定義。",
    editor_placeholder: "選擇上方檔案開始編輯，或直接貼上 AI 產出的 DMX YAML 設定...",
    new_file_prompt: "請輸入新檔案名稱（儲存於 config/dmx/ 目錄下）：",
  }
};
