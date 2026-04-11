/**
 * Theme Sync Test Suite
 *
 * Validates that all three protocol panels (KNX / DMX / Modbus)
 * dynamically follow Home Assistant's primary theme color.
 *
 * Requires: HA running on http://localhost:15126 (container: ha-protocol)
 *
 * 16 test cases across 5 groups:
 *   1. Basic sync (4)
 *   2. Color parsing & edge values (4)
 *   3. Dark mode (2)
 *   4. Stability & timing (3)
 *   5. Cross-panel consistency (3)
 */

import { test, expect } from "@playwright/test";
import {
  loginToHA,
  navigateToPanel,
  getHAPrimaryColor,
  getPanelColors,
  getSyncState,
  setHAPrimaryColor,
  removeHADarkPrimaryColor,
  setHADarkMode,
  waitForThemeSync,
  screenshotPanelHero,
  hexToRgb,
  computeDarkVariant,
  resetTestColorState,
  PANELS,
  type PanelColors,
} from "./helpers";

/* ------------------------------------------------------------------ */
/*  Shared setup: login before each test, reset color state            */
/* ------------------------------------------------------------------ */

test.beforeEach(async ({ page }) => {
  resetTestColorState();
  await loginToHA(page);
});

/* ================================================================== */
/*  Group 1: Basic Sync (4 tests)                                      */
/* ================================================================== */

test.describe("Group 1: Basic Sync", () => {
  test("1.1 Panel loads with HA primary color on initial render", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");

    // Read HA primary color after navigation (same page context)
    const haPrimary = await getHAPrimaryColor(page);
    await waitForThemeSync(page, "woow_knx", haPrimary, 8000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      haPrimary.toLowerCase()
    );
  });

  test("1.2 Panel follows when HA primary color changes", async ({ page }) => {
    const testColor = "#e91e63"; // pink

    await navigateToPanel(page, "woow_knx");

    // Wait for initial sync
    const currentHA = await getHAPrimaryColor(page);
    await waitForThemeSync(page, "woow_knx", currentHA, 6000);

    // Change HA primary color
    await setHAPrimaryColor(page, testColor);

    // Panel should follow within polling interval + buffer
    await waitForThemeSync(page, "woow_knx", testColor, 5000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      testColor.toLowerCase()
    );
  });

  test("1.3 All 5 CSS variables update correctly", async ({ page }) => {
    const testColor = "#2196f3"; // blue

    await navigateToPanel(page, "woow_knx");
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, "woow_knx", testColor, 5000);

    const colors = await getPanelColors(page, "woow_knx");

    // --protocol-primary
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      testColor.toLowerCase()
    );

    // --protocol-primary-dark exists and is non-empty
    expect(colors["--protocol-primary-dark"]).toBeTruthy();

    // --protocol-glow: rgba(r,g,b,0.15)
    const { r, g, b } = hexToRgb(testColor);
    expect(colors["--protocol-glow"]).toContain(`${r}`);
    expect(colors["--protocol-glow"]).toContain(`${g}`);
    expect(colors["--protocol-glow"]).toContain(`${b}`);
    expect(colors["--protocol-glow"]).toContain("0.15");

    // --protocol-glow-strong: rgba(r,g,b,0.25)
    expect(colors["--protocol-glow-strong"]).toContain("0.25");

    // --protocol-gradient: linear-gradient(135deg, primary, dark)
    expect(colors["--protocol-gradient"]).toContain("linear-gradient");
    expect(colors["--protocol-gradient"].toLowerCase()).toContain(
      testColor.toLowerCase()
    );
  });

  test("1.4 Sequential color changes land on final color", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");

    const colorA = "#ff5722"; // deep orange
    const colorB = "#9c27b0"; // purple
    const colorC = "#00bcd4"; // cyan

    // Change A → B → C with small pauses
    await setHAPrimaryColor(page, colorA);
    await page.waitForTimeout(500);
    await setHAPrimaryColor(page, colorB);
    await page.waitForTimeout(500);
    await setHAPrimaryColor(page, colorC);

    // Wait for final sync
    await waitForThemeSync(page, "woow_knx", colorC, 5000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      colorC.toLowerCase()
    );
  });
});

/* ================================================================== */
/*  Group 2: Color Parsing & Edge Values (4 tests)                     */
/* ================================================================== */

