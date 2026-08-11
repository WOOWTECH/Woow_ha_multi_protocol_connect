#!/usr/bin/env python3
"""
目錄隔離功能專屬測試 — v2.1.0 Directory Isolation Test Suite
================================================================

測試 v2.1.0 新增的 CONFIG_SUBDIR 目錄隔離機制，確保：
  - 每個元件只能看到/讀取/寫入自己的子目錄
  - 跨目錄存取被阻擋
  - 路徑穿越攻擊在新限縮範圍內仍被防禦
  - 邊緣條件（空目錄、巢狀子目錄、特殊字元檔名等）正確處理

測試架構：
  Phase 1: 基本隔離驗證（list/load/save 限定在自己的子目錄）
  Phase 2: 跨目錄阻擋測試（嘗試用 KNX API 讀 DMX/Modbus 的檔案）
  Phase 3: 路徑穿越攻擊（在限縮範圍內的 ../ 攻擊）
  Phase 4: 邊緣條件（空目錄、巢狀目錄、特殊字元、大量檔案）
  Phase 5: 寫入隔離（確保寫入只落在正確的子目錄）
  Phase 6: 並發操作（三個元件同時操作不互相干擾）
  Phase 7: 子目錄自動建立驗證
"""

import asyncio
import json
import os
import sys
import time

try:
    import websockets
except ImportError:
    os.system(f"{sys.executable} -m pip install websockets -q")
    import websockets

# ============================================================
HA_HOST = os.environ.get("HA_HOST", "localhost")
HA_PORT = int(os.environ.get("HA_PORT", "15126"))
HA_TOKEN = os.environ.get("HA_TOKEN", "")
if not HA_TOKEN:
    token_file = os.path.join(os.path.dirname(__file__), "tmp", "ha_token.txt")
    if os.path.exists(token_file):
        with open(token_file) as f:
            HA_TOKEN = f.read().strip()
    else:
        print("ERROR: Set HA_TOKEN env var or create tmp/ha_token.txt", file=sys.stderr)
        sys.exit(1)
WS_URL = f"ws://{HA_HOST}:{HA_PORT}/api/websocket"
HA_VOL = "/home/woowtech-ai-coder/.local/share/containers/storage/volumes/ha-protocol-config/_data"

COMPONENTS = {
    "knx":    {"ws": "woow_knx/ws",    "subdir": "knx"},
    "dmx":    {"ws": "woow_dmx/ws",    "subdir": "dmx"},
    "modbus": {"ws": "woow_modbus/ws", "subdir": "modbus"},
}

results = {"passed": 0, "failed": 0, "errors": []}


def ok(name):
    results["passed"] += 1
    print(f"  ✓ {name}")


def fail(name, reason=""):
    results["failed"] += 1
    results["errors"].append(f"{name}: {reason}")
    print(f"  ✗ {name} — {reason}")


# ============================================================
# WebSocket helpers
# ============================================================
async def ws_connect():
    ws = await websockets.connect(WS_URL, max_size=10 * 1024 * 1024)
    await ws.recv()  # auth_required
    await ws.send(json.dumps({"type": "auth", "access_token": HA_TOKEN}))
    resp = json.loads(await ws.recv())
    assert resp["type"] == "auth_ok", f"Auth failed: {resp}"
    return ws


async def ws_cmd(ws, msg_id, ws_type, **kw):
    await ws.send(json.dumps({"id": msg_id, "type": ws_type, **kw}))
    return json.loads(await ws.recv())


