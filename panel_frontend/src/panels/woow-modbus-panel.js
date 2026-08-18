import { WoowPanelBase } from "../woow-panel-base.js";
import { modbusConfig } from "../config/modbus-config.js";
import { modbusTranslations } from "../i18n/translations-modbus.js";

class WoowModbusPanel extends WoowPanelBase {
  static get protocolConfig() {
    return modbusConfig;
  }

  static get protocolTranslations() {
    return modbusTranslations;
  }
}

customElements.define("woow-modbus-panel", WoowModbusPanel);
