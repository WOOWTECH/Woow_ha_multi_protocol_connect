"""Service layer for Woow Modbus Setup Guide.

Exposes the panel's sandboxed file operations (list/load/save) plus an ``apply``
service as Home Assistant services, so callers that speak the service API
(e.g. ha_mcp_tools via ha_call_service) can drive the panel — the WebSocket API
is not reachable that way.

Self-contained by design (see ADR: per-component duplication): reuses the file
helpers from this component's own ``__init__`` and imports nothing from sibling
components, so the component stays independently installable.
"""

import logging
import os

from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
)
from homeassistant.exceptions import HomeAssistantError, Unauthorized
import voluptuous as vol

from . import (
    _ALLOWED_EXT,
    _is_safe_path,
    _list_files,
    _read_file,
    _sanitize_path,
    _write_file,
)
from .const import CONFIG_SUBDIR, DOMAIN

_LOGGER = logging.getLogger(__name__)

# The stock/HACS integration that actually consumes the YAML this panel edits.
# ``apply`` reloads THIS domain, never the Setup Guide panel itself. See ADR-0002.
UNDERLYING_DOMAIN = "modbus"

SERVICE_LIST_FILES = "list_files"
SERVICE_LOAD_FILE = "load_file"
SERVICE_SAVE_FILE = "save_file"
SERVICE_APPLY = "apply"

_LIST_FILES_SCHEMA = vol.Schema(
    {
        vol.Optional("ext", default="yaml"): str,
        vol.Optional("depth", default=10): vol.All(int, vol.Range(min=1, max=25)),
    }
)

_LOAD_FILE_SCHEMA = vol.Schema({vol.Required("path"): str})

_SAVE_FILE_SCHEMA = vol.Schema(
    {vol.Required("path"): str, vol.Required("content"): str}
)

_APPLY_SCHEMA = vol.Schema({vol.Optional("force_restart", default=False): bool})


async def _async_reject_non_admin(hass: HomeAssistant, call: ServiceCall) -> None:
    """Mirror the WebSocket @require_admin gate.

    If the call carries a user context, that user must be an admin. Calls with no
    user context (internal automations, MCP long-lived admin token) are allowed —
    the path sanitizer still confines every file op regardless.
    """
    if call.context.user_id is None:
        return
    user = await hass.auth.async_get_user(call.context.user_id)
    if user is None or not user.is_admin:
        raise Unauthorized(context=call.context)


def _scoped_dir(hass: HomeAssistant) -> str:
    """Absolute path of this component's sandboxed config subdirectory."""
    return os.path.join(hass.config.path(), CONFIG_SUBDIR)


def _resolve_scoped_path(hass: HomeAssistant, raw: str) -> tuple[str, str]:
    """Sanitize a caller-supplied path and confine it to the config subdirectory.

    Single home for the ADR-0001 two-layer check, so load and save cannot drift
    apart. Returns ``(relative_path, absolute_path)``; raises if either layer
    rejects the input.
    """
    raw_path = _sanitize_path(raw)
    if not raw_path:
        raise HomeAssistantError("Invalid or empty path")
    scoped = _scoped_dir(hass)
    full_path = os.path.join(scoped, raw_path)
    if not _is_safe_path(full_path, scoped):
        raise HomeAssistantError(f"Path outside {CONFIG_SUBDIR}/ directory")
    return raw_path, full_path