# ============================================================
# Phase 1: 基本隔離驗證
# ============================================================
async def phase1_basic_isolation():
    """確認每個元件的 list 只回傳自己子目錄的檔案。"""
    print("\n" + "=" * 70)
    print("Phase 1: 基本隔離驗證 — list 只回傳自己子目錄的檔案")
    print("=" * 70)

    ws = await ws_connect()
    mid = 100

    for comp, info in COMPONENTS.items():
        mid += 1
        resp = await ws_cmd(ws, mid, info["ws"], action="list", ext="yaml", depth=5)
        if not resp.get("success"):
            fail(f"{comp} list 失敗", str(resp))
            continue

        files = resp["result"]["files"]

        # 1a: 清單不為空（因為我們已放入範例檔）
        if files:
            ok(f"{comp} list 回傳 {len(files)} 個檔案")
        else:
            fail(f"{comp} list 回傳空清單", "子目錄應有範例 YAML 檔")

        # 1b: 所有檔案都不包含其他元件的前綴
        other_comps = [c for c in COMPONENTS if c != comp]
        leaks = [f for f in files if any(f.startswith(oc + "/") or f.startswith(oc + "\\") for oc in other_comps)]
        if not leaks:
            ok(f"{comp} list 無跨目錄洩漏")
        else:
            fail(f"{comp} list 包含其他元件檔案", str(leaks))

        # 1c: 不包含 HA 根目錄的系統檔
        sys_files = [f for f in files if f in (
            "configuration.yaml", "automations.yaml", "secrets.yaml",
            "scripts.yaml", "scenes.yaml", "home-assistant.log")]
        if not sys_files:
            ok(f"{comp} list 不含 HA 系統檔")
        else:
            fail(f"{comp} list 包含 HA 系統檔", str(sys_files))

    await ws.close()


# ============================================================
# Phase 2: 跨目錄阻擋
# ============================================================
async def phase2_cross_directory_block():
    """用 KNX API 嘗試讀取 DMX/Modbus 的檔案，應全部被阻擋。"""
    print("\n" + "=" * 70)
    print("Phase 2: 跨目錄阻擋 — 嘗試跨元件存取應被拒絕")
    print("=" * 70)

    ws = await ws_connect()
    mid = 200

    # 定義跨目錄攻擊向量
    attacks = [
        # (使用的元件, 嘗試存取的路徑, 說明)
        ("knx", "../dmx/dmx_artnet.yaml",       "KNX 讀 DMX (../)"),
        ("knx", "../modbus/modbus_tcp.yaml",     "KNX 讀 Modbus (../)"),
        ("dmx", "../knx/knx_main.yaml",          "DMX 讀 KNX (../)"),
        ("dmx", "../modbus/modbus_rtu.yaml",     "DMX 讀 Modbus (../)"),
        ("modbus", "../knx/knx_scripts.yaml",    "Modbus 讀 KNX (../)"),
        ("modbus", "../dmx/dmx_scenes.yaml",     "Modbus 讀 DMX (../)"),
        # 嘗試讀 HA 根目錄的系統檔
        ("knx", "../configuration.yaml",         "KNX 讀 HA configuration.yaml"),
        ("dmx", "../secrets.yaml",               "DMX 讀 HA secrets.yaml"),
        ("modbus", "../automations.yaml",        "Modbus 讀 HA automations.yaml"),
        # 雙重穿越
        ("knx", "../../etc/passwd",              "KNX 系統穿越 (../../)"),
        ("dmx", "sub/../../dmx_artnet.yaml",     "DMX 隱藏穿越 (sub/../../)"),
    ]

    for comp, path, desc in attacks:
        mid += 1
        info = COMPONENTS[comp]
        resp = await ws_cmd(ws, mid, info["ws"], action="load", path=path)
        if not resp.get("success"):
            err_code = resp.get("error", {}).get("code", "")
            ok(f"阻擋: {desc} → {err_code}")
        else:
            fail(f"未阻擋: {desc}", f"竟然成功讀取到 {len(resp['result'].get('content',''))} chars")

    await ws.close()


