"""The single integration registers exactly one placeholder sidebar panel.

Acceptance seam for issue #5: setting up the `woow_multi_protocol` entry must
put one — and only one — panel in HA's frontend panel registry, pointing at the
integration's own placeholder bundle, and unloading must remove it. Asserted at
the registry, never at internals.
"""

from homeassistant.components import frontend
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.woow_multi_protocol import async_setup_entry, async_unload_entry
from custom_components.woow_multi_protocol.const import DOMAIN


def _entry():
    return MockConfigEntry(domain=DOMAIN, title="Woow Multi-Protocol Connect", data={})


async def test_setup_entry_registers_single_panel(panel_env):
    """Setting up the entry registers exactly one panel at the domain path."""
    hass = panel_env
    entry = _entry()
    entry.add_to_hass(hass)

    assert await async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    panels = hass.data[frontend.DATA_PANELS]
    ours = [p for p in panels.values() if p.frontend_url_path == DOMAIN]
    assert len(ours) == 1

    panel = ours[0]
    assert panel.component_name == "custom"
    module_url = panel.config["_panel_custom"]["module_url"]
    assert module_url == f"/{DOMAIN}/frontend/woow-multi-protocol-panel.js"


async def test_unload_entry_removes_the_panel(panel_env):
    """Unloading the entry leaves no orphaned panel behind."""
    hass = panel_env
    entry = _entry()
    entry.add_to_hass(hass)
    assert await async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    assert await async_unload_entry(hass, entry)
    await hass.async_block_till_done()

    assert DOMAIN not in hass.data[frontend.DATA_PANELS]
