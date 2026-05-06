export const dmxConfig = {
  domain: "woow_dmx",
  wsType: "woow_dmx/ws",
  configSubdir: "dmx",
  protocolLabel: "DMX",
  heroIcon: "\u{1F4A1}",
  officialDocsUrl: "https://github.com/Breina/ha-artnet-led",
  woowAiUrl: "https://aiot.woowtech.io/blog",
  defaultNewFile: "dmx_config.yaml",
  localStoragePrefix: "woow_dmx",
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
  yamlExample: `# configuration.yaml -- Art-Net DMX 燈具設定
light:
  - platform: artnet_led
    host: 192.168.1.100
    port: 6454
    universes:
      0:
        send_partial_universe: true
        devices:
          - channel: 1
            name: "客廳主燈"
            type: dimmer
            transition: 1

          - channel: 2
            name: "RGB 燈條"
            type: rgb
            transition: 1`,
};
