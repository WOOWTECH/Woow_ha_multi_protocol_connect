/**
 * Shared helpers for HA panel theme-sync Playwright tests.
 *
 * All functions assume the browser is pointed at http://localhost:15126
 * with a running Home Assistant instance (container: ha-protocol).
 */

import { type Page, type Frame, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const HA_URL = "http://localhost:15126";
export const HA_USER = "admin";
export const HA_PASS = "admin"; // matches auth_provider storage

export const PANELS = ["woow_knx", "woow_dmx", "woow_modbus"] as const;
export type PanelId = (typeof PANELS)[number];

/** CSS custom properties set by syncThemeFromHA() */
export const THEME_VARS = [
  "--protocol-primary",
  "--protocol-primary-dark",
  "--protocol-glow",
  "--protocol-glow-strong",
  "--protocol-gradient",
] as const;

/* ------------------------------------------------------------------ */
/*  Login                                                              */
/* ------------------------------------------------------------------ */

/**
 * Log in to Home Assistant if not already authenticated.
 * Detects whether we're on the login page or already inside HA.
 *
 * HA login form structure (light DOM, no shadow roots):
 *   ha-authorize > ha-auth-flow > form > ha-auth-form >
 *     input[name="username"] + input[name="password"] + ha-button "Log in"
 */
export async function loginToHA(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // If already logged in, the URL will be /lovelace or similar
  if (!page.url().includes("/auth/")) {
    // Check if already on a panel / dashboard
    const ha = await page.locator("home-assistant").count();
    if (ha > 0) return; // already authenticated
  }

  // Wait for the login form inputs to appear (HA frontend boot)
  await page.waitForSelector('input[name="username"]', { timeout: 15_000 });

  // Fill username
  await page.fill('input[name="username"]', HA_USER);

  // Fill password
  await page.fill('input[name="password"]', HA_PASS);

  // Click the "Log in" button
  await page.evaluate(() => {
    const buttons = document.querySelectorAll("ha-button");
    for (const btn of buttons) {
      if (btn.textContent?.trim() === "Log in") {
        (btn as HTMLElement).click();
        return;
      }
    }
    throw new Error("Log in button not found");
  });

  // Wait for redirect to dashboard
  await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
    timeout: 15_000,
  });
  await page.waitForTimeout(2000); // let HA frontend fully initialize
}

/* ------------------------------------------------------------------ */
/*  Test-level color override state                                    */
/* ------------------------------------------------------------------ */

/**
 * Stores the test-overridden primary color (and dark variant) so that
 * navigateToPanel can re-apply them after every page.goto().
 *
 * HA applies its Woow theme on every page load, which resets any inline
 * CSS overrides set via `style.setProperty`. We work around this by
 * re-applying our test color after each navigation.
 */
const _testColorState: {
  primary: string | null;
  dark: string | null;
} = { primary: null, dark: null };

/**
 * Reset the test color override state. Call in beforeEach to isolate tests.
 */
export function resetTestColorState(): void {
  _testColorState.primary = null;
  _testColorState.dark = null;
}

/**
 * Apply current test color override to the page's documentElement.
 * Also mutates the live hass.themes data so HA won't overwrite it.
 */
