"""The Service layer mirrors the WebSocket admin gate.

A call that carries a user context must come from an admin. Calls with no user
context (internal automations, the MCP long-lived admin token) stay allowed.
"""

from homeassistant.core import Context
from homeassistant.exceptions import Unauthorized
import pytest
from pytest_homeassistant_custom_component.common import MockUser

from custom_components.woow_dmx.services import register_services

DOMAIN = "woow_dmx"


async def test_non_admin_user_is_refused(hass):
    """A non-admin caller cannot reach the file operations."""
    register_services(hass)
    user = MockUser(groups=[])  # no admin group -> not an admin
    user.add_to_hass(hass)
    assert not user.is_admin

    with pytest.raises(Unauthorized):
        await hass.services.async_call(
            DOMAIN,
            "list_files",
            {},
            blocking=True,
            return_response=True,
            context=Context(user_id=user.id),
        )


async def test_admin_user_is_allowed(hass, hass_admin_user):
    """An admin caller reaches the file operations."""
    register_services(hass)

    result = await hass.services.async_call(
        DOMAIN,
        "list_files",
        {},
        blocking=True,
        return_response=True,
        context=Context(user_id=hass_admin_user.id),
    )

    assert "files" in result


async def test_call_without_user_context_is_allowed(hass):
    """Internal calls carry no user context and stay allowed."""
    register_services(hass)

    result = await hass.services.async_call(
        DOMAIN, "list_files", {}, blocking=True, return_response=True
    )

    assert "files" in result
