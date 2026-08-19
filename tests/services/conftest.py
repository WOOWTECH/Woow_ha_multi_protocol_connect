"""Fixtures for the Service layer tests.

These tests exercise the Service layer at its public seam — a Home Assistant
service call — which is the same interface ha_mcp_tools uses. Services are
registered directly rather than via async_setup_entry, so the tests stay about
the Service layer and do not drag in panel/static-path registration.

The single service set is keyed by ``protocol``; every filesystem effect lands
under ``<config>/woow_multi_protocol/<protocol>/``.
"""

import os
import shutil

import pytest

from custom_components.woow_multi_protocol.const import BASE_SUBDIR


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Allow custom_components to be loaded in tests."""
    yield


@pytest.fixture(autouse=True)
def clean_config_subdirs(hass):
    """Give every test an empty sandbox tree and leave none behind.

    Without this, files written by one test leak into the next (and into the
    installed package), which makes the sandbox assertions depend on run order.
    """

    def _purge():
        shutil.rmtree(hass.config.path(BASE_SUBDIR), ignore_errors=True)

    _purge()
    yield
    _purge()


@pytest.fixture
def escape_target(hass):
    """Paths a traversal attempt could land on, guaranteed absent.

    Yields the two absolute paths outside a protocol's sandbox that a ``..``
    escape would reach — the config root and the shared domain directory — and
    removes them afterwards so a regression cannot silently poison later runs.
    """
    targets = [
        hass.config.path("escaped.yaml"),
        hass.config.path(BASE_SUBDIR, "escaped.yaml"),
    ]

    def _purge():
        for target in targets:
            if os.path.exists(target):
                os.unlink(target)

    _purge()
    yield targets
    _purge()
