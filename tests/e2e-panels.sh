#!/usr/bin/env bash
# ============================================================
# E2E Panel Test — Woow Multi-Protocol Connect (merged panel)
# Uses: npx playwright-cli
# Requires: HA container running (default http://localhost:8123)
# Supports: English and zh-Hant HA language settings
#
# The merged integration ships ONE sidebar panel at /woow_multi_protocol
# whose tabs are the enabled protocols (KNX / DMX / Modbus). Each protocol
# tab hosts the shared Setup-Guide + Editor panel. This suite loads the one
# panel, checks the shell (title + protocol tabs), then walks each protocol
# tab verifying its guide and editor render. Theme sync is covered separately
# by the Playwright suite in tests/theme-sync/.
# ============================================================
set -o pipefail

HA_URL="${HA_URL:-http://localhost:8123}"
HA_USER="${HA_USER:-admin}"
HA_PASS="${HA_PASS:-admin}"

# The one panel, and the protocol tabs it exposes (order = tab order).
PANEL_URL="/woow_multi_protocol"
PANEL_TITLE="Woow Multi-Protocol Connect"   # shell top-bar title (not translated)
PROTOCOLS=("knx" "dmx" "modbus")

declare -A PROTO_TAB PROTO_DOC PROTO_INFO
PROTO_TAB[knx]="KNX"
PROTO_TAB[dmx]="DMX"
PROTO_TAB[modbus]="Modbus"

# First guide-step link per protocol (the official-docs URL).
PROTO_DOC[knx]="home-assistant.io/integrations/knx"
PROTO_DOC[dmx]="github.com/Breina/ha-artnet-led"
PROTO_DOC[modbus]="home-assistant.io/integrations/modbus"

# A keyword that appears in each protocol's guide/info content.
PROTO_INFO[knx]="KNX"
PROTO_INFO[dmx]="Art-Net"
PROTO_INFO[modbus]="Modbus"

# The Woow AI blog link is shared across protocols (guide step 2).
WOOW_LINK="aiot.woowtech.io/blog"

# --- Language-dependent strings (detected at runtime) ---
LANG_MODE=""  # "en" or "zh"
TAB_GUIDE=""
TAB_EDITOR=""
STR_CONNECTED=""
STR_NEW_BTN=""
STR_SAVE_BTN=""
STR_REFRESH_TITLE=""
STR_SELECT_PLACEHOLDER=""

set_lang() {
  if [[ "$1" == "zh" ]]; then
    LANG_MODE="zh"
    TAB_GUIDE="設定指南"
    TAB_EDITOR="編輯器 & 系統"
    STR_CONNECTED="已連線"
    STR_NEW_BTN="新增"
    STR_SAVE_BTN="儲存"
    STR_REFRESH_TITLE="重新整理檔案清單"
    STR_SELECT_PLACEHOLDER="選擇檔案"
  else
    LANG_MODE="en"
    TAB_GUIDE="Setup Guide"
    TAB_EDITOR="Editor & System"
    STR_CONNECTED="Connected"
    STR_NEW_BTN="New"
    STR_SAVE_BTN="Save"
    STR_REFRESH_TITLE="Refresh file list"
    STR_SELECT_PLACEHOLDER="Select File"
  fi
}

# --- Counters ---
TOTAL_PASS=0
TOTAL_FAIL=0
declare -A PROTO_PASS PROTO_FAIL
FAILURES=()

# --- Helpers ---
cli() {
  npx playwright-cli "$@" 2>&1
}

# Wait for the panel shell to render (its title appears in the a11y tree).
wait_panel_ready() {
  local marker="$1"
  local retries=0
  while [[ $retries -lt 10 ]]; do
    if cli snapshot 2>/dev/null | grep -qF "$marker"; then
      return 0
    fi
    retries=$((retries + 1))
    sleep 1
  done
  return 1
}

snapshot() {
  local out
  out=$(cli snapshot 2>&1)
  local snap_file
  snap_file=$(echo "$out" | grep -oP '\[Snapshot\]\(\K[^)]+\.yml' | head -1)
  if [[ -n "$snap_file" ]]; then
    if [[ -f "$snap_file" ]]; then
      echo "$out"; cat "$snap_file"
    elif [[ -f "$PWD/$snap_file" ]]; then
      echo "$out"; cat "$PWD/$snap_file"
    else
      echo "$out"
    fi
  else
    echo "$out"
  fi
}

pass() {
  local scope="$1" id="$2" msg="$3"
  TOTAL_PASS=$((TOTAL_PASS + 1))
  PROTO_PASS[$scope]=$(( ${PROTO_PASS[$scope]:-0} + 1 ))
  echo "  [PASS] $id: $msg"
}

fail() {
  local scope="$1" id="$2" msg="$3"
  TOTAL_FAIL=$((TOTAL_FAIL + 1))
  PROTO_FAIL[$scope]=$(( ${PROTO_FAIL[$scope]:-0} + 1 ))
  FAILURES+=("[$scope] $id: $msg")
  echo "  [FAIL] $id: $msg"
}

