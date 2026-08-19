/**
 * Shared helpers for the Woow Multi-Protocol Connect panel Playwright tests.
 *
 * The merged integration ships ONE sidebar panel at /woow_multi_protocol,
 * rendered as a NATIVE custom element (`embed_iframe: false`) — not an iframe.
 * Because the panel lives inside HA's own shadow DOM, it inherits HA's theme
 * CSS custom properties (`--primary-color`, `--primary-background-color`, …)
 * directly: theme sync is a property of CSS inheritance, not a polling script.
 * These helpers therefore reach the custom element through the shadow tree and
 * read *computed* styles, rather than reaching into an iframe document.
 *
 * Point at another instance with HA_URL (see playwright.config.ts baseURL).
 */

import { type Page } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const HA_USER = process.env.HA_USER || "admin";
export const HA_PASS = process.env.HA_PASS || "admin";

/** The single panel and the protocols it can show as tabs. */
export const PANEL = "woow_multi_protocol";
export const PANEL_TAG = "woow-multi-protocol-panel";
export const PROTOCOLS = ["knx", "dmx", "modbus"] as const;
export const PROTOCOL_LABELS = ["KNX", "DMX", "Modbus"] as const;
export type Protocol = (typeof PROTOCOLS)[number];

/* ------------------------------------------------------------------ */
/*  Deep shadow-DOM finder (installed on every navigation)            */
/* ------------------------------------------------------------------ */

/**
 * Register `window.__woowDeepFind(selector)` on every page load. It walks the
 * whole DOM including shadow roots and returns the first matching element, so
 * we don't hard-code HA's exact wrapper chain (home-assistant →
 * home-assistant-main → partial-panel-resolver → ha-panel-custom → the tag).
 */
