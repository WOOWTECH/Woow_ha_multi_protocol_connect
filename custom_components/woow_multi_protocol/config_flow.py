"""Config flow for the Woow Multi-Protocol Connect integration.

A single, singleton entry: the first user step creates it; any later attempt
aborts as already-configured. The per-protocol enable toggles (Options flow)
arrive in a later issue — issue #5 is the scaffold.
"""

from homeassistant import config_entries

from .const import DOMAIN, PANEL_TITLE


class WoowMultiProtocolConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a singleton config flow for Woow Multi-Protocol Connect."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step; only one entry is ever created."""
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        if user_input is not None:
            return self.async_create_entry(title=PANEL_TITLE, data={})

        return self.async_show_form(step_id="user", data_schema=None)
