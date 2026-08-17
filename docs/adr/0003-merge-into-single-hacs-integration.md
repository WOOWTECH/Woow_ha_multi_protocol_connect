# ADR-0003: Merge the three protocol integrations into a single `woow_multi_protocol` HACS integration

- **Status:** Accepted
- **Date:** 2026-08-17
- **Applies to:** repository distribution; the new `custom_components/woow_multi_protocol/` (replacing `woow_knx`, `woow_dmx`, `woow_modbus`). Extends the "applies to" scope of [ADR-0001](0001-reject-dotdot-path-components.md) and [ADR-0002](0002-apply-reload-semantics.md) — their rules now live inside the single integration.

## Context

The repository ships **three separate Home Assistant integrations** —
`woow_knx`, `woow_dmx`, `woow_modbus` — each with its own domain, singleton
config flow, `brand/`, `manifest.json`, and a `panel_custom` frontend, plus a
fourth folder `custom_components/woow_panel_frontend/` that is **not** an
integration but a Lit + Rollup build workspace whose bundles are copied into each
integration's `frontend/`.

The goal is to make the project **installable via HACS**. HACS imposes two hard
structural rules (verified against hacs.xyz and the HACS integration source,
2026-08):

1. **One integration per repository** — *"There must only be one integration per
   repository, i.e. there can only be one subdirectory to
   `ROOT_OF_THE_REPO/custom_components/`."* A repo with multiple
   `custom_components/<domain>/` folders is **invalid**.
2. **One category per repository** — a repo is resolved under a single category
   (`integration`, `plugin`, …); it cannot be both an integration and a Lovelace
   plugin.

The current layout violates rule 1 (three integration folders + the frontend
workspace folder under `custom_components/`), so it cannot be installed by HACS
as-is.

Options considered:

- **A — Three published repos** (one per integration). Lowest code change, but
  three repos to maintain and three installs for the user.
- **B — Merge into one integration** with an internal protocol selector. One repo,
  one install, matches the "multi-protocol connect" product identity. Requires a
  real refactor.
- **C — Keep the monorepo, install as-is.** Not viable — rule 1 rejects it.

## Decision

Adopt **Option B**: collapse the three integrations into a single integration
`woow_multi_protocol`, distributed as a **HACS custom repository** (add-by-URL;
default-store listing is a later follow-up).

Concrete shape:

- **Domain / structure.** One domain `woow_multi_protocol` at
  `custom_components/woow_multi_protocol/`. The build workspace moves **out** of
  `custom_components/` to a repo-root `panel_frontend/`, so `custom_components/`
  holds exactly one subdirectory (rule 1). HACS installs only the domain folder,
  so `panel_frontend/` (and its `node_modules`) is naturally excluded from the
  payload.
- **Setup model.** A **single, singleton config entry**, plus an **Options flow**
  with three booleans — `enable_knx` / `enable_dmx` / `enable_modbus`, all
  defaulting to `true`. Updating options reloads the entry.
- **Frontend.** **One** `panel_custom` sidebar entry rendering a tabbed shell;
  the visible tabs equal the enabled protocols passed from the entry. Built from
  `panel_frontend/` and deployed into the domain's `frontend/`.
- **Services & sandbox.** A **single service set** —
  `woow_multi_protocol.{list_files, load_file, save_file, apply}` — each taking a
  required `protocol: knx|dmx|modbus` field, admin-gated, sandboxed to
  `<config>/woow_multi_protocol/<protocol>/`. The 7-layer path guard from
  [ADR-0001](0001-reject-dotdot-path-components.md) and the restart-averse `apply`
  contract from [ADR-0002](0002-apply-reload-semantics.md) are preserved, now
  keyed by `protocol` instead of by domain.
- **No migration (clean break).** HA has no clean cross-domain config-entry
  migration; the project is pre-public. Existing `woow_knx` / `woow_dmx` /
  `woow_modbus` installs must be removed and the new integration added. Documented,
  not automated.
- **Metadata.** `manifest.json`: `name: "Woow Multi-Protocol Connect"`,
  `domain: woow_multi_protocol`, `version: "3.0.0"` (breaking), `documentation`
  and `issue_tracker` pointed at this repository, `iot_class: calculated`,
  `dependencies: ["frontend", "http"]`, `codeowners: ["@woowtech"]`,
  `config_flow: true`. `hacs.json`:
  `{ "name": "...", "homeassistant": "2026.1.0", "render_readme": true, "content_in_root": false }`
  — **no** `zip_release` (HACS installs only the domain folder). A single in-repo
  `brand/icon.png` satisfies the custom-repo path (no `home-assistant/brands` PR
  required).
- **Physical-HA verification gate.** Before tagging the `v3.0.0` release, the
  merged integration is verified on a live HA (the 192.168.2.6 rig): integration
  load + hassfest, options→tab changes, unified panel + theme sync, services +
  sandbox isolation + admin gating, and a real HACS install. End-to-end against
  the three protocol simulators is an optional deeper tier. The in-repo live
  harness (`tests/live/live_enterprise.py`, `e2e-panels.sh`, theme-sync
  Playwright) is updated from three domains to the single domain + `protocol`
  parameter and the tabbed panel.

## Consequences

- **Positive:** The project becomes HACS-installable with a single custom-repo URL
  and one config entry; the unified tabbed panel matches the product identity;
  Options toggles give per-protocol opt-in without three separate installs.
- **Breaking change:** The domain rename invalidates existing `woow_*` config
  entries, services, and sandbox paths. This is intentional and gated behind the
  major version bump to `3.0.0`.
- **Main refactor risk:** Fusing three panel bundles into one tabbed shell is the
  largest work item and the primary regression surface (theme sync, per-protocol
  isolation, i18n). The updated live/Playwright suites exist to catch this.
- **Deferred:** A HACS **default-store** (searchable) listing is out of scope for
  now; it later requires passing `hacs/action` + `hassfest` with no ignores, a
  real GitHub release, and possibly a `home-assistant/brands` submission for the
  domain.
- **Uniformity preserved:** ADR-0001 and ADR-0002 continue to apply — their
  security and `apply` semantics are carried into the single integration,
  parameterized by `protocol`.