export async function installDeepFind(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__woowDeepFind = (selector: string, root: Document | ShadowRoot = document) => {
      const direct = root.querySelector(selector);
      if (direct) return direct;
      const els = root.querySelectorAll("*");
      for (const el of els) {
        const sr = (el as any).shadowRoot;
        if (sr) {
          const found = (window as any).__woowDeepFind(selector, sr);
          if (found) return found;
        }
      }
      return null;
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Login                                                              */
/* ------------------------------------------------------------------ */

export async function loginToHA(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  if (!page.url().includes("/auth/")) {
    const ha = await page.locator("home-assistant").count();
    if (ha > 0) return; // already authenticated
  }

  const usernameField = page.locator('input[name="username"]');
  try {
    await usernameField.waitFor({ timeout: 8000 });
  } catch {
    return; // no login form — session already established
  }

  await page.fill('input[name="username"]', HA_USER);
  await page.fill('input[name="password"]', HA_PASS);
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

  await page.waitForURL((url) => !url.pathname.includes("/auth/"), { timeout: 15_000 });
  await page.waitForTimeout(2000);
}

/* ------------------------------------------------------------------ */
/*  Test-level color override state                                    */
/* ------------------------------------------------------------------ */

const _testColorState: { primary: string | null; dark: string | null } = {
  primary: null,
  dark: null,
};

export function resetTestColorState(): void {
  _testColorState.primary = null;
  _testColorState.dark = null;
}

/**
 * Apply the current test color override to documentElement and mutate the live
 * theme data so HA won't overwrite it on re-render. CSS custom properties
 * inherit across shadow boundaries, so this reaches the panel element too.
 */
async function applyTestColorOverride(page: Page): Promise<void> {
  if (!_testColorState.primary) return;
  const { primary, dark } = _testColorState;
  await page.evaluate(
    ({ p, d }) => {
      document.documentElement.style.setProperty("--primary-color", p);
      if (d) document.documentElement.style.setProperty("--dark-primary-color", d);

      const ha = document.querySelector("home-assistant") as any;
      for (const mode of ["light", "dark"]) {
        const m = ha?.hass?.themes?.themes?.Woow?.modes?.[mode];
        if (m) {
          m["primary-color"] = p;
          if (d) m["dark-primary-color"] = d;
        }
      }

      if ((window as any).__themeOverrideInterval) {
        clearInterval((window as any).__themeOverrideInterval);
      }
      (window as any).__themeOverrideColor = p;
      (window as any).__themeOverrideInterval = setInterval(() => {
        const target = (window as any).__themeOverrideColor;
        if (!target) return;
        const cur = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary-color")
          .trim();
        if (cur !== target) {
          document.documentElement.style.setProperty("--primary-color", target);
        }
      }, 200);
    },
    { p: primary, d: dark }
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Navigate to the single panel and wait for the custom element to be defined
 * and attached. Re-applies any active test color override afterwards.
 */
export async function navigateToPanel(page: Page): Promise<void> {
  // Retry a transient navigation once — against a real (slower) instance the
  // first goto occasionally races the frontend boot / auth redirect.
  try {
    await page.goto(`/${PANEL}`, { waitUntil: "domcontentloaded" });
  } catch {
    await page.waitForTimeout(1000);
    await page.goto(`/${PANEL}`, { waitUntil: "domcontentloaded" });
  }
  await applyTestColorOverride(page);

  // Wait until the custom element is defined, attached, and has rendered its
  // tab strip. waitForFunction polls in-page, which is more robust on a real
  // (slower) instance than a fixed attempt loop.
  await page.waitForFunction(
    (tag) => {
      const defined = !!customElements.get(tag);
      const el = (window as any).__woowDeepFind?.(tag);
      return (
        defined &&
        !!el &&
        !!el.shadowRoot &&
        el.shadowRoot.querySelectorAll(".proto-tab").length > 0
      );
    },
    PANEL_TAG,
    { timeout: 20_000, polling: 500 }
  );

  await applyTestColorOverride(page);
  await page.waitForTimeout(500);
}

/* ------------------------------------------------------------------ */
/*  Panel structure                                                    */
/* ------------------------------------------------------------------ */

export interface PanelTabs {
  tabs: string[];
  active: string[];
}

/** Read the protocol tab labels and which one is active. */
export async function getPanelTabs(page: Page): Promise<PanelTabs> {
  return page.evaluate((tag) => {
    const panel = (window as any).__woowDeepFind(tag);
    if (!panel?.shadowRoot) throw new Error("panel element not found");
    const tabs = [...panel.shadowRoot.querySelectorAll(".proto-tab")] as HTMLElement[];
    return {
      tabs: tabs.map((t) => t.textContent!.trim()),
      active: tabs
        .filter((t) => t.classList.contains("active"))
        .map((t) => t.textContent!.trim()),
    };
  }, PANEL_TAG);
}

/** Click a protocol tab by its visible label (e.g. "DMX"). */
export async function clickProtocolTab(page: Page, label: string): Promise<boolean> {
  const clicked = await page.evaluate(
    ({ tag, lbl }) => {
      const panel = (window as any).__woowDeepFind(tag);
      const tabs = [...panel.shadowRoot.querySelectorAll(".proto-tab")] as HTMLElement[];
      const t = tabs.find((x) => x.textContent!.trim() === lbl);
      if (t) {
        t.click();
        return true;
      }
      return false;
    },
    { tag: PANEL_TAG, lbl: label }
  );
  await page.waitForTimeout(300);
  return clicked;
}

/* ------------------------------------------------------------------ */
/*  Theme reading                                                      */
/* ------------------------------------------------------------------ */

/** HA's --primary-color from the top-level document (as authored, e.g. #03a9f4). */
export async function getHAPrimaryColor(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim()
  );
}

/** HA's --primary-background-color from the top-level document. */
export async function getHABackgroundColor(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-background-color")
      .trim()
  );
}

/**
 * Override a CSS custom property on the top-level document (or clear it with
 * null). Used to prove the panel *follows* a theme variable — HA swaps
 * --primary-background-color in dark mode, so following it == being dark-aware,
 * without depending on flaky programmatic dark-mode toggling.
 */
export async function overrideDocCssVar(
  page: Page,
  name: string,
  value: string | null
): Promise<void> {
  await page.evaluate(
    ({ n, v }) => {
      if (v === null) document.documentElement.style.removeProperty(n);
      else document.documentElement.style.setProperty(n, v);
    },
    { n: name, v: value }
  );
  await page.waitForTimeout(300);
}

/** A CSS custom property as *inherited by the panel element* (resolved value). */
export async function getPanelCssVar(page: Page, varName: string): Promise<string> {
  return page.evaluate(
    ({ tag, v }) => {
      const panel = (window as any).__woowDeepFind(tag);
      if (!panel) throw new Error("panel element not found");
      return getComputedStyle(panel).getPropertyValue(v).trim();
    },
    { tag: PANEL_TAG, v: varName }
  );
}

/**
 * The active protocol tab's computed border-bottom color — this is where the
 * panel actually *paints* `var(--primary-color)`, so it proves theme sync
 * reached rendered pixels, not just an inherited variable. Returns "rgb(...)".
 */
export async function getActiveTabColor(page: Page): Promise<string> {
  return page.evaluate((tag) => {
    const panel = (window as any).__woowDeepFind(tag);
    const tab =
      panel?.shadowRoot?.querySelector(".proto-tab.active") ||
      panel?.shadowRoot?.querySelector(".proto-tab");
    if (!tab) throw new Error("no protocol tab found");
    return getComputedStyle(tab).borderBottomColor;
  }, PANEL_TAG);
}

/** The panel host's computed background color (follows --primary-background-color). */
export async function getPanelBackground(page: Page): Promise<string> {
  return page.evaluate((tag) => {
    const panel = (window as any).__woowDeepFind(tag);
    if (!panel) throw new Error("panel element not found");
    return getComputedStyle(panel).backgroundColor;
  }, PANEL_TAG);
}

/* ------------------------------------------------------------------ */
/*  Theme writing                                                      */
/* ------------------------------------------------------------------ */

export async function setHAPrimaryColor(page: Page, hexColor: string): Promise<void> {
  _testColorState.primary = hexColor;
  _testColorState.dark = computeDarkVariant(hexColor);
  await applyTestColorOverride(page);
}

/* ------------------------------------------------------------------ */
/*  Polling / sync wait                                                */
/* ------------------------------------------------------------------ */

/**
 * Wait until the active tab's painted color matches the expected hex.
 * Returns elapsed ms; throws with a descriptive message on timeout.
 */
export async function waitForThemeSync(
  page: Page,
  expectedHex: string,
  timeoutMs = 5000
): Promise<number> {
  const expected = normalizeToRgbTriplet(expectedHex);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const actual = normalizeToRgbTriplet(await getActiveTabColor(page));
      if (actual === expected) return Date.now() - start;
    } catch {
      // panel not ready yet
    }
    await page.waitForTimeout(300);
  }

  const actual = await getActiveTabColor(page);
  throw new Error(
    `Theme sync timeout after ${timeoutMs}ms. Expected tab color ${expectedHex} ` +
      `(${expected}) but got "${actual}" (${normalizeToRgbTriplet(actual)}).`
  );
}

/* ------------------------------------------------------------------ */
/*  Color utilities                                                    */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** ~30% darker, matching the old dark-variant convention. */
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
 * Normalize a hex ("#03a9f4") or a computed rgb/rgba string
 * ("rgb(3, 169, 244)") to a canonical "r,g,b" triplet for comparison.
 */
export function normalizeToRgbTriplet(color: string): string {
  const c = color.trim();
  if (c.startsWith("#")) {
    const { r, g, b } = hexToRgb(c);
    return `${r},${g},${b}`;
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  return c;
}
