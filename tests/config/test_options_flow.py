"""Toggling a protocol in the Options flow changes the enabled-protocol set.

Acceptance seam for issue #6: the Options flow exposes one enable toggle per
protocol (all default on), and a change to those toggles must change which
protocols the integration considers enabled — the same set that drives the
panel's tabs. Asserted at the options the flow stores and the `enabled_protocols`
derived set, never at internals.

The flow handler is driven directly (like the config-flow test) rather than
through `hass.config_entries.options`, because the options manager would set up
the entry — pulling in the heavy `frontend` dependency, which is intentionally
not a test dependency. Driving the handler keeps the test on the toggle logic,
hermetically.
"""

from homeassistant import data_entry_flow
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.woow_multi_protocol.config_flow import (
    WoowMultiProtocolOptionsFlow,
)
from custom_components.woow_multi_protocol.const import DOMAIN, enabled_protocols


def _entry(hass, options=None):
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Woow Multi-Protocol Connect",
        data={},
        options=options or {},
    )
    entry.add_to_hass(hass)
    return entry


def _flow(hass, entry):
    flow = WoowMultiProtocolOptionsFlow()
    flow.hass = hass
    flow.handler = entry.entry_id
    return flow


async def test_default_options_enable_every_protocol():
    """An entry with no options yet has all three protocols enabled."""
    assert enabled_protocols({}) == ["knx", "dmx", "modbus"]


async def test_init_step_shows_the_per_protocol_toggles(hass):
    """Opening options shows a form with a toggle for each protocol."""
    flow = _flow(hass, _entry(hass))

    result = await flow.async_step_init()

    assert result["type"] == data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "init"
    schema_keys = {str(marker) for marker in result["data_schema"].schema}
    assert schema_keys == {"enable_knx", "enable_dmx", "enable_modbus"}


async def test_disabling_knx_changes_the_enabled_protocol_set(hass):
    """Turning KNX off is stored and drops KNX from the enabled set."""
    flow = _flow(hass, _entry(hass))

    result = await flow.async_step_init(
        {"enable_knx": False, "enable_dmx": True, "enable_modbus": True}
    )

    assert result["type"] == data_entry_flow.FlowResultType.CREATE_ENTRY
    assert result["data"]["enable_knx"] is False
    assert enabled_protocols(result["data"]) == ["dmx", "modbus"]


async def test_reenabling_knx_restores_it(hass):
    """Starting from KNX disabled, turning it back on restores the full set."""
    flow = _flow(hass, _entry(hass, options={"enable_knx": False}))

    result = await flow.async_step_init(
        {"enable_knx": True, "enable_dmx": True, "enable_modbus": True}
    )

    assert enabled_protocols(result["data"]) == ["knx", "dmx", "modbus"]
