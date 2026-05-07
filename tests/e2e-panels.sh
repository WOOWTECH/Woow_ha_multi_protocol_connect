#!/usr/bin/env bash
# ============================================================
# E2E Panel Tests — Functional tests for KNX/DMX/Modbus panels
# Uses: npx playwright-cli
# Requires: HA container running at localhost:8123
# Supports: English and zh-Hant HA language settings
# ============================================================
set -o pipefail

HA_URL="http://localhost:8123"
HA_USER="admin"
HA_PASS="admin"

# --- Per-panel test data ---
PANELS=("knx" "dmx" "modbus")
declare -A PANEL_URL PANEL_FILES PANEL_LINK1 PANEL_LINK2 PANEL_INFO
# Bilingual titles
declare -A PANEL_TITLE_EN PANEL_TITLE_ZH

PANEL_URL[knx]="/woow_knx"
PANEL_URL[dmx]="/woow_dmx"
PANEL_URL[modbus]="/woow_modbus"

PANEL_TITLE_EN[knx]="KNX Settings"
PANEL_TITLE_EN[dmx]="DMX Settings"
PANEL_TITLE_EN[modbus]="Modbus Settings"

PANEL_TITLE_ZH[knx]="KNX 設定"
PANEL_TITLE_ZH[dmx]="DMX 設定"
PANEL_TITLE_ZH[modbus]="Modbus 設定"

PANEL_FILES[knx]=3
PANEL_FILES[dmx]=4
PANEL_FILES[modbus]=4

PANEL_LINK1[knx]="home-assistant.io/integrations/knx"
PANEL_LINK1[dmx]="github.com/Breina/ha-artnet-led"
PANEL_LINK1[modbus]="home-assistant.io/integrations/modbus"

PANEL_LINK2[knx]="aiot.woowtech.io/blog"
PANEL_LINK2[dmx]="aiot.woowtech.io/blog"
PANEL_LINK2[modbus]="aiot.woowtech.io/blog"

PANEL_INFO[knx]="KNX"
PANEL_INFO[dmx]="Art-Net"
PANEL_INFO[modbus]="Modbus"

# --- Language-dependent strings (detected at runtime) ---
LANG_MODE=""  # "en" or "zh"
TAB_GUIDE=""
TAB_EDITOR=""
STR_CONNECTED=""
STR_LOADED=""
STR_NEW_BTN=""
STR_SAVE_BTN=""
STR_RESTART_TITLE=""
STR_RESTART_BTN=""
STR_CONFIRM_LABEL=""
STR_REFRESH_TITLE=""
STR_SELECT_PLACEHOLDER=""

set_lang() {
  if [[ "$1" == "zh" ]]; then
    LANG_MODE="zh"
    TAB_GUIDE="設定指南"
    TAB_EDITOR="編輯器 & 系統"
    STR_CONNECTED="已連線"
    STR_LOADED="已載入"
    STR_NEW_BTN="新增"
    STR_SAVE_BTN="儲存"
    STR_RESTART_TITLE="重新啟動"
    STR_RESTART_BTN="重新啟動"
    STR_CONFIRM_LABEL="確認"
    STR_REFRESH_TITLE="重新整理檔案清單"
    STR_SELECT_PLACEHOLDER="選擇檔案"
  else
    LANG_MODE="en"
    TAB_GUIDE="Setup Guide"
    TAB_EDITOR="Editor & System"
    STR_CONNECTED="Connected"
    STR_LOADED="Loaded"
    STR_NEW_BTN="New"
    STR_SAVE_BTN="Save"
    STR_RESTART_TITLE="Restart"
    STR_RESTART_BTN="Restart"
    STR_CONFIRM_LABEL="confirm"
    STR_REFRESH_TITLE="Refresh file list"
    STR_SELECT_PLACEHOLDER="Select File"
  fi
}

panel_title() {
  local p="$1"
  if [[ "$LANG_MODE" == "zh" ]]; then
    echo "${PANEL_TITLE_ZH[$p]}"
  else
    echo "${PANEL_TITLE_EN[$p]}"
  fi
}

