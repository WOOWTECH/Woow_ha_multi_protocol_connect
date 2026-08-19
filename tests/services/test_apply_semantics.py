"""Apply reloads the underlying integration and never restarts by default.

The decision under test is ADR-0002: an automated caller (ha_mcp_tools) must not
be able to restart Home Assistant unintentionally. Apply targets each protocol's
own underlying integration (knx / artnet / modbus), so the contract is verified
across every protocol.
"""

import pytest
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.woow_multi_protocol.const import PROTOCOLS, UNDERLYING_DOMAIN
from custom_components.woow_multi_protocol.services import register_services

DOMAIN = "woow_multi_protocol"
EXPECTED_KEYS = {"reloaded", "restart_required", "restarting", "underlying_domain"}


async def _apply(hass, protocol, **data):
    return await hass.services.async_call(
        DOMAIN,
        "apply",
        {"protocol": protocol, **data},
        blocking=True,
        return_response=True,
    )


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_apply_reloads_when_underlying_integration_supports_it(hass, protocol):
    """When the underlying integration has a reload service, Apply calls it."""
    register_services(hass)
    underlying = UNDERLYING_DOMAIN[protocol]
    reload_calls = async_mock_service(hass, underlying, "reload")
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass, protocol)

    assert len(reload_calls) == 1
    assert len(restart_calls) == 0
    assert result["reloaded"] is True
    assert result["restart_required"] is False
    assert result["underlying_domain"] == underlying


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_apply_does_not_restart_when_reload_is_unavailable(hass, protocol):
    """Without a reload service, Apply reports the need but does not restart."""
    register_services(hass)
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass, protocol)

    assert len(restart_calls) == 0
    assert result["reloaded"] is False
    assert result["restart_required"] is True
    assert result["restarting"] is False


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_apply_restarts_only_when_force_restart_is_requested(hass, protocol):
    """force_restart is the single opt-in that permits a restart."""
    register_services(hass)
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass, protocol, force_restart=True)

    assert len(restart_calls) == 1
    assert result["reloaded"] is False
    assert result["restart_required"] is True
    assert result["restarting"] is True


@pytest.mark.parametrize("protocol", PROTOCOLS)
async def test_apply_returns_the_same_keys_on_every_branch(hass, protocol):
    """The response contract is stable, so a caller needs no presence checks."""
    register_services(hass)
    async_mock_service(hass, "homeassistant", "restart")

    no_reload = await _apply(hass, protocol)
    forced = await _apply(hass, protocol, force_restart=True)
    async_mock_service(hass, UNDERLYING_DOMAIN[protocol], "reload")
    reloaded = await _apply(hass, protocol)

    assert set(no_reload) == EXPECTED_KEYS
    assert set(forced) == EXPECTED_KEYS
    assert set(reloaded) == EXPECTED_KEYS
