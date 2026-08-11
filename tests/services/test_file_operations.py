"""File operations round-trip, and saving never applies.

A caller composes save x N then Apply x 1, so save_file must not reload the
Underlying integration on its own. Each Setup Guide panel also stays inside its
own Config subdirectory.
"""

from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.woow_dmx.services import register_services as register_dmx
from custom_components.woow_knx.services import register_services as register_knx

DMX = "woow_dmx"
KNX = "woow_knx"


async def _save(hass, domain, path, content):
    return await hass.services.async_call(
        domain,
        "save_file",
        {"path": path, "content": content},
        blocking=True,
        return_response=True,
    )


async def _load(hass, domain, path):
    return await hass.services.async_call(
        domain, "load_file", {"path": path}, blocking=True, return_response=True
    )


async def _list(hass, domain):
    result = await hass.services.async_call(
        domain, "list_files", {}, blocking=True, return_response=True
    )
    return result["files"]


async def test_saved_content_is_read_back_unchanged(hass):
    """A file written through the Service layer reads back byte-identical."""
    register_dmx(hass)
    content = "artnet:\n  universe: 1\n"

    save_result = await _save(hass, DMX, "dmx_artnet.yaml", content)
    load_result = await _load(hass, DMX, "dmx_artnet.yaml")

    assert save_result["success"] is True
    assert load_result["content"] == content


async def test_saved_file_appears_in_the_listing(hass):
    """list_files sees what save_file wrote."""
    register_dmx(hass)

    await _save(hass, DMX, "dmx_scenes.yaml", "scenes: []\n")

    assert "dmx_scenes.yaml" in await _list(hass, DMX)


async def test_save_does_not_apply(hass):
    """save_file writes only — it never reloads the Underlying integration."""
    register_dmx(hass)
    reload_calls = async_mock_service(hass, "artnet", "reload")
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    await _save(hass, DMX, "dmx_artnet.yaml", "artnet:\n")

    assert len(reload_calls) == 0
    assert len(restart_calls) == 0


async def test_each_panel_sees_only_its_own_config_subdirectory(hass):
    """A file saved through the DMX panel is invisible to the KNX panel."""
    register_dmx(hass)
    register_knx(hass)

    await _save(hass, DMX, "dmx_only.yaml", "a: 1\n")

    assert "dmx_only.yaml" in await _list(hass, DMX)
    assert "dmx_only.yaml" not in await _list(hass, KNX)