# --- Counters ---
TOTAL_PASS=0
TOTAL_FAIL=0
declare -A PANEL_PASS PANEL_FAIL
FAILURES=()

# --- Helpers ---
cli() {
  npx playwright-cli "$@" 2>&1
}

snapshot() {
  local out
  out=$(cli snapshot 2>&1)
  # If playwright-cli wrote snapshot to a YAML file, read it
  local snap_file
  snap_file=$(echo "$out" | grep -oP '\[Snapshot\]\(\K[^)]+\.yml' | head -1)
  if [[ -n "$snap_file" ]]; then
    if [[ -f "$snap_file" ]]; then
      echo "$out"
      cat "$snap_file"
    elif [[ -f "$PWD/$snap_file" ]]; then
      echo "$out"
      cat "$PWD/$snap_file"
    else
      echo "$out"
    fi
  else
    echo "$out"
  fi
}

pass() {
  local panel="$1" id="$2" msg="$3"
  TOTAL_PASS=$((TOTAL_PASS + 1))
  PANEL_PASS[$panel]=$(( ${PANEL_PASS[$panel]:-0} + 1 ))
  echo "  [PASS] $id: $msg"
}

fail() {
  local panel="$1" id="$2" msg="$3"
  TOTAL_FAIL=$((TOTAL_FAIL + 1))
  PANEL_FAIL[$panel]=$(( ${PANEL_FAIL[$panel]:-0} + 1 ))
  FAILURES+=("[$panel] $id: $msg")
  echo "  [FAIL] $id: $msg"
}

assert_contains() {
  local panel="$1" id="$2" text="$3" haystack="$4" msg="$5"
  if echo "$haystack" | grep -qF "$text"; then
    pass "$panel" "$id" "$msg"
  else
    fail "$panel" "$id" "$msg (expected: '$text')"
  fi
}

assert_not_contains() {
  local panel="$1" id="$2" text="$3" haystack="$4" msg="$5"
  if echo "$haystack" | grep -qF "$text"; then
    fail "$panel" "$id" "$msg (found: '$text')"
  else
    pass "$panel" "$id" "$msg"
  fi
}

assert_regex() {
  local panel="$1" id="$2" pattern="$3" haystack="$4" msg="$5"
  if echo "$haystack" | grep -qE "$pattern"; then
    pass "$panel" "$id" "$msg"
  else
    fail "$panel" "$id" "$msg (pattern: '$pattern')"
  fi
}

assert_count() {
  local panel="$1" id="$2" expected="$3" actual="$4" msg="$5"
  if [[ "$actual" -eq "$expected" ]]; then
    pass "$panel" "$id" "$msg"
  else
    fail "$panel" "$id" "$msg (expected: $expected, got: $actual)"
  fi
}