# ============================================================
# Phase 3: 路徑穿越攻擊（限縮範圍版）
# ============================================================
async def phase3_path_traversal_in_scope():
    """在限縮的子目錄範圍內進行各種路徑穿越攻擊。"""
    print("\n" + "=" * 70)
    print("Phase 3: 路徑穿越攻擊 — 在限縮範圍內的安全驗證")
    print("=" * 70)

    ws = await ws_connect()
    mid = 300
    comp_info = COMPONENTS["knx"]

    traversal_paths = [
        ("../configuration.yaml",           "單層穿越讀系統檔"),
        ("../../etc/passwd",                "雙層穿越讀系統"),
        ("../../../etc/shadow",             "三層穿越"),
        ("..",                              "純 .."),
        ("..\\dmx\\dmx_artnet.yaml",        "Windows 風格穿越"),
        ("knx_main.yaml/../../../etc/passwd", "中間穿越"),
        ("\x00knx_main.yaml",               "Null byte 注入"),
        ("knx_main.yaml\x00.txt",           "Null byte 截斷"),
        ("/etc/passwd",                      "絕對路徑 (Linux)"),
        ("\\etc\\passwd",                    "絕對路徑 (Windows)"),
        ("....//....//etc/passwd",           "雙點雙斜線"),
        (".%2e/%2e%2e/etc/passwd",           "URL 編碼穿越"),
        ("knx/../../../etc/passwd",          "合法前綴後穿越"),
    ]

    for path, desc in traversal_paths:
        mid += 1

        # Test load
        resp = await ws_cmd(ws, mid, comp_info["ws"], action="load", path=path)
        if not resp.get("success"):
            ok(f"Load 阻擋: {desc}")
        else:
            fail(f"Load 未阻擋: {desc}", "成功讀取！")

        # Test save
        mid += 1
        resp = await ws_cmd(ws, mid, comp_info["ws"], action="save", path=path, content="hacked")
        if not resp.get("success"):
            ok(f"Save 阻擋: {desc}")
        else:
            fail(f"Save 未阻擋: {desc}", "成功寫入！")

    await ws.close()


# ============================================================
# Phase 4: 邊緣條件
# ============================================================
async def phase4_edge_cases():
    """測試各種邊緣條件的處理能力。"""
    print("\n" + "=" * 70)
    print("Phase 4: 邊緣條件 — 空目錄、巢狀目錄、特殊字元")
    print("=" * 70)

    ws = await ws_connect()
    mid = 400

    # 4a: 空路徑
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"], action="load", path="")
    if not resp.get("success"):
        ok("空路徑 load 拒絕")
    else:
        fail("空路徑 load 未拒絕")

    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"], action="save", path="", content="test")
    if not resp.get("success"):
        ok("空路徑 save 拒絕")
    else:
        fail("空路徑 save 未拒絕")

    # 4b: 巢狀子目錄（在自己的 scope 內建立子目錄）
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["dmx"]["ws"],
                        action="save", path="venues/theater/main_stage.yaml",
                        content="# Theater main stage DMX config\nchannels: 512\n")
    if resp.get("success"):
        ok("巢狀子目錄 save (dmx/venues/theater/main_stage.yaml)")

        # 讀回驗證
        mid += 1
        resp2 = await ws_cmd(ws, mid, COMPONENTS["dmx"]["ws"],
                             action="load", path="venues/theater/main_stage.yaml")
        if resp2.get("success") and "Theater main stage" in resp2["result"]["content"]:
            ok("巢狀子目錄 load 內容正確")
        else:
            fail("巢狀子目錄 load 失敗", str(resp2))

        # list 應該能看到
        mid += 1
        resp3 = await ws_cmd(ws, mid, COMPONENTS["dmx"]["ws"],
                             action="list", ext="yaml", depth=5)
        if resp3.get("success"):
            found = any("venues/theater/main_stage.yaml" in f for f in resp3["result"]["files"])
            if found:
                ok("巢狀子目錄出現在 list 中")
            else:
                fail("巢狀子目錄未出現在 list 中", str(resp3["result"]["files"]))
    else:
        fail("巢狀子目錄 save 失敗", str(resp))

    # 4c: 特殊字元檔名（中文）
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["modbus"]["ws"],
                        action="save", path="太陽能監控.yaml",
                        content="# 太陽能逆變器監控配置\nsolar: true\n")
    if resp.get("success"):
        ok("中文檔名 save 成功")

        mid += 1
        resp2 = await ws_cmd(ws, mid, COMPONENTS["modbus"]["ws"],
                             action="load", path="太陽能監控.yaml")
        if resp2.get("success") and "太陽能逆變器" in resp2["result"]["content"]:
            ok("中文檔名 load 內容正確")
        else:
            fail("中文檔名 load 失敗", str(resp2))
    else:
        fail("中文檔名 save 失敗", str(resp))

    # 4d: 空格檔名
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                        action="save", path="my knx config.yaml",
                        content="# Space test\ntest: true\n")
    if resp.get("success"):
        ok("空格檔名 save 成功")

        mid += 1
        resp2 = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                             action="load", path="my knx config.yaml")
        if resp2.get("success") and "Space test" in resp2["result"]["content"]:
            ok("空格檔名 load 內容正確")
        else:
            fail("空格檔名 load 失敗")
    else:
        fail("空格檔名 save 失敗", str(resp))

    # 4e: 讀取不存在的檔案
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                        action="load", path="does_not_exist_12345.yaml")
    if not resp.get("success"):
        err_code = resp.get("error", {}).get("code", "")
        if err_code == "file_not_found":
            ok("不存在的檔案回傳 file_not_found")
        else:
            ok(f"不存在的檔案被拒絕 ({err_code})")
    else:
        fail("不存在的檔案竟然成功", str(resp))

    # 4f: 超長檔名
    mid += 1
    long_name = "a" * 200 + ".yaml"
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                        action="save", path=long_name, content="test")
    # 無論成功或失敗都記錄（OS 可能有 255 byte 限制）
    if resp.get("success"):
        ok(f"超長檔名 ({len(long_name)} chars) save 成功")
    else:
        err_msg = resp.get("error", {}).get("message", "")
        ok(f"超長檔名被拒或失敗: {err_msg[:60]}")

    # 4g: 純目錄路徑（無檔名）
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                        action="load", path="subdir/")
    if not resp.get("success"):
        ok("純目錄路徑 load 被拒絕")
    else:
        fail("純目錄路徑 load 未被拒絕")

    await ws.close()


