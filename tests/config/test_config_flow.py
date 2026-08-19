"""The config flow creates a single, singleton entry.

Issue #5 requires one singleton config entry: the first user step shows a form
and creates the entry; any later attempt aborts as already-configured.

The flow handler is driven directly rather than through
`hass.config_entries.flow`, because the flow manager would try to set up the
`frontend` dependency at flow-init — and the heavy `home-assistant-frontend`
package is intentionally not a test dependency. Driving the handler keeps the
test on the singleton decision logic, hermetically.
"""

from homeassistant import config_entries, data_entry_flow
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.woow_multi_protocol.config_flow import WoowMultiProtocolConfigFlow
from custom_components.woow_multi_protocol.const import DOMAIN


def _flow(hass):
    flow = WoowMultiProtocolConfigFlow()
    flow.hass = hass
    flow.handler = DOMAIN
    flow.flow_id = "test"
    flow.context = {"source": config_entries.SOURCE_USER}
    return flow


async def test_user_step_shows_form_then_creates_entry(hass):
    """With no existing entry, the user step shows a form then creates one."""
    flow = _flow(hass)

    form = await flow.async_step_user()
    assert form["type"] == data_entry_flow.FlowResultType.FORM
    assert form["step_id"] == "user"

    created = await flow.async_step_user({})
    assert created["type"] == data_entry_flow.FlowResultType.CREATE_ENTRY
    assert created["title"] == "Woow Multi-Protocol Connect"


async def test_second_entry_is_rejected(hass):
    """When an entry already exists, the user step aborts as a singleton."""
    MockConfigEntry(domain=DOMAIN, title="Woow Multi-Protocol Connect").add_to_hass(hass)

    result = await _flow(hass).async_step_user()
    assert result["type"] == data_entry_flow.FlowResultType.ABORT
    assert result["reason"] == "already_configured"
