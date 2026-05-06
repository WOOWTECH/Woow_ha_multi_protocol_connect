export const knxConfig = {
  domain: "woow_knx",
  wsType: "woow_knx/ws",
  configSubdir: "knx",
  protocolLabel: "KNX",
  heroIcon: "\u{1F50C}",
  officialDocsUrl: "https://www.home-assistant.io/integrations/knx",
  woowAiUrl: "https://aiot.woowtech.io/blog",
  defaultNewFile: "knx_config.yaml",
  localStoragePrefix: "woow_knx",
  version: "2.1.0",
  calloutType: "warning",
  step1ListItems: ["step1_li1", "step1_li2", "step1_li3", "step1_li4"],
  subSteps: [
    { titleKey: "sub1_title", descKey: "sub1_desc" },
    { titleKey: "sub2_title", descKey: "sub2_desc", descIsHtml: true },
    { titleKey: "sub3_title", descKey: "sub3_desc", descIsHtml: true, extraKey: "sub3_list", extraIsHtml: true },
    { titleKey: "sub4_title", descKey: "sub4_desc", descIsHtml: true },
    { titleKey: "sub5_title", descKey: "sub5_desc", descIsHtml: true },
    { titleKey: "sub6_title", descKey: "sub6_desc", descIsHtml: true },
    { titleKey: "sub7_title", descKey: "sub7_desc", descIsHtml: true },
  ],
  yamlExample: `# configuration.yaml -- 僅定義裝置（連線透過 UI 設定）
knx:
  light:
    - name: "客廳主燈"
      address: "1/0/1"
      state_address: "1/0/2"
      brightness_address: "1/0/3"
      brightness_state_address: "1/0/4"

  switch:
    - name: "玄關開關"
      address: "2/0/1"
      state_address: "2/0/2"

  sensor:
    - name: "室內溫度"
      state_address: "3/0/1"
      type: "temperature"`,
};
