"""File operations round-trip, and saving never applies.

A caller composes save x N then Apply x 1, so save_file must not reload the
underlying integration on its own. Each protocol also stays inside its own
sandbox subdirectory, so one protocol's files are invisible to another's.
"""

import pytest
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.woow_multi_protocol.const import PROTOCOLS, UNDERLYING_DOMAIN
from custom_components.woow_multi_protocol.services import register_services

DOMAIN = "woow_multi_protocol"


async def _save(hass, protocol, path, content):
    return await hass.services.async_call(
        DOMAIN,
        "save_file",
        {"protocol": protocol, "path": path, "content": content},
        blocking=True,
        return_response=True,
    )


async def _load(hass, protocol, path):
    return await hass.services.async_call(
        DOMAIN,
        "load_file",
        {"protocol": protocol, "path": path},
        blocking=True,
        return_response=True,
    )


async def _list(hass, protocol):
    result = await hass.services.async_call(
        DOMAIN,
        "list_files",
        {"protocol": protocol},
        blocking=True,
        return_response=True,
    )
    return result["files"]


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_saved_content_is_read_back_unchanged(hass, protocol):
    """A file written through the Service layer reads back byte-identical."""
    register_services(hass)
    content = "some:\n  key: value\n"

    save_result = await _save(hass, protocol, f"{protocol}_main.yaml", content)
    load_result = await _load(hass, protocol, f"{protocol}_main.yaml")

    assert save_result["success"] is True
    assert load_result["content"] == content


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_saved_file_appears_in_the_listing(hass, protocol):
    """list_files sees what save_file wrote."""
    register_services(hass)

    await _save(hass, protocol, f"{protocol}_scenes.yaml", "scenes: []\n")

    assert f"{protocol}_scenes.yaml" in await _list(hass, protocol)


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_save_does_not_apply(hass, protocol):
    """save_file writes only — it never reloads the underlying integration."""
    register_services(hass)
    reload_calls = async_mock_service(hass, UNDERLYING_DOMAIN[protocol], "reload")
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    await _save(hass, protocol, f"{protocol}_main.yaml", "a: 1\n")

    assert len(reload_calls) == 0
    assert len(restart_calls) == 0


async def test_each_protocol_sees_only_its_own_sandbox(hass):
    """A file saved under one protocol is invisible to the others."""
    register_services(hass)

    await _save(hass, "knx", "shared_name.yaml", "a: 1\n")

    assert "shared_name.yaml" in await _list(hass, "knx")
    assert "shared_name.yaml" not in await _list(hass, "dmx")
    assert "shared_name.yaml" not in await _list(hass, "modbus")