async function applyTestColorOverride(page: Page): Promise<void> {
  if (!_testColorState.primary) return;
  const { primary, dark } = _testColorState;
  await page.evaluate(
    ({ p, d }) => {
      // Set inline CSS properties
      document.documentElement.style.setProperty("--primary-color", p);
      if (d) {
        document.documentElement.style.setProperty("--dark-primary-color", d);
      }

      // Mutate the Woow theme data so HA doesn't overwrite on re-render
      const ha = document.querySelector("home-assistant") as any;
      if (ha?.hass?.themes?.themes?.Woow?.modes?.light) {
        ha.hass.themes.themes.Woow.modes.light["primary-color"] = p;
        if (d) {
          ha.hass.themes.themes.Woow.modes.light["dark-primary-color"] = d;
        }
      }
      if (ha?.hass?.themes?.themes?.Woow?.modes?.dark) {
        ha.hass.themes.themes.Woow.modes.dark["primary-color"] = p;
        if (d) {
          ha.hass.themes.themes.Woow.modes.dark["dark-primary-color"] = d;
        }
      }

      // Set up a polling override that re-applies the color every 200ms
      // to combat HA's async theme re-application after navigation.
      // Clear any previous override interval.
      if ((window as any).__themeOverrideInterval) {
        clearInterval((window as any).__themeOverrideInterval);
      }
      (window as any).__themeOverrideColor = p;
      (window as any).__themeOverrideDark = d;
      (window as any).__themeOverrideInterval = setInterval(() => {
        const target = (window as any).__themeOverrideColor;
        if (!target) return;
        const cur = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary-color").trim();
        if (cur !== target) {
          document.documentElement.style.setProperty("--primary-color", target);
          const dk = (window as any).__themeOverrideDark;
          if (dk) {
            document.documentElement.style.setProperty("--dark-primary-color", dk);
          }
        }
      }, 200);
    },
    { p: primary, d: dark }
  );
}

/* ------------------------------------------------------------------ */
/*  iframe access                                                      */
/* ------------------------------------------------------------------ */

/**
 * Navigate to a panel and return the inner iframe Frame handle.
 *
 * HA's DOM structure:
 *   home-assistant (shadow)
 *     → home-assistant-main (shadow)
 *       → ha-panel-iframe (shadow)
 *         → <iframe src="…/panel.html">
 */