test.describe("Group 2: Color Parsing & Edge Values", () => {
  test("2.1 Pure black #000000 — glow renders correctly", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");
    await setHAPrimaryColor(page, "#000000");
    await waitForThemeSync(page, "woow_knx", "#000000", 5000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"]).toBe("#000000");
    expect(colors["--protocol-glow"]).toMatch(
      /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/
    );
  });

  test("2.2 Pure white #ffffff — glow renders correctly", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");
    await setHAPrimaryColor(page, "#ffffff");
    await waitForThemeSync(page, "woow_knx", "#ffffff", 5000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"]).toBe("#ffffff");
    expect(colors["--protocol-glow"]).toMatch(
      /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.15\s*\)/
    );
    expect(colors["--protocol-glow-strong"]).toMatch(
      /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.25\s*\)/
    );
  });

  test("2.3 High saturation #ff0000 — RGB parsed correctly", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");
    await setHAPrimaryColor(page, "#ff0000");
    await waitForThemeSync(page, "woow_knx", "#ff0000", 5000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"]).toBe("#ff0000");
    expect(colors["--protocol-glow"]).toMatch(
      /rgba\(\s*255\s*,\s*0\s*,\s*0\s*,\s*0\.15\s*\)/
    );
  });

  test("2.4 --dark-primary-color fallback when equal to primary", async ({ page }) => {
    await navigateToPanel(page, "woow_knx");

    // Set a color with normal dark variant first
    const testColor = "#607d8b"; // blue grey
    await setHAPrimaryColor(page, testColor);
    await waitForThemeSync(page, "woow_knx", testColor, 5000);

    // Now simulate fallback: set dark = primary (what syncThemeFromHA's
    // `dark || primary` produces when dark-primary-color is missing)
    await removeHADarkPrimaryColor(page);
    // Change primary to trigger re-sync (cache invalidation)
    const testColor2 = "#617d8b";
    await setHAPrimaryColor(page, testColor2);
    // After setHAPrimaryColor, dark was re-computed; remove again
    await removeHADarkPrimaryColor(page);
    await waitForThemeSync(page, "woow_knx", testColor2, 5000);

    const colors = await getPanelColors(page, "woow_knx");
    // dark = primary (both set to same value by removeHADarkPrimaryColor)
    // so --protocol-primary-dark should equal primary
    expect(colors["--protocol-primary-dark"].toLowerCase()).toBe(
      testColor2.toLowerCase()
    );
    // gradient should contain primary (appearing for both endpoints)
    expect(colors["--protocol-gradient"].toLowerCase()).toContain(
      testColor2.toLowerCase()
    );
  });
});

/* ================================================================== */
/*  Group 3: Dark Mode (2 tests)                                       */
/* ================================================================== */

test.describe("Group 3: Dark Mode", () => {
  test.afterEach(async ({ page }) => {
    // Always restore light mode
    try {
      await setHADarkMode(page, "light");
    } catch {
      // ignore if page already closed
    }
  });

  test("3.1 Panel follows HA primary color in dark mode", async ({ page }) => {
    // Switch to dark mode
    await setHADarkMode(page, "dark");
    await page.waitForTimeout(1000);

    const testColor = "#ff9800"; // orange
    await setHAPrimaryColor(page, testColor);

    await navigateToPanel(page, "woow_knx");
    await waitForThemeSync(page, "woow_knx", testColor, 6000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      testColor.toLowerCase()
    );
  });

  test("3.2 Dark → Light mode switch — no residual color", async ({
    page,
  }) => {
    const darkColor = "#f44336"; // red
    const lightColor = "#4caf50"; // green

    // Dark mode with red
    await setHADarkMode(page, "dark");
    await setHAPrimaryColor(page, darkColor);
    await navigateToPanel(page, "woow_knx");
    await waitForThemeSync(page, "woow_knx", darkColor, 8000);

    // Switch to light mode with green — extra settle time for mode switch
    await setHADarkMode(page, "light");
    await page.waitForTimeout(2000);
    await setHAPrimaryColor(page, lightColor);
    await page.waitForTimeout(500);
    await navigateToPanel(page, "woow_knx");
    await waitForThemeSync(page, "woow_knx", lightColor, 8000);

    const colors = await getPanelColors(page, "woow_knx");
    expect(colors["--protocol-primary"].toLowerCase()).toBe(
      lightColor.toLowerCase()
    );
    expect(colors["--protocol-primary"].toLowerCase()).not.toBe(
      darkColor.toLowerCase()
    );
  });
});

/* ================================================================== */
/*  Group 4: Stability & Timing (3 tests)                              */
/* ================================================================== */