# ============================================================
# Phase 5: 寫入隔離驗證
# ============================================================
async def phase5_write_isolation():
    """確認寫入操作實際只落在正確的子目錄。"""
    print("\n" + "=" * 70)
    print("Phase 5: 寫入隔離 — 確認檔案實際存放位置")
    print("=" * 70)

    ws = await ws_connect()
    mid = 500

    # 5a: 透過 KNX 寫入，確認檔案在 knx/ 子目錄
    test_marker = f"isolation_test_{int(time.time())}"
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["knx"]["ws"],
                        action="save", path="_isolation_verify.yaml",
                        content=f"# {test_marker}\nprotocol: knx\n")
    if resp.get("success"):
        # 直接檢查檔案系統
        expected_path = os.path.join(HA_VOL, "knx", "_isolation_verify.yaml")
        wrong_path = os.path.join(HA_VOL, "_isolation_verify.yaml")

        if os.path.exists(expected_path):
            with open(expected_path, encoding="utf-8") as f:
                content = f.read()
            if test_marker in content:
                ok("KNX 寫入落在 config/knx/ 子目錄（檔案系統驗證）")
            else:
                fail("KNX 寫入位置正確但內容不符")
        else:
            fail("KNX 寫入檔案不在 config/knx/", f"expected: {expected_path}")

        if os.path.exists(wrong_path):
            fail("KNX 寫入洩漏到 config 根目錄", f"found: {wrong_path}")
        else:
            ok("config 根目錄無洩漏")
    else:
        fail("KNX save 失敗", str(resp))

    # 5b: 透過 DMX 寫入，確認在 dmx/ 子目錄
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["dmx"]["ws"],
                        action="save", path="_isolation_verify.yaml",
                        content=f"# {test_marker}\nprotocol: dmx\n")
    if resp.get("success"):
        dmx_path = os.path.join(HA_VOL, "dmx", "_isolation_verify.yaml")
        if os.path.exists(dmx_path):
            with open(dmx_path, encoding="utf-8") as f:
                if "protocol: dmx" in f.read():
                    ok("DMX 寫入落在 config/dmx/ 子目錄（檔案系統驗證）")
                else:
                    fail("DMX 寫入位置正確但內容不符")
        else:
            fail("DMX 寫入檔案不在 config/dmx/")

    # 5c: 透過 Modbus 寫入
    mid += 1
    resp = await ws_cmd(ws, mid, COMPONENTS["modbus"]["ws"],
                        action="save", path="_isolation_verify.yaml",
                        content=f"# {test_marker}\nprotocol: modbus\n")
    if resp.get("success"):
        modbus_path = os.path.join(HA_VOL, "modbus", "_isolation_verify.yaml")
        if os.path.exists(modbus_path):
            with open(modbus_path, encoding="utf-8") as f:
                if "protocol: modbus" in f.read():
                    ok("Modbus 寫入落在 config/modbus/ 子目錄（檔案系統驗證）")
                else:
                    fail("Modbus 寫入位置正確但內容不符")
        else:
            fail("Modbus 寫入檔案不在 config/modbus/")

    # 5d: 同名檔案在不同子目錄互不干擾
    knx_content = open(os.path.join(HA_VOL, "knx", "_isolation_verify.yaml"), encoding="utf-8").read()
    dmx_content = open(os.path.join(HA_VOL, "dmx", "_isolation_verify.yaml"), encoding="utf-8").read()
    if "protocol: knx" in knx_content and "protocol: dmx" in dmx_content:
        ok("同名檔案在不同子目錄內容互不干擾")
    else:
        fail("同名檔案內容被覆蓋")

    await ws.close()