export async function navigateToPanel(
  page: Page,
  panel: PanelId
): Promise<Frame> {
  await page.goto(`/${panel}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000); // iframe load

  // Re-apply any test color override (HA theme reset it on navigation)
  await applyTestColorOverride(page);

  // Wait for iframe to appear with retry
  let iframeSrc: string | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    iframeSrc = await page.evaluate(() => {
      const ha = document.querySelector("home-assistant");
      const main = (ha as any)?.shadowRoot?.querySelector("home-assistant-main");
      const panelIframe = (main as any)?.shadowRoot?.querySelector("ha-panel-iframe");
      const iframe = (panelIframe as any)?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
      return iframe?.src || null;
    });
    if (iframeSrc) break;
    await page.waitForTimeout(1000);
  }

  if (!iframeSrc) {
    throw new Error(`Could not find iframe for panel ${panel}`);
  }

  // Find matching frame with retry (iframe content may still be loading)
  let frame: Frame | undefined;
  for (let attempt = 0; attempt < 8; attempt++) {
    frame = page.frames().find((f) => f.url().includes(`/${panel}/frontend/panel.html`));
    if (frame) break;
    await page.waitForTimeout(1000);
    // Re-apply override on each retry (HA may overwrite during theme init)
    await applyTestColorOverride(page);
  }
  if (!frame) {
    throw new Error(`Frame not found for ${panel}. Available: ${page.frames().map((f) => f.url()).join(", ")}`);
  }

  // Final override application after iframe is confirmed
  await applyTestColorOverride(page);
  await page.waitForTimeout(1000); // let sync pick up the override
  return frame;
}

/* ------------------------------------------------------------------ */
/*  Theme color reading / writing                                      */
/* ------------------------------------------------------------------ */

/**
 * Read HA's --primary-color from the top-level document.
 */
export async function getHAPrimaryColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-color")
      .trim();
  });
}

/**
 * Read HA's --dark-primary-color from the top-level document.
 */
export async function getHADarkPrimaryColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--dark-primary-color")
      .trim();
  });
}

/**
 * Read all --protocol-* CSS variables from a panel iframe.
 */
export interface PanelColors {
  "--protocol-primary": string;
  "--protocol-primary-dark": string;
  "--protocol-glow": string;
  "--protocol-glow-strong": string;
  "--protocol-gradient": string;
}

export async function getPanelColors(page: Page, panel: PanelId): Promise<PanelColors> {
  return page.evaluate((p) => {
    const ha = document.querySelector("home-assistant");
    const main = (ha as any)?.shadowRoot?.querySelector("home-assistant-main");
    const panelIframe = (main as any)?.shadowRoot?.querySelector("ha-panel-iframe");
    const iframe = (panelIframe as any)?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!iframe?.contentDocument) throw new Error("iframe not accessible");
    const style = getComputedStyle(iframe.contentDocument.documentElement);
    return {
      "--protocol-primary": style.getPropertyValue("--protocol-primary").trim(),
      "--protocol-primary-dark": style.getPropertyValue("--protocol-primary-dark").trim(),
      "--protocol-glow": style.getPropertyValue("--protocol-glow").trim(),
      "--protocol-glow-strong": style.getPropertyValue("--protocol-glow-strong").trim(),
      "--protocol-gradient": style.getPropertyValue("--protocol-gradient").trim(),
    };
  }, panel);
}

/**
 * Check whether syncThemeFromHA function exists and _lastThemeColor value.
 */
export async function getSyncState(page: Page): Promise<{
  hasSyncFunc: boolean;
  lastThemeColor: string | null;
}> {
  return page.evaluate(() => {
    const ha = document.querySelector("home-assistant");
    const main = (ha as any)?.shadowRoot?.querySelector("home-assistant-main");
    const panelIframe = (main as any)?.shadowRoot?.querySelector("ha-panel-iframe");
    const iframe = (panelIframe as any)?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!iframe?.contentWindow) return { hasSyncFunc: false, lastThemeColor: null };
    return {
      hasSyncFunc: typeof (iframe.contentWindow as any).syncThemeFromHA === "function",
      lastThemeColor: (iframe.contentWindow as any)._lastThemeColor ?? null,
    };
  });
}

/**
 * Set HA primary color by overriding the CSS custom property and storing
 * the value so it can be re-applied after page navigations.
 */
export async function setHAPrimaryColor(
  page: Page,
  hexColor: string
): Promise<void> {
  const dark = computeDarkVariant(hexColor);
  _testColorState.primary = hexColor;
  _testColorState.dark = dark;

  await applyTestColorOverride(page);
}

/**
 * Set --dark-primary-color equal to --primary-color, simulating the
 * fallback behavior of syncThemeFromHA (which uses `dark || primary`).
 *
 * We can't truly remove --dark-primary-color because the Woow theme
 * always defines it, and using CSS `initial` corrupts other theme vars.
 * Instead, we set dark = primary to simulate the fallback result.
 */
export async function removeHADarkPrimaryColor(page: Page): Promise<void> {
  // Set dark equal to primary to simulate fallback
  const primary = _testColorState.primary;
  if (primary) {
    _testColorState.dark = primary;
  }
  await page.evaluate((p) => {
    if (p) {
      document.documentElement.style.setProperty("--dark-primary-color", p);
      const ha = document.querySelector("home-assistant") as any;
      if (ha?.hass?.themes?.themes?.Woow?.modes?.light) {
        ha.hass.themes.themes.Woow.modes.light["dark-primary-color"] = p;
      }
    }
  }, primary);
}

/**
 * Switch HA between light / dark / auto mode without navigating away.
 * Applies the dark-mode attribute and re-applies test color override.
 */
export async function setHADarkMode(
  page: Page,
  mode: "auto" | "light" | "dark"
): Promise<void> {
  await page.evaluate((m) => {
    const ha = document.querySelector("home-assistant") as any;

    // Apply directly
    if (m === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    // Also try WS API (best-effort, may not persist)
    if (ha?.hass?.connection) {
      ha.hass.connection.sendMessagePromise({
        type: "frontend/set_user_data",
        key: "core",
        value: {
          darkMode: m === "dark" ? true : m === "light" ? false : null,
        },
      }).catch(() => {});
    }
  }, mode);

  await page.waitForTimeout(500);

  // Re-apply test color override (dark mode toggle may reset theme)
  await applyTestColorOverride(page);
}

/* ------------------------------------------------------------------ */
/*  Polling / sync wait                                                */
/* ------------------------------------------------------------------ */

/**
 * Wait until the panel's --protocol-primary matches the expected color.
 * Polls every 500ms, fails after `timeoutMs`.
 */
export async function waitForThemeSync(
  page: Page,
  panel: PanelId,
  expectedColor: string,
  timeoutMs = 5000
): Promise<number> {
  const start = Date.now();
  const normalizedExpected = expectedColor.toLowerCase();

  while (Date.now() - start < timeoutMs) {
    try {
      const colors = await getPanelColors(page, panel);
      if (colors["--protocol-primary"].toLowerCase() === normalizedExpected) {
        return Date.now() - start; // return elapsed ms
      }
    } catch {
      // iframe might not be ready yet
    }
    await page.waitForTimeout(500);
  }

  // Final check — throw descriptive error
  const actual = await getPanelColors(page, panel);
  throw new Error(
    `Theme sync timeout after ${timeoutMs}ms. ` +
    `Expected --protocol-primary="${expectedColor}" ` +
    `but got "${actual["--protocol-primary"]}"`
  );
}

/* ------------------------------------------------------------------ */
/*  Color utilities                                                    */
/* ------------------------------------------------------------------ */

/**
 * Parse a hex color into {r, g, b}.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Build the expected glow string from a hex color and opacity.
 */
export function expectedGlow(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Build the expected gradient string from primary and dark colors.
 */
export function expectedGradient(primary: string, dark: string): string {
  return `linear-gradient(135deg, ${primary}, ${dark})`;
}

/**
 * Compute the dark variant the same way setHAPrimaryColor does (~30% darker).
 */
export function computeDarkVariant(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (
    "#" +
    Math.max(0, Math.floor(r * 0.7)).toString(16).padStart(2, "0") +
    Math.max(0, Math.floor(g * 0.7)).toString(16).padStart(2, "0") +
    Math.max(0, Math.floor(b * 0.7)).toString(16).padStart(2, "0")
  );
}

/**
 * Get computed background-color of a specific element inside the panel iframe.
 */
export async function getElementColor(
  page: Page,
  cssSelector: string
): Promise<string> {
  return page.evaluate((sel) => {
    const ha = document.querySelector("home-assistant") as any;
    const main = ha?.shadowRoot?.querySelector("home-assistant-main");
    const panelIframe = main?.shadowRoot?.querySelector("ha-panel-iframe");
    const iframe = panelIframe?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!iframe?.contentDocument) throw new Error("iframe not accessible");
    const el = iframe.contentDocument.querySelector(sel);
    if (!el) throw new Error(`Element "${sel}" not found in panel`);
    return getComputedStyle(el).backgroundColor;
  }, cssSelector);
}

/**
 * Take a screenshot of the hero section inside a panel iframe.
 */
export async function screenshotPanelHero(
  page: Page,
  panel: PanelId,
  path: string
): Promise<void> {
  // Get hero bounding box from inside iframe
  const box = await page.evaluate(() => {
    const ha = document.querySelector("home-assistant") as any;
    const main = ha?.shadowRoot?.querySelector("home-assistant-main");
    const panelIframe = main?.shadowRoot?.querySelector("ha-panel-iframe");
    const iframe = panelIframe?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!iframe) throw new Error("No iframe");

    const iframeRect = iframe.getBoundingClientRect();
    const hero = iframe.contentDocument?.querySelector(".hero");
    if (!hero) throw new Error("No .hero element");
    const heroRect = hero.getBoundingClientRect();

    return {
      x: iframeRect.x + heroRect.x,
      y: iframeRect.y + heroRect.y,
      width: heroRect.width,
      height: heroRect.height,
    };
  });

  await page.screenshot({ path, clip: box });
}
