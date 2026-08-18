import { WoowPanelBase } from "../woow-panel-base.js";
import { dmxConfig } from "../config/dmx-config.js";
import { dmxTranslations } from "../i18n/translations-dmx.js";

class WoowDmxPanel extends WoowPanelBase {
  static get protocolConfig() {
    return dmxConfig;
  }

  static get protocolTranslations() {
    return dmxTranslations;
  }
}

customElements.define("woow-dmx-panel", WoowDmxPanel);