# ============================================================
# Phase 6: 並發操作
# ============================================================
async def phase6_concurrent_operations():
    """三個元件同時操作，驗證不互相干擾。

    使用三個獨立的 WebSocket 連線，每個連線順序操作（避免同一連線並發 recv）。
    三個連線之間透過 asyncio.gather 並行執行。
    """
    print("\n" + "=" * 70)
    print("Phase 6: 並發操作 — 三元件同時讀寫不干擾")
    print("=" * 70)

    async def save_batch(comp, count):
        """在獨立連線上順序寫入 count 個檔案。"""
        ws = await ws_connect()
        info = COMPONENTS[comp]
        batch_results = []
        for idx in range(count):
            mid = 600 + hash(comp) % 100 + idx
            content = f"# Concurrent test {comp} #{idx}\nvalue: {idx}\n"
            resp = await ws_cmd(ws, mid, info["ws"],
                                action="save", path=f"_concurrent_{idx}.yaml", content=content)
            batch_results.append((comp, idx, resp.get("success", False)))
        await ws.close()
        return batch_results

    async def load_batch(comp, count):
        """在獨立連線上順序讀取 count 個檔案。"""
        ws = await ws_connect()
        info = COMPONENTS[comp]
        batch_results = []
        for idx in range(count):
            mid = 650 + hash(comp) % 100 + idx
            resp = await ws_cmd(ws, mid, info["ws"],
                                action="load", path=f"_concurrent_{idx}.yaml")
            content = resp.get("result", {}).get("content", "") if resp.get("success") else ""
            batch_results.append((comp, idx, resp.get("success", False), content))
        await ws.close()
        return batch_results

    file_count = 5

    # 三個元件同時寫入（各自獨立連線）
    all_save_results = await asyncio.gather(
        save_batch("knx", file_count),
        save_batch("dmx", file_count),
        save_batch("modbus", file_count),
    )
    save_results = [r for batch in all_save_results for r in batch]
    save_ok = sum(1 for _, _, s in save_results if s)
    total_saves = len(save_results)
    if save_ok == total_saves:
        ok(f"並發寫入: {save_ok}/{total_saves} 全部成功")
    elif save_ok >= total_saves * 0.8:
        ok(f"並發寫入: {save_ok}/{total_saves} 大部分成功")
    else:
        fail(f"並發寫入: {save_ok}/{total_saves}")

    # 三個元件同時讀回驗證（各自獨立連線）
    all_load_results = await asyncio.gather(
        load_batch("knx", file_count),
        load_batch("dmx", file_count),
        load_batch("modbus", file_count),
    )
    load_results = [r for batch in all_load_results for r in batch]
    correct = 0
    for comp, idx, success, content in load_results:
        if success and f"Concurrent test {comp} #{idx}" in content:
            correct += 1

    if correct == len(load_results):
        ok(f"並發讀取驗證: {correct}/{len(load_results)} 內容全部正確")
    elif correct >= len(load_results) * 0.8:
        ok(f"並發讀取驗證: {correct}/{len(load_results)} 大部分正確")
    else:
        fail(f"並發讀取驗證: {correct}/{len(load_results)}")

    # 驗證隔離：KNX list 不應該包含 DMX/Modbus 的並發測試檔
    ws = await ws_connect()
    resp = await ws_cmd(ws, 699, COMPONENTS["knx"]["ws"],
                        action="list", ext="yaml", depth=5)
    if resp.get("success"):
        files = resp["result"]["files"]
        dmx_leak = any("dmx" in f.lower() for f in files if "concurrent" in f)
        modbus_leak = any("modbus" in f.lower() for f in files if "concurrent" in f)
        if not dmx_leak and not modbus_leak:
            ok("並發後 KNX list 無 DMX/Modbus 洩漏")
        else:
            fail("並發後 KNX list 有洩漏")
    await ws.close()


