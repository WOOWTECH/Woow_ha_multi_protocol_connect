"""The single integration registers exactly one sidebar panel.

Setting up the `woow_multi_protocol` entry must put one — and only one — panel in
HA's frontend panel registry, pointing at the integration's own bundle, and
unloading must remove it. The panel also carries the set of enabled protocols so
the frontend renders exactly those tabs (issue #6). Asserted at the registry,
never at internals.
"""

from homeassistant.components import frontend
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.woow_multi_protocol import async_setup_entry, async_unload_entry
from custom_components.woow_multi_protocol.const import DOMAIN


def _entry(options=None):
    return MockConfigEntry(
        domain=DOMAIN,
        title="Woow Multi-Protocol Connect",
        data={},
        options=options or {},
    )


def _panel(hass):
    panels = hass.data[frontend.DATA_PANELS]
    ours = [p for p in panels.values() if p.frontend_url_path == DOMAIN]
    assert len(ours) == 1
    return ours[0]


async def test_setup_entry_registers_single_panel(panel_env):
    """Setting up the entry registers exactly one panel at the domain path."""
    hass = panel_env
    entry = _entry()
    entry.add_to_hass(hass)

    assert await async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    panel = _panel(hass)
    assert panel.component_name == "custom"
    module_url = panel.config["_panel_custom"]["module_url"]
    assert module_url == f"/{DOMAIN}/frontend/woow-multi-protocol-panel.js"


async def test_default_entry_enables_every_protocol(panel_env):
    """With no options set, all three protocol tabs are advertised to the panel."""
    hass = panel_env
    entry = _entry()
    entry.add_to_hass(hass)

    assert await async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    assert _panel(hass).config["enabled_protocols"] == ["knx", "dmx", "modbus"]


async def test_disabled_protocol_is_dropped_from_the_panel(panel_env):
    """Turning a protocol off in options removes its tab from the panel config."""
    hass = panel_env
    entry = _entry(options={"enable_knx": False})
    entry.add_to_hass(hass)

    assert await async_setup_entry(hass, entry)
    await hass.async_block_till_done()

    assert _panel(hass).config["enabled_protocols"] == ["dmx", "modbus"]


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
