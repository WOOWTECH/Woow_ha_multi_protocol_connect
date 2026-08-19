"""Fixtures for the woow_multi_protocol config/setup seam tests.

These tests exercise the integration at observable seams — HA's config-flow
manager and frontend panel registry — not private helpers. The heavy
`home-assistant-frontend` package is intentionally NOT a test dependency (the
repo's hermetic suite avoids it), so `panel_env` sets up `http` and seeds
frontend's URL managers directly; the frontend module docstring explicitly
supports integrations touching these on `hass.data`.
"""

from homeassistant.components import frontend
from homeassistant.setup import async_setup_component
import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow custom_components to be loaded in tests."""
    yield


@pytest.fixture
async def panel_env(hass):
    """Provide the minimal frontend seams `async_setup_entry` registers against."""
    assert await async_setup_component(hass, "http", {})
    hass.data[frontend.DATA_EXTRA_MODULE_URL] = frontend.UrlManager(lambda a, b: None, [])
    hass.data[frontend.DATA_EXTRA_JS_URL_ES5] = frontend.UrlManager(lambda a, b: None, [])
    return hass
