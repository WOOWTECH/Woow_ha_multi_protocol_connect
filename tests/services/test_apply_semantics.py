"""Apply reloads the Underlying integration and never restarts by default.

The decision under test is ADR-0002: an automated caller (ha_mcp_tools) must not
be able to restart Home Assistant unintentionally.
"""

from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.woow_dmx.services import register_services

DOMAIN = "woow_dmx"
UNDERLYING = "artnet"


async def _apply(hass, **data):
    return await hass.services.async_call(
        DOMAIN, "apply", data, blocking=True, return_response=True
    )


async def test_apply_reloads_when_underlying_integration_supports_it(hass):
    """When the Underlying integration has a reload service, Apply calls it."""
    register_services(hass)
    reload_calls = async_mock_service(hass, UNDERLYING, "reload")
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass)

    assert len(reload_calls) == 1
    assert len(restart_calls) == 0
    assert result["reloaded"] is True
    assert result["restart_required"] is False
    assert result["underlying_domain"] == UNDERLYING


async def test_apply_does_not_restart_when_reload_is_unavailable(hass):
    """Without a reload service, Apply reports the need but does not restart."""
    register_services(hass)
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass)

    assert len(restart_calls) == 0
    assert result["reloaded"] is False
    assert result["restart_required"] is True
    assert result["restarting"] is False


async def test_apply_restarts_only_when_force_restart_is_requested(hass):
    """force_restart is the single opt-in that permits a restart."""
    register_services(hass)
    restart_calls = async_mock_service(hass, "homeassistant", "restart")

    result = await _apply(hass, force_restart=True)

    assert len(restart_calls) == 1
    assert result["reloaded"] is False
    assert result["restart_required"] is True
    assert result["restarting"] is True


async def test_apply_returns_the_same_keys_on_every_branch(hass):
    """The response contract is stable, so a caller needs no presence checks."""
    register_services(hass)
    async_mock_service(hass, "homeassistant", "restart")
    expected = {"reloaded", "restart_required", "restarting", "underlying_domain"}

    no_reload = await _apply(hass)
    forced = await _apply(hass, force_restart=True)
    async_mock_service(hass, UNDERLYING, "reload")
    reloaded = await _apply(hass)

    assert set(no_reload) == expected
    assert set(forced) == expected
    assert set(reloaded) == expected
