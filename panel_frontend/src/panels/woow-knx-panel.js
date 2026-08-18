import { WoowPanelBase } from "../woow-panel-base.js";
import { knxConfig } from "../config/knx-config.js";
import { knxTranslations } from "../i18n/translations-knx.js";

class WoowKnxPanel extends WoowPanelBase {
  static get protocolConfig() {
    return knxConfig;
  }

  static get protocolTranslations() {
    return knxTranslations;
  }
}

customElements.define("woow-knx-panel", WoowKnxPanel);