# ============================================================
# Phase 7: 子目錄自動建立
# ============================================================
async def phase7_auto_mkdir():
    """驗證元件啟動時自動建立子目錄。"""
    print("\n" + "=" * 70)
    print("Phase 7: 子目錄自動建立驗證")
    print("=" * 70)

    for comp, info in COMPONENTS.items():
        subdir_path = os.path.join(HA_VOL, info["subdir"])
        if os.path.isdir(subdir_path):
            ok(f"config/{info['subdir']}/ 目錄存在")
        else:
            fail(f"config/{info['subdir']}/ 目錄不存在")

    # 額外檢查：目錄擁有者和權限
    for comp, info in COMPONENTS.items():
        subdir_path = os.path.join(HA_VOL, info["subdir"])
        if os.path.isdir(subdir_path):
            st = os.stat(subdir_path)
            # 目錄應該可讀可寫
            if os.access(subdir_path, os.R_OK | os.W_OK):
                ok(f"config/{info['subdir']}/ 可讀可寫")
            else:
                fail(f"config/{info['subdir']}/ 權限不足")


# ============================================================
# Phase 8: 清理
# ============================================================
async def phase8_cleanup():
    """清理測試產生的檔案。"""
    print("\n" + "=" * 70)
    print("Phase 8: 清理測試檔案")
    print("=" * 70)

    import shutil
    cleaned = 0
    test_file_names = {"太陽能監控.yaml", "my knx config.yaml"}

    for comp, info in COMPONENTS.items():
        subdir = os.path.join(HA_VOL, info["subdir"])
        if not os.path.isdir(subdir):
            continue
        for fname in os.listdir(subdir):
            fpath = os.path.join(subdir, fname)
            # Remove test files (prefixed with _), known test names, long names
            if fname.startswith("_") or fname in test_file_names or len(fname) > 100:
                if os.path.isfile(fpath):
                    os.unlink(fpath)
                    cleaned += 1
            # Remove junk directories from previous traversal tests
            # (e.g. "....", ".%2e", "venues", or any dir starting with ".")
            if os.path.isdir(fpath) and fname not in (".", ".."):
                if (fname.startswith(".")
                        or fname == "venues"
                        or all(c == "." for c in fname)):
                    shutil.rmtree(fpath)
                    cleaned += 1

    ok(f"清理了 {cleaned} 個測試檔案/目錄")


# ============================================================
# Main
# ============================================================
async def main():
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║  目錄隔離功能專屬測試 — Directory Isolation Test Suite v2.1.0      ║")
    print("║  測試對象: woow_knx, woow_dmx, woow_modbus                        ║")
    print("║  功能: CONFIG_SUBDIR 限縮 + 路徑穿越防護 + 跨目錄阻擋             ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")

    start = time.time()

    await phase1_basic_isolation()
    await phase2_cross_directory_block()
    await phase3_path_traversal_in_scope()
    await phase4_edge_cases()
    await phase5_write_isolation()
    await phase6_concurrent_operations()
    await phase7_auto_mkdir()
    await phase8_cleanup()

    elapsed = time.time() - start
    total = results["passed"] + results["failed"]

    print("\n" + "=" * 70)
    print("目錄隔離測試結果")
    print("=" * 70)
    print(f"  總計:  {total}")
    print(f"  通過:  {results['passed']}")
    print(f"  失敗:  {results['failed']}")
    print(f"  通過率: {results['passed']/total*100:.1f}%" if total > 0 else "  N/A")
    print(f"  耗時:  {elapsed:.1f}s")

    if results["errors"]:
        print("\n失敗的測試:")
        for err in results["errors"]:
            print(f"  ✗ {err}")

    status = "ALL TESTS PASSED ✓" if results["failed"] == 0 else "SOME TESTS FAILED ✗"
    print(f"\n{status}")
    return results["failed"] == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
