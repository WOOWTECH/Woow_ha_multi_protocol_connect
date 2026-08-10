"""The Service layer confines every file operation to the Config subdirectory.

This is the security boundary described in ADR-0001: a caller must not be able
to read or write a file outside its Setup Guide panel's Config subdirectory.
"""

import os

from homeassistant.exceptions import HomeAssistantError
import pytest

from custom_components.woow_dmx.services import register_services

DOMAIN = "woow_dmx"

# Each of these must be refused before it reaches the filesystem. They cover the
# layers ADR-0001 lists: traversal, absolute paths, URL-encoded escapes, and the
# "..." collapse that a naive strip-based sanitizer would let through.
TRAVERSAL_PATHS = [
    "../escaped.yaml",
    "../../escaped.yaml",
    "subdir/../../escaped.yaml",
    "....//escaped.yaml",
    "/etc/passwd",
    "%2e%2e/escaped.yaml",
    "..\\escaped.yaml",
]


@pytest.mark.parametrize("path", TRAVERSAL_PATHS)
async def test_save_file_refuses_to_escape_the_config_subdirectory(
    hass, escape_target, path
):
    """A traversal path is refused and nothing is written outside the sandbox."""
    register_services(hass)

    with pytest.raises(HomeAssistantError):
        await hass.services.async_call(
            DOMAIN,
            "save_file",
            {"path": path, "content": "pwned: true\n"},
            blocking=True,
            return_response=True,
        )

    assert not os.path.exists(escape_target)


@pytest.mark.parametrize("path", TRAVERSAL_PATHS)
async def test_load_file_refuses_to_escape_the_config_subdirectory(hass, path):
    """A traversal path is refused before any file is read."""
    register_services(hass)

    with pytest.raises(HomeAssistantError):
        await hass.services.async_call(
            DOMAIN,
            "load_file",
            {"path": path},
            blocking=True,
            return_response=True,
        )


async def test_a_legitimate_nested_path_is_still_allowed(hass):
    """The sandbox restricts direction, not depth — nesting still works."""
    register_services(hass)

    await hass.services.async_call(
        DOMAIN,
        "save_file",
        {"path": "fixtures/hall.yaml", "content": "a: 1\n"},
        blocking=True,
        return_response=True,
    )

    result = await hass.services.async_call(
        DOMAIN,
        "load_file",
        {"path": "fixtures/hall.yaml"},
        blocking=True,
        return_response=True,
    )
    assert result["content"] == "a: 1\n"