async def _handle_list_files(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    await _async_reject_non_admin(hass, call)
    ext = call.data["ext"]
    if ext not in _ALLOWED_EXT and ext != "all":
        ext = "yaml"
    try:
        files = await hass.async_add_executor_job(
            _list_files, _scoped_dir(hass), ext, call.data["depth"]
        )
    except Exception as err:  # noqa: BLE001 - surfaced to caller as a service error
        _LOGGER.exception("list_files failed")
        raise HomeAssistantError(f"list_files failed: {err}") from err
    return {"files": files}


async def _handle_load_file(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    await _async_reject_non_admin(hass, call)
    raw_path, full_path = _resolve_scoped_path(hass, call.data["path"])
    try:
        content = await hass.async_add_executor_job(_read_file, full_path)
    except FileNotFoundError as err:
        raise HomeAssistantError(f"File not found: {raw_path}") from err
    except UnicodeDecodeError as err:
        raise HomeAssistantError(f"Cannot read (not UTF-8): {raw_path}") from err
    except Exception as err:  # noqa: BLE001
        _LOGGER.exception("load_file failed: %s", raw_path)
        raise HomeAssistantError(f"load_file failed: {err}") from err
    return {"content": content, "path": raw_path}


async def _handle_save_file(call: ServiceCall) -> ServiceResponse:
    hass = call.hass
    await _async_reject_non_admin(hass, call)
    raw_path, full_path = _resolve_scoped_path(hass, call.data["path"])
    content = call.data["content"]
    try:
        orig = None
        if os.path.exists(full_path):
            orig = os.stat(full_path)
        await hass.async_add_executor_job(_write_file, full_path, content, orig)
    except Exception as err:  # noqa: BLE001
        _LOGGER.exception("save_file failed: %s/%s", CONFIG_SUBDIR, raw_path)
        raise HomeAssistantError(f"save_file failed: {err}") from err
    _LOGGER.info("Saved file via service: %s/%s", CONFIG_SUBDIR, raw_path)
    # save_file writes only; it never applies. Callers compose save x N -> apply x 1.
    return {"success": True, "path": raw_path}


async def _handle_apply(call: ServiceCall) -> ServiceResponse:
    """Make saved config live by reloading the underlying integration.

    Runtime-introspective and restart-averse — see ADR-0002. Never restarts HA
    unless the caller explicitly passes ``force_restart: true``.
    """
    hass = call.hass
    await _async_reject_non_admin(hass, call)

    if hass.services.has_service(UNDERLYING_DOMAIN, "reload"):
        try:
            await hass.services.async_call(
                UNDERLYING_DOMAIN, "reload", blocking=True, context=call.context
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.exception("apply: %s.reload failed", UNDERLYING_DOMAIN)
            raise HomeAssistantError(
                f"{UNDERLYING_DOMAIN}.reload failed: {err}"
            ) from err
        return {
            "reloaded": True,
            "restart_required": False,
            "restarting": False,
            "underlying_domain": UNDERLYING_DOMAIN,
        }

    if call.data["force_restart"]:
        _LOGGER.warning(
            "apply: %s has no reload service; force_restart requested — restarting HA",
            UNDERLYING_DOMAIN,
        )
        await hass.services.async_call(
            "homeassistant", "restart", blocking=False, context=call.context
        )
        return {
            "reloaded": False,
            "restart_required": True,
            "restarting": True,
            "underlying_domain": UNDERLYING_DOMAIN,
        }

    return {
        "reloaded": False,
        "restart_required": True,
        "restarting": False,
        "underlying_domain": UNDERLYING_DOMAIN,
    }


def register_services(hass: HomeAssistant) -> None:
    """Register the Modbus service layer (idempotent)."""
    if hass.services.has_service(DOMAIN, SERVICE_LIST_FILES):
        return
    hass.services.async_register(
        DOMAIN, SERVICE_LIST_FILES, _handle_list_files,
        schema=_LIST_FILES_SCHEMA, supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_LOAD_FILE, _handle_load_file,
        schema=_LOAD_FILE_SCHEMA, supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SAVE_FILE, _handle_save_file,
        schema=_SAVE_FILE_SCHEMA, supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_APPLY, _handle_apply,
        schema=_APPLY_SCHEMA, supports_response=SupportsResponse.OPTIONAL,
    )
    _LOGGER.info("Woow Modbus service layer registered")


def unregister_services(hass: HomeAssistant) -> None:
    """Remove the Modbus service layer."""
    for service in (
        SERVICE_LIST_FILES, SERVICE_LOAD_FILE, SERVICE_SAVE_FILE, SERVICE_APPLY,
    ):
        hass.services.async_remove(DOMAIN, service)
