/* Woow Modbus — Sidebar Title i18n
 * Dynamically translates the sidebar panel title to match HA's language setting.
 * Loaded via frontend.add_extra_js_url() so it runs on every HA page.
 */
(function() {
  var PANEL_KEY = "woow_modbus";
  var TITLES = {
    "en":      "Modbus Setup Guide",
    "zh-Hant": "Modbus 設定指南"
  };

  function getLanguage(hass) {
    var lang = "";
    if (hass.language) lang = hass.language;
    else if (hass.locale && hass.locale.language) lang = hass.locale.language;
    else lang = navigator.language || "en";

    var lower = lang.toLowerCase();
    if (lower === "zh-hant" || lower === "zh-tw" || lower === "zh-hk") return "zh-Hant";
    if (lower.startsWith("zh")) return "zh-Hant";
    return "en";
  }

  function getHassObject() {
    try {
      var ha = document.querySelector("home-assistant");
      if (!ha || !ha.shadowRoot) return null;
      var main = ha.shadowRoot.querySelector("home-assistant-main");
      if (!main) return null;
      return { hass: main.hass, main: main };
    } catch (e) { return null; }
  }

  function updateTitle(hass, main, title) {
    if (!hass.panels || !hass.panels[PANEL_KEY]) return false;
    if (hass.panels[PANEL_KEY].title === title) return true;
    hass.panels[PANEL_KEY].title = title;
    main.hass = Object.assign({}, main.hass, {
      panels: Object.assign({}, main.hass.panels)
    });
    return true;
  }

  var retries = 0;
  var initInterval = setInterval(function() {
    retries++;
    if (retries > 30) { clearInterval(initInterval); return; }
    var obj = getHassObject();
    if (!obj || !obj.hass || !obj.hass.panels) return;
    var lang = getLanguage(obj.hass);
    var title = TITLES[lang] || TITLES["en"];
    if (updateTitle(obj.hass, obj.main, title)) {
      clearInterval(initInterval);
      startPolling();
    }
  }, 2000);

  function startPolling() {
    setInterval(function() {
      var obj = getHassObject();
      if (!obj || !obj.hass) return;
      var lang = getLanguage(obj.hass);
      var title = TITLES[lang] || TITLES["en"];
      updateTitle(obj.hass, obj.main, title);
    }, 5000);
  }
})();
