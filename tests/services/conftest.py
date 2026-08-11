"""Fixtures for the Service layer tests.

These tests exercise the Service layer at its public seam — a Home Assistant
service call — which is the same interface ha_mcp_tools uses. Services are
registered directly rather than via async_setup_entry, so the tests stay about
the Service layer and do not drag in panel/static-path registration.
"""

import os
import shutil

import pytest

# The test config dir is shared (it lives inside the installed test plugin), so
# these tests must leave it exactly as they found it.
CONFIG_SUBDIRS = ("dmx", "knx", "modbus")


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow custom_components to be loaded in tests."""
    yield


@pytest.fixture(autouse=True)
def clean_config_subdirs(hass):
    """Give every test an empty Config subdirectory and leave none behind.

    Without this, files written by one test leak into the next (and into the
    installed package), which makes the sandbox assertions depend on run order.
    """

    def _purge():
        for subdir in CONFIG_SUBDIRS:
            shutil.rmtree(hass.config.path(subdir), ignore_errors=True)

    _purge()
    yield
    _purge()


@pytest.fixture
def escape_target(hass):
    """A path just outside the Config subdirectory, guaranteed absent.

    Yields the absolute path a traversal attempt would land on, and removes it
    afterwards so a regression cannot silently poison later runs.
    """
    target = hass.config.path("escaped.yaml")
    if os.path.exists(target):
        os.unlink(target)
    yield target
    if os.path.exists(target):
        os.unlink(target)