# --- Login ---
login() {
  echo "=== Opening browser and logging in ==="
  cli open "$HA_URL" >/dev/null
  sleep 3

  local snap
  snap=$(snapshot)

  local user_ref pass_ref login_ref
  user_ref=$(echo "$snap" | grep -oP 'textbox "Username[^"]*".*?\[ref=\K[^\]]+' | head -1)
  pass_ref=$(echo "$snap" | grep -oP 'textbox "Password[^"]*" \[ref=\K[^\]]+' | head -1)
  login_ref=$(echo "$snap" | grep -oP 'button "Log in" \[ref=\K[^\]]+' | head -1)

  if [[ -z "$user_ref" || -z "$pass_ref" || -z "$login_ref" ]]; then
    echo "ERROR: Could not find login form elements"
    echo "Snapshot: $snap"
    exit 2
  fi

  cli fill "$user_ref" "$HA_USER" >/dev/null
  cli fill "$pass_ref" "$HA_PASS" >/dev/null
  cli click "$login_ref" >/dev/null
  sleep 4
  echo "  Logged in successfully"
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

# --- Test Groups ---

test_panel_load() {
  local p="$1"
  echo "  --- T1: Panel Load ---"

  cli goto "${HA_URL}${PANEL_URL[$p]}" >/dev/null
  sleep 3

  local console_out
  console_out=$(cli console)
  local errors
  errors=$(echo "$console_out" | grep -oP 'Errors: \K[0-9]+' || echo "0")
  assert_count "$p" "T1.1" 0 "$errors" "Zero console errors"

  local snap
  snap=$(snapshot)
  assert_not_contains "$p" "T1.2" "404" "$snap" "Page does not show 404"

  local title
  title=$(panel_title "$p")
  assert_contains "$p" "T1.3" "$title" "$snap" "Panel title rendered"

  echo "$snap"
}

test_top_bar() {
  local p="$1" snap="$2"
  echo "  --- T2: Top Bar ---"

  local title
  title=$(panel_title "$p")
  assert_contains "$p" "T2.1" "$title" "$snap" "Title shows protocol name"
  assert_contains "$p" "T2.2" "v2.1.0" "$snap" "Version number visible"
  assert_regex "$p" "T2.3" "button.*cursor=pointer" "$snap" "Hamburger menu button exists"
}

test_tab_switching() {
  local p="$1" snap="$2"
  echo "  --- T3: Tab Switching ---"

  assert_regex "$p" "T3.1" "button \"$TAB_GUIDE\"" "$snap" "Guide tab button exists"
  assert_regex "$p" "T3.2" "button \"$TAB_EDITOR\"" "$snap" "Editor tab button exists"

  # Click editor tab
  local editor_ref
  editor_ref=$(echo "$snap" | grep -oP "button \"$TAB_EDITOR\" \\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$editor_ref" ]]; then
    cli click "$editor_ref" >/dev/null
    sleep 1
    local editor_snap
    editor_snap=$(snapshot)
    assert_regex "$p" "T3.3" "combobox" "$editor_snap" "Editor tab shows file dropdown"

    # Switch back to guide tab
    local guide_ref
    guide_ref=$(echo "$editor_snap" | grep -oP "button \"$TAB_GUIDE\" \\[ref=\\K[^\\]]+" | head -1)
    if [[ -n "$guide_ref" ]]; then
      cli click "$guide_ref" >/dev/null
      sleep 1
      local guide_snap
      guide_snap=$(snapshot)
      assert_not_contains "$p" "T3.4" "combobox" "$guide_snap" "Guide tab hides editor dropdown"
    else
      fail "$p" "T3.4" "Could not find guide tab ref to switch back"
    fi
  else
    fail "$p" "T3.3" "Could not find editor tab ref"
    fail "$p" "T3.4" "Skipped (depends on T3.3)"
  fi
}

test_guide_tab() {
  local p="$1"
  echo "  --- T4: Guide Tab ---"

  local snap
  snap=$(snapshot)
  local guide_ref
  guide_ref=$(echo "$snap" | grep -oP "button \"$TAB_GUIDE\" \\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$guide_ref" ]]; then
    cli click "$guide_ref" >/dev/null
    sleep 1
  fi
  snap=$(snapshot)

  # Count step numbers (1-5) — anchor on "v2.1.0" which is unique to panel content
  local panel_content
  panel_content=$(echo "$snap" | sed -n '/v2\.1\.0/,$p')
  local step_count
  step_count=$(echo "$panel_content" | grep -cP ': "[1-5]"' || echo "0")
  assert_count "$p" "T4.1" 5 "$step_count" "5 step numbers rendered (1-5)"

  assert_contains "$p" "T4.2" "${PANEL_LINK1[$p]}" "$snap" "Step 1 link URL correct"
  assert_contains "$p" "T4.3" "${PANEL_LINK2[$p]}" "$snap" "Step 2 link URL correct"
}

test_info_tip() {
  local p="$1"
  echo "  --- T5: Info Tip ---"

  local snap
  snap=$(snapshot)
  assert_contains "$p" "T5.1" "${PANEL_INFO[$p]}" "$snap" "Info tip contains protocol keyword"
}

