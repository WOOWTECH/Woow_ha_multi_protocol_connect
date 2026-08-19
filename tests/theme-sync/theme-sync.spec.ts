/**
 * Woow Multi-Protocol Connect — panel + theme-sync suite
 *
 * The merged integration exposes ONE tabbed panel at /woow_multi_protocol,
 * rendered as a native custom element. This suite verifies:
 *   Group 1 — Panel structure: tabs equal the enabled protocols, tab switching.
 *   Group 2 — Theme sync: the panel follows HA's --primary-color (inherently,
 *             via CSS custom-property inheritance across the shadow boundary).
 *   Group 3 — Dark mode: the panel background follows HA's dark/light mode.
 *
 * Requires a running HA with woow_multi_protocol installed and all three
 * protocols enabled (the default). Point elsewhere with HA_URL.
 */

import { test, expect } from "@playwright/test";
import {
  installDeepFind,
  loginToHA,
  navigateToPanel,
  getPanelTabs,
  clickProtocolTab,
  getHAPrimaryColor,
  getActiveTabColor,
  getPanelBackground,
  getPanelCssVar,
  getHABackgroundColor,
  overrideDocCssVar,
  setHAPrimaryColor,
  waitForThemeSync,
  resetTestColorState,
  normalizeToRgbTriplet,
  PROTOCOL_LABELS,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  resetTestColorState();
  await installDeepFind(page);
  await loginToHA(page);
});

/* ================================================================== */
/*  Group 1: Panel structure                                          */
/* ================================================================== */

test.describe("Group 1: Panel structure", () => {
  test("1.1 Tabs equal the enabled protocols (KNX / DMX / Modbus)", async ({ page }) => {
    await navigateToPanel(page);
    const { tabs } = await getPanelTabs(page);
    expect(tabs).toEqual([...PROTOCOL_LABELS]);
  });

  test("1.2 The first protocol is active on load", async ({ page }) => {
    await navigateToPanel(page);
    const { active } = await getPanelTabs(page);
    expect(active).toEqual(["KNX"]);
  });

  test("1.3 Clicking a tab activates it", async ({ page }) => {
    await navigateToPanel(page);

    expect(await clickProtocolTab(page, "DMX")).toBe(true);
    let state = await getPanelTabs(page);
    expect(state.active).toEqual(["DMX"]);

    expect(await clickProtocolTab(page, "Modbus")).toBe(true);
    state = await getPanelTabs(page);
    expect(state.active).toEqual(["Modbus"]);
  });

  test("1.4 Exactly one tab is active at a time", async ({ page }) => {
    await navigateToPanel(page);
    for (const label of PROTOCOL_LABELS) {
      await clickProtocolTab(page, label);
      const { active } = await getPanelTabs(page);
      expect(active).toHaveLength(1);
      expect(active[0]).toBe(label);
    }
  });
});

/* ================================================================== */
/*  Group 2: Theme sync                                               */
/* ================================================================== */

test.describe("Group 2: Theme sync", () => {
  test("2.1 Panel paints HA's primary color on initial render", async ({ page }) => {
    await navigateToPanel(page);

    const haPrimary = await getHAPrimaryColor(page);
    await waitForThemeSync(page, haPrimary, 6000);

    const tabColor = await getActiveTabColor(page);
    expect(normalizeToRgbTriplet(tabColor)).toBe(normalizeToRgbTriplet(haPrimary));
  });

  test("2.2 Panel follows when HA primary color changes", async ({ page }) => {
    await navigateToPanel(page);

    const initial = await getHAPrimaryColor(page);
    await waitForThemeSync(page, initial, 6000);

    const testColor = "#e91e63"; // pink
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, testColor, 5000);

    const tabColor = await getActiveTabColor(page);
    expect(normalizeToRgbTriplet(tabColor)).toBe(normalizeToRgbTriplet(testColor));
  });

  test("2.3 The inherited --primary-color reaches the panel element", async ({ page }) => {
    const testColor = "#2196f3"; // blue
    await navigateToPanel(page);
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, testColor, 5000);

    const inherited = await getPanelCssVar(page, "--primary-color");
    expect(normalizeToRgbTriplet(inherited)).toBe(normalizeToRgbTriplet(testColor));
  });

  test("2.4 Sequential color changes settle on the final color", async ({ page }) => {
    await navigateToPanel(page);

    for (const c of ["#ff5722", "#9c27b0"]) {
      await setHAPrimaryColor(page, c);
      await page.waitForTimeout(400);
    }
    const finalColor = "#00bcd4"; // cyan
    await setHAPrimaryColor(page, finalColor);
    await waitForThemeSync(page, finalColor, 5000);

    const tabColor = await getActiveTabColor(page);
    expect(normalizeToRgbTriplet(tabColor)).toBe(normalizeToRgbTriplet(finalColor));
  });

  test("2.5 Color persists across a tab switch", async ({ page }) => {
    const testColor = "#4caf50"; // green
    await navigateToPanel(page);
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, testColor, 5000);

    await clickProtocolTab(page, "Modbus");
    await waitForThemeSync(page, testColor, 4000);

    const tabColor = await getActiveTabColor(page);
    expect(normalizeToRgbTriplet(tabColor)).toBe(normalizeToRgbTriplet(testColor));
  });
});

/* ================================================================== */
/*  Group 3: Background / dark-mode readiness                          */
/*                                                                     */
/*  The panel is dark-aware by binding its surfaces to HA's theme      */
/*  variables (chiefly --primary-background-color), which HA swaps when */
/*  dark mode turns on. We verify that binding directly — the panel     */
/*  follows the variable — rather than driving HA's dark mode from      */
/*  outside, which no external hook can do reliably across versions.    */
/* ================================================================== */

test.describe("Group 3: Background / dark-mode readiness", () => {
  test.afterEach(async ({ page }) => {
    try {
      await overrideDocCssVar(page, "--primary-background-color", null);
    } catch {
      // page may already be closed
    }
  });

  test("3.1 Panel background matches HA's --primary-background-color", async ({ page }) => {
    await navigateToPanel(page);

    const haBg = await getHABackgroundColor(page);
    const panelBg = await getPanelBackground(page);

    // The panel host paints var(--primary-background-color), so its computed
    // background must equal what HA sets at the document level.
    expect(normalizeToRgbTriplet(panelBg)).toBe(normalizeToRgbTriplet(haBg));
  });

  test("3.2 Panel background follows a background-variable change (dark-mode path)", async ({
    page,
  }) => {
    await navigateToPanel(page);

    // Simulate what dark mode does: swap --primary-background-color to a dark
    // value. The panel must follow, proving it inherits the theme variable.
    const darkBg = "#1c1c1c";
    await overrideDocCssVar(page, "--primary-background-color", darkBg);
    await page.waitForTimeout(500);

    const panelBg = await getPanelBackground(page);
    expect(normalizeToRgbTriplet(panelBg)).toBe(normalizeToRgbTriplet(darkBg));
  });

  test("3.3 Panel still follows the primary color while the background is dark", async ({
    page,
  }) => {
    await navigateToPanel(page);
    await overrideDocCssVar(page, "--primary-background-color", "#1c1c1c");

    const testColor = "#ff9800"; // orange
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, testColor, 6000);

    const tabColor = await getActiveTabColor(page);
    expect(normalizeToRgbTriplet(tabColor)).toBe(normalizeToRgbTriplet(testColor));
  });
});
