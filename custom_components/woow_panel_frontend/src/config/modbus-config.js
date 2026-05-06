export const modbusConfig = {
  domain: "woow_modbus",
  wsType: "woow_modbus/ws",
  configSubdir: "modbus",
  protocolLabel: "Modbus",
  heroIcon: "\u{1F3ED}",
  officialDocsUrl: "https://www.home-assistant.io/integrations/modbus",
  woowAiUrl: "https://aiot.woowtech.io/blog",
  defaultNewFile: "modbus_config.yaml",
  localStoragePrefix: "woow_modbus",
  version: "2.1.0",
  calloutType: "info",
  step1ListItems: ["step1_li1", "step1_li2", "step1_li3", "step1_li4", "step1_li5"],
  subSteps: [
    { titleKey: "sub1_title", descKey: "sub1_desc" },
    { titleKey: "sub2_title", descKey: "sub2_desc", descIsHtml: true },
    { titleKey: "sub3_title", descKey: "sub3_desc", descIsHtml: true, extraKey: "sub3_list", extraIsHtml: true },
    { titleKey: "sub4_title", descKey: "sub4_desc", descIsHtml: true },
    { titleKey: "sub5_title", descKey: "sub5_desc", descIsHtml: true },
    { titleKey: "sub6_title", descKey: "sub6_desc", descIsHtml: true },
  ],
  yamlExample: `# configuration.yaml -- Modbus 設定範例
modbus:
  - name: "main_hub"
    type: tcp
    host: 192.168.1.200
    port: 502

    sensors:
      - name: "室內溫度"
        slave: 1
        address: 0
        input_type: input
        data_type: int16
        scale: 0.1
        unit_of_measurement: "°C"
        device_class: temperature

    switches:
      - name: "設備開關"
        slave: 1
        address: 0
        write_type: coil`,
};