test_editor_tab() {
  local p="$1"
  echo "  --- T6: Editor Tab ---"

  local snap
  snap=$(snapshot)
  local editor_ref
  editor_ref=$(echo "$snap" | grep -oP "button \"$TAB_EDITOR\" \\[ref=\\K[^\\]]+" | head -1)
  cli click "$editor_ref" >/dev/null
  sleep 2
  snap=$(snapshot)

  # File dropdown with options
  local option_count
  option_count=$(echo "$snap" | grep -c 'option "' || echo "0")
  # Subtract 1 for the placeholder option
  option_count=$((option_count - 1))
  assert_count "$p" "T6.1" "${PANEL_FILES[$p]}" "$option_count" "File count matches expected"

  assert_regex "$p" "T6.2" "textbox" "$snap" "Editor textarea present"
  assert_contains "$p" "T6.3" "$STR_CONNECTED" "$snap" "Status shows connected"
  assert_regex "$p" "T6.4" "button.*$STR_NEW_BTN" "$snap" "New file button exists"
  assert_regex "$p" "T6.5" "button.*$STR_SAVE_BTN" "$snap" "Save button exists"

  echo "$snap"
}

test_file_operations() {
  local p="$1" snap="$2"
  echo "  --- T7: File Operations ---"

  local select_ref
  select_ref=$(echo "$snap" | grep -oP 'combobox \[ref=\K[^\]]+' | head -1)
  local first_file
  first_file=$(echo "$snap" | grep -oP 'option "\K[^"]+' | grep -v "$STR_SELECT_PLACEHOLDER" | grep -v "^--" | head -1)

  if [[ -n "$select_ref" && -n "$first_file" ]]; then
    cli select "$select_ref" "$first_file" >/dev/null
    sleep 3
    local new_snap
    new_snap=$(snapshot)
    assert_contains "$p" "T7.1" "$STR_LOADED" "$new_snap" "File loaded status shown"
  else
    fail "$p" "T7.1" "Could not find file selector or file option"
  fi
}

test_editor_controls() {
  local p="$1"
  echo "  --- T8: Editor Controls ---"

  # Ensure we're on the editor tab
  local snap
  snap=$(snapshot)
  local editor_ref
  editor_ref=$(echo "$snap" | grep -oP "button \"$TAB_EDITOR\" \\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$editor_ref" ]]; then
    cli click "$editor_ref" >/dev/null
    sleep 1
  fi
  snap=$(snapshot)

  assert_regex "$p" "T8.1" 'button "A-"' "$snap" "Font decrease button exists"
  assert_regex "$p" "T8.2" 'button "A\+"' "$snap" "Font increase button exists"
  assert_regex "$p" "T8.3" "button \"$STR_REFRESH_TITLE\"" "$snap" "Refresh file list button exists"
}

test_restart_section() {
  local p="$1"
  echo "  --- T9: Restart Section ---"

  local snap
  snap=$(snapshot)

  assert_contains "$p" "T9.1" "$STR_RESTART_TITLE" "$snap" "Restart section title present"

  # Checkbox exists and is unchecked
  if echo "$snap" | grep -qP "checkbox.*$STR_CONFIRM_LABEL.*\\[checked\\]"; then
    fail "$p" "T9.2" "Restart checkbox should be unchecked by default"
  else
    assert_regex "$p" "T9.2" "checkbox.*$STR_CONFIRM_LABEL" "$snap" "Restart checkbox exists and unchecked"
  fi

  # Restart button disabled
  assert_regex "$p" "T9.3" "button \"$STR_RESTART_BTN\" \\[disabled\\]" "$snap" "Restart button disabled by default"

  # Check the checkbox
  local cb_ref
  cb_ref=$(echo "$snap" | grep -oP "checkbox.*$STR_CONFIRM_LABEL.*\\[ref=\\K[^\\]]+" | head -1)
  if [[ -n "$cb_ref" ]]; then
    cli click "$cb_ref" >/dev/null
    sleep 1
    local new_snap
    new_snap=$(snapshot)
    if echo "$new_snap" | grep -qP "button \"$STR_RESTART_BTN\" \\[ref="; then
      if echo "$new_snap" | grep -qP "button \"$STR_RESTART_BTN\" \\[disabled\\]"; then
        fail "$p" "T9.4" "Button still disabled after checking confirm"
      else
        pass "$p" "T9.4" "Restart button enabled after confirm checked"
      fi
    else
      fail "$p" "T9.4" "Restart button not found after check"
    fi

    # Uncheck to leave in safe state
    cli click "$cb_ref" >/dev/null 2>&1
  else
    fail "$p" "T9.4" "Could not find checkbox ref"
  fi
}