test.describe("Group 4: Stability & Timing", () => {
  test("4.1 Sync completes within 3 seconds of color change", async ({
    page,
  }) => {
    const testColor = "#795548"; // brown
    await navigateToPanel(page, "woow_knx");

    // Wait for initial sync first
    const current = await getHAPrimaryColor(page);
    await waitForThemeSync(page, "woow_knx", current, 6000);

    // Now change color and measure time
    await setHAPrimaryColor(page, testColor);
    const elapsed = await waitForThemeSync(
      page,
      "woow_knx",
      testColor,
      5000
    );

    // Must sync within 3.5 seconds (polling 2s + DOM update overhead)
    expect(elapsed).toBeLessThanOrEqual(3500);
  });

  test("4.2 Rapid 5x color changes — settles on final color", async ({
    page,
  }) => {
    await navigateToPanel(page, "woow_knx");

    // Wait for initial sync
    const current = await getHAPrimaryColor(page);
    await waitForThemeSync(page, "woow_knx", current, 6000);

    const colors = [
      "#f44336",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5",
    ];

    // Rapid-fire color changes
    for (const c of colors) {
      await setHAPrimaryColor(page, c);
      await page.waitForTimeout(200);
    }

    const finalColor = colors[colors.length - 1];
    await waitForThemeSync(page, "woow_knx", finalColor, 6000);

    const panelColors = await getPanelColors(page, "woow_knx");
    expect(panelColors["--protocol-primary"].toLowerCase()).toBe(
      finalColor.toLowerCase()
    );
  });

  test("4.3 Page navigation away and back — iframe re-syncs", async ({
    page,
  }) => {
    const testColor = "#009688"; // teal
    await navigateToPanel(page, "woow_knx");
    await setHAPrimaryColor(page, testColor);

    // Confirm initial sync
    await waitForThemeSync(page, "woow_knx", testColor, 8000);

    // Navigate away (to overview) — re-apply override on overview page too
    await page.goto("/lovelace/0", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await setHAPrimaryColor(page, testColor);
    await page.waitForTimeout(1000);

    // Navigate back to panel (navigateToPanel re-applies color override)
    await navigateToPanel(page, "woow_knx");
    await waitForThemeSync(page, "woow_knx", testColor, 10000);

    const panelColors = await getPanelColors(page, "woow_knx");
    expect(panelColors["--protocol-primary"].toLowerCase()).toBe(
      testColor.toLowerCase()
    );
  });
});

/* ================================================================== */
/*  Group 5: Cross-Panel Consistency (3 tests)                         */
/* ================================================================== */

test.describe("Group 5: Cross-Panel Consistency", () => {
  test("5.1 Default state — all 3 panels have identical colors", async ({
    page,
  }) => {
    const haPrimary = await getHAPrimaryColor(page);

    const allColors: Record<string, PanelColors> = {};

    for (const panel of PANELS) {
      await navigateToPanel(page, panel);
      await waitForThemeSync(page, panel, haPrimary, 6000);
      allColors[panel] = await getPanelColors(page, panel);
    }

    const knx = allColors["woow_knx"];
    const dmx = allColors["woow_dmx"];
    const modbus = allColors["woow_modbus"];

    for (const v of [
      "--protocol-primary",
      "--protocol-primary-dark",
      "--protocol-glow",
      "--protocol-glow-strong",
    ] as const) {
      expect(knx[v]).toBe(dmx[v]);
      expect(knx[v]).toBe(modbus[v]);
    }
  });

  test("5.2 After color change — all 3 panels match new color", async ({
    page,
  }) => {
    const testColor = "#ff5722"; // deep orange

    await setHAPrimaryColor(page, testColor);

    const allColors: Record<string, PanelColors> = {};

    for (const panel of PANELS) {
      await navigateToPanel(page, panel);
      await waitForThemeSync(page, panel, testColor, 6000);
      allColors[panel] = await getPanelColors(page, panel);
    }

    // All should match testColor
    for (const panel of PANELS) {
      expect(allColors[panel]["--protocol-primary"].toLowerCase()).toBe(
        testColor.toLowerCase()
      );
    }

    // Cross-panel glow values must match
    const knx = allColors["woow_knx"];
    const dmx = allColors["woow_dmx"];
    const modbus = allColors["woow_modbus"];

    expect(knx["--protocol-glow"]).toBe(dmx["--protocol-glow"]);
    expect(knx["--protocol-glow"]).toBe(modbus["--protocol-glow"]);
    expect(knx["--protocol-glow-strong"]).toBe(dmx["--protocol-glow-strong"]);
    expect(knx["--protocol-glow-strong"]).toBe(
      modbus["--protocol-glow-strong"]
    );
  });

  test("5.3 Visual — 3 panels hero backgrounds are identical", async ({
    page,
  }) => {
    const testColor = "#673ab7"; // deep purple

    await setHAPrimaryColor(page, testColor);

    // Collect hero background-image from each panel
    const heroBackgrounds: string[] = [];

    for (const panel of PANELS) {
      await navigateToPanel(page, panel);
      await waitForThemeSync(page, panel, testColor, 6000);

      // Also capture screenshot for visual record
      try {
        await screenshotPanelHero(page, panel, `test-results/hero-${panel}.png`);
      } catch {
        // screenshot is bonus — don't fail test
      }

      const bgImage = await page.evaluate(() => {
        const ha = document.querySelector("home-assistant") as any;
        const main = ha?.shadowRoot?.querySelector("home-assistant-main");
        const panelIframe =
          main?.shadowRoot?.querySelector("ha-panel-iframe");
        const iframe = panelIframe?.shadowRoot?.querySelector(
          "iframe"
        ) as HTMLIFrameElement | null;
        if (!iframe?.contentDocument) return "";

        const hero = iframe.contentDocument.querySelector(".hero");
        if (!hero) return "";
        return getComputedStyle(hero).backgroundImage;
      });

      heroBackgrounds.push(bgImage);
    }

    // All 3 hero backgrounds should be identical gradient
    expect(heroBackgrounds[0]).toBeTruthy();
    expect(heroBackgrounds[0]).toBe(heroBackgrounds[1]);
    expect(heroBackgrounds[0]).toBe(heroBackgrounds[2]);
  });
});
