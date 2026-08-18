"""Woow Multi-Protocol Connect — single sidebar panel (scaffold).

Foundation prefactor (issue #5): register exactly one placeholder sidebar panel
and serve the integration's frontend bundle, so the new domain loads and the
repo is ready to wire protocols onto. No protocol behaviour yet — the tabbed
KNX/DMX/Modbus shell, WebSocket file editing, and the `protocol`-keyed service
set (ADR-0001 / ADR-0002 / ADR-0003) are added in later issues.
"""

import logging
import os
import time

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, PANEL_COMPONENT_NAME, PANEL_ICON, PANEL_TITLE

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up from YAML (unused — this integration is config-entry only)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Woow Multi-Protocol Connect from its singleton config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Serve the integration's frontend bundle.
    panel_dir = os.path.join(os.path.dirname(__file__), "frontend")
    await hass.http.async_register_static_paths(
        [StaticPathConfig(f"/{DOMAIN}/frontend", panel_dir, cache_headers=False)]
    )

    # Register the single sidebar panel (a themed placeholder for now).
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=DOMAIN,
        require_admin=False,
        config={
            "_panel_custom": {
                "name": PANEL_COMPONENT_NAME,
                "module_url": f"/{DOMAIN}/frontend/{PANEL_COMPONENT_NAME}.js",
                "embed_iframe": False,
            }
        },
    )

    # Translate the sidebar title to match HA's language on every page.
    cache_buster = int(time.time())
    frontend.add_extra_js_url(
        hass, f"/{DOMAIN}/frontend/sidebar-title.js?v={cache_buster}"
    )

    _LOGGER.info("Woow Multi-Protocol Connect panel registered")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the config entry and remove the panel."""
    frontend.async_remove_panel(hass, DOMAIN)
    _LOGGER.info("Woow Multi-Protocol Connect panel removed")
    return True