assert_contains() {
  local scope="$1" id="$2" text="$3" haystack="$4" msg="$5"
  if printf '%s\n' "$haystack" | grep -qF "$text"; then
    pass "$scope" "$id" "$msg"
  else
    fail "$scope" "$id" "$msg (expected: '$text')"
  fi
}

assert_not_contains() {
  local scope="$1" id="$2" text="$3" haystack="$4" msg="$5"
  if printf '%s\n' "$haystack" | grep -qF "$text"; then
    fail "$scope" "$id" "$msg (found: '$text')"
  else
    pass "$scope" "$id" "$msg"
  fi
}

assert_regex() {
  local scope="$1" id="$2" pattern="$3" haystack="$4" msg="$5"
  if printf '%s\n' "$haystack" | grep -qE "$pattern"; then
    pass "$scope" "$id" "$msg"
  else
    fail "$scope" "$id" "$msg (pattern: '$pattern')"
  fi
}

# Current page path (language-agnostic; used to detect the login redirect).
current_path() {
  cli eval "() => location.pathname" 2>/dev/null | grep -oE '/[A-Za-z0-9._/-]*' | head -1
}

# --- Login ---
# Language-agnostic: HA's login inputs carry stable name attributes
# (username/password) regardless of UI language, and Enter submits the form —
# so this works on an English or a Traditional-Chinese instance alike.
login() {
  echo "=== Opening browser and logging in ==="
  cli open "$HA_URL" >/dev/null
  sleep 3

  local path
  path=$(current_path)
  if [[ "$path" != /auth/* ]]; then
    echo "  Already authenticated ($path)"
    return 0
  fi

  cli fill "input[name=username]" "$HA_USER" >/dev/null 2>&1
  cli fill "input[name=password]" "$HA_PASS" >/dev/null 2>&1
  cli press Enter >/dev/null 2>&1
  sleep 4

  path=$(current_path)
  if [[ "$path" == /auth/* ]]; then
    echo "ERROR: still on the login page after submit"
    exit 2
  fi
  echo "  Logged in ($path)"
}

# --- Language detection ---
detect_language() {
  local snap="$1"
  if echo "$snap" | grep -qF "設定指南"; then
    set_lang "zh"
  else
    set_lang "en"
  fi
  echo "  Detected language: $LANG_MODE"
}

# --- Navigate to the single panel ---
open_panel() {
  cli goto "${HA_URL}${PANEL_URL}" >/dev/null
  sleep 3
  wait_panel_ready "$PANEL_TITLE" || true
}

# --- Click a protocol tab by its label ---
# The protocol tabs carry role="tab", so the accessibility tree exposes them as
# `tab "KNX"` (not `button "KNX"`); accept either to stay robust.
click_proto_tab() {
  local label="$1"
  local snap ref
  snap=$(snapshot)
  # The active tab carries an extra attribute (`[selected]`) between the name
  # and its ref, so allow anything up to `[ref=`.
  ref=$(echo "$snap" | grep -oP "(?:tab|button) \"$label\".*?\\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$ref" ]]; then
    cli click "$ref" >/dev/null
    sleep 2
    return 0
  fi
  return 1
}

# --- Click an inner tab (Setup Guide / Editor & System) ---
click_inner_tab() {
  local label="$1"
  local snap ref
  snap=$(snapshot)
  ref=$(echo "$snap" | grep -oP "button \"$label\".*?\\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$ref" ]]; then
    cli click "$ref" >/dev/null
    sleep 1
    return 0
  fi
  return 1
}

# --- Test groups ---

test_shell() {
  echo "  --- T1: Panel Shell ---"
  local scope="shell"

  local console_out errors
  console_out=$(cli console)
  errors=$(echo "$console_out" | grep -oP 'Errors: \K[0-9]+' || echo "0")
  if [[ "$errors" -eq 0 ]]; then
    pass "$scope" "T1.1" "Zero console errors"
  else
    fail "$scope" "T1.1" "Console errors present ($errors)"
  fi

  local snap
  snap=$(snapshot)
  assert_not_contains "$scope" "T1.2" "404" "$snap" "Page does not show 404"
  assert_contains "$scope" "T1.3" "$PANEL_TITLE" "$snap" "Shell top-bar title rendered"

  # All three protocol tabs present in the shell tab strip. They carry
  # role="tab", so the accessibility tree names them `tab "KNX"` etc.
  for p in "${PROTOCOLS[@]}"; do
    assert_regex "$scope" "T1.4-$p" "(tab|button) \"${PROTO_TAB[$p]}\"" "$snap" \
      "Protocol tab present: ${PROTO_TAB[$p]}"
  done

  # No iframe — the merged panel is a native custom element.
  assert_not_contains "$scope" "T1.5" "iframe" "$snap" "No iframe in the merged panel"
}

test_protocol_tab() {
  local p="$1"
  echo "  --- T2/$p: Protocol Tab '${PROTO_TAB[$p]}' ---"
  local scope="$p"
  PROTO_PASS[$p]=${PROTO_PASS[$p]:-0}
  PROTO_FAIL[$p]=${PROTO_FAIL[$p]:-0}

  if ! click_proto_tab "${PROTO_TAB[$p]}"; then
    fail "$scope" "T2.0" "Could not find/click protocol tab ${PROTO_TAB[$p]}"
    return
  fi

  # Guide tab is the default inner tab — ensure we're on it.
  click_inner_tab "$TAB_GUIDE" || true
  local snap
  snap=$(snapshot)

  # Inner tabs present
  assert_regex "$scope" "T2.1" "button \"$TAB_GUIDE\"" "$snap" "Guide inner-tab present"
  assert_regex "$scope" "T2.2" "button \"$TAB_EDITOR\"" "$snap" "Editor inner-tab present"

  # Guide content: protocol-specific docs link + shared Woow blog link
  assert_contains "$scope" "T2.3" "${PROTO_DOC[$p]}" "$snap" "Official docs link correct"
  assert_contains "$scope" "T2.4" "$WOOW_LINK" "$snap" "Woow AI blog link present"
  assert_contains "$scope" "T2.5" "${PROTO_INFO[$p]}" "$snap" "Guide mentions protocol keyword"

  # Editor tab: file dropdown + connected status
  if click_inner_tab "$TAB_EDITOR"; then
    sleep 1
    snap=$(snapshot)
    assert_regex "$scope" "T2.6" "combobox" "$snap" "Editor shows file dropdown"
    assert_regex "$scope" "T2.7" "textbox" "$snap" "Editor textarea present"
    assert_contains "$scope" "T2.8" "$STR_CONNECTED" "$snap" "Editor status shows connected"
    assert_regex "$scope" "T2.9" "button.*$STR_SAVE_BTN" "$snap" "Save button present"
  else
    fail "$scope" "T2.6" "Could not switch to editor inner-tab"
  fi
}

test_tab_persistence() {
  echo "  --- T3: Tab Switching Preserves Panes ---"
  local scope="switch"

  # Switch across all protocol tabs, then back to the first — each should
  # still render its inner tabs (panes stay mounted).
  for p in "${PROTOCOLS[@]}"; do
    if click_proto_tab "${PROTO_TAB[$p]}"; then
      local snap
      snap=$(snapshot)
      assert_regex "$scope" "T3-$p" "button \"$TAB_GUIDE\"|button \"$TAB_EDITOR\"" "$snap" \
        "Pane renders after switching to ${PROTO_TAB[$p]}"
    else
      fail "$scope" "T3-$p" "Could not switch to ${PROTO_TAB[$p]}"
    fi
  done
}

# --- Summary ---
print_summary() {
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║      Woow Multi-Protocol Panel — E2E Results     ║"
  echo "╠══════════════╦════════╦════════╦═════════════════╣"
  printf "║ %-12s ║ %-6s ║ %-6s ║ %-15s ║\n" "Scope" "Pass" "Fail" "Status"
  echo "╠══════════════╬════════╬════════╬═════════════════╣"
  for scope in shell "${PROTOCOLS[@]}" switch; do
    local status="PASS"
    [[ ${PROTO_FAIL[$scope]:-0} -gt 0 ]] && status="FAIL"
    printf "║ %-12s ║ %-6s ║ %-6s ║ %-15s ║\n" \
      "$scope" "${PROTO_PASS[$scope]:-0}" "${PROTO_FAIL[$scope]:-0}" "$status"
  done
  echo "╠══════════════╬════════╬════════╬═════════════════╣"
  local total_status="ALL PASS"
  [[ $TOTAL_FAIL -gt 0 ]] && total_status="FAILURES: $TOTAL_FAIL"
  printf "║ %-12s ║ %-6s ║ %-6s ║ %-15s ║\n" "TOTAL" "$TOTAL_PASS" "$TOTAL_FAIL" "$total_status"
  echo "╚══════════════╩════════╩════════╩═════════════════╝"
  echo "  Language detected: $LANG_MODE"

  if [[ ${#FAILURES[@]} -gt 0 ]]; then
    echo ""
    echo "Failed tests:"
    for f in "${FAILURES[@]}"; do
      echo "  - $f"
    done
  fi
}

# --- Main ---
main() {
  echo "E2E Panel Test — Woow Multi-Protocol Connect — $(date)"
  echo "Target: $HA_URL"
  echo ""

  if ! curl -sf -o /dev/null "$HA_URL"; then
    echo "ERROR: HA not reachable at $HA_URL"
    exit 2
  fi

  login
  open_panel

  local load_snap
  load_snap=$(snapshot)
  detect_language "$load_snap"

  test_shell
  for p in "${PROTOCOLS[@]}"; do
    test_protocol_tab "$p"
  done
  test_tab_persistence

  cli close >/dev/null 2>&1

  print_summary

  [[ $TOTAL_FAIL -eq 0 ]] && exit 0 || exit 1
}

main "$@"
