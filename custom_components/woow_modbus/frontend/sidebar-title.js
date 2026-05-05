/* Woow Modbus — Sidebar Title i18n
 * Dynamically translates the sidebar panel title to match HA's language setting.
 * Loaded via frontend.add_extra_js_url() so it runs on every HA page.
 *
 * 3-phase approach:
 *   Phase 1: Fast retry loop waiting for hass to be ready
 *   Phase 2: Subscribe to core_config_updated for system-level language changes
 *   Phase 3: Polling fallback for user-profile-level language changes
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
    if (hass.panels[PANEL_KEY].title === title) return true; // already correct
    hass.panels[PANEL_KEY].title = title;
    main.hass = Object.assign({}, main.hass, {
      panels: Object.assign({}, main.hass.panels)
    });
    return true;
  }

  function applyTranslation() {
    var obj = getHassObject();
    if (!obj || !obj.hass || !obj.hass.panels) return false;
    var lang = getLanguage(obj.hass);
    var title = TITLES[lang] || TITLES["en"];
    return updateTitle(obj.hass, obj.main, title);
  }

  // Phase 1: Fast retry loop — wait for hass to be ready, then apply
  var retries = 0;
  var initInterval = setInterval(function() {
    retries++;
    if (retries > 60) { clearInterval(initInterval); return; }
    if (applyTranslation()) {
      clearInterval(initInterval);
      startPhase2();
      startPhase3();
    }
  }, 500);

  // Phase 2: Subscribe to core_config_updated event (system-level language change)
  function startPhase2() {
    try {
      var obj = getHassObject();
      if (!obj || !obj.hass || !obj.hass.connection) return;
      obj.hass.connection.subscribeEvents(function() {
        setTimeout(applyTranslation, 500);
      }, "core_config_updated");
    } catch (e) { /* ignore subscription errors */ }
  }

  // Phase 3: Polling fallback for user-profile-level language changes
  function startPhase3() {
    setInterval(function() {
      applyTranslation();
    }, 5000);
  }
})();