test_no_legacy() {
  local p="$1"
  echo "  --- T10: No Legacy Elements ---"

  local snap
  snap=$(snapshot)

  assert_not_contains "$p" "T10.1" "iframe" "$snap" "No iframe elements in DOM"
  assert_not_contains "$p" "T10.2" "📖" "$snap" "No book emoji in text"
  assert_not_contains "$p" "T10.3" "🤖" "$snap" "No robot emoji in text"
}

# --- Run all tests for one panel ---
run_panel_tests() {
  local p="$1"
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Testing: ${p^^} panel (${PANEL_URL[$p]})"
  echo "═══════════════════════════════════════════"
  PANEL_PASS[$p]=0
  PANEL_FAIL[$p]=0

  local load_snap
  load_snap=$(test_panel_load "$p")

  # Auto-detect language on first panel
  if [[ -z "$LANG_MODE" ]]; then
    detect_language "$load_snap"
  fi

  test_top_bar "$p" "$load_snap"
  test_tab_switching "$p" "$load_snap"
  test_guide_tab "$p"
  test_info_tip "$p"
  local editor_snap
  editor_snap=$(test_editor_tab "$p")
  test_file_operations "$p" "$editor_snap"
  test_editor_controls "$p"
  test_restart_section "$p"
  test_no_legacy "$p"
}

# --- Summary ---
print_summary() {
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║           E2E Panel Test Results                 ║"
  echo "╠══════════╦════════╦════════╦═════════════════════╣"
  printf "║ %-8s ║ %-6s ║ %-6s ║ %-19s ║\n" "Panel" "Pass" "Fail" "Status"
  echo "╠══════════╬════════╬════════╬═════════════════════╣"
  for p in "${PANELS[@]}"; do
    local status="PASS"
    [[ ${PANEL_FAIL[$p]:-0} -gt 0 ]] && status="FAIL"
    printf "║ %-8s ║ %-6s ║ %-6s ║ %-19s ║\n" "${p^^}" "${PANEL_PASS[$p]:-0}" "${PANEL_FAIL[$p]:-0}" "$status"
  done
  echo "╠══════════╬════════╬════════╬═════════════════════╣"
  local total_status="ALL PASS"
  [[ $TOTAL_FAIL -gt 0 ]] && total_status="FAILURES: $TOTAL_FAIL"
  printf "║ %-8s ║ %-6s ║ %-6s ║ %-19s ║\n" "TOTAL" "$TOTAL_PASS" "$TOTAL_FAIL" "$total_status"
  echo "╚══════════╩════════╩════════╩═════════════════════╝"
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
  echo "E2E Panel Tests — $(date)"
  echo "Target: $HA_URL"
  echo ""

  if ! curl -sf -o /dev/null "$HA_URL"; then
    echo "ERROR: HA not reachable at $HA_URL"
    exit 2
  fi

  login

  for p in "${PANELS[@]}"; do
    run_panel_tests "$p"
  done

  cli close >/dev/null 2>&1

  print_summary

  [[ $TOTAL_FAIL -eq 0 ]] && exit 0 || exit 1
}

main "$@"
