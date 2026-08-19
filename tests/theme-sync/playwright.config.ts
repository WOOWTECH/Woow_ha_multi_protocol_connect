import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  // These are live tests against a real HA instance; a couple retries absorb
  // navigation/boot timing jitter that a mocked page would not have.
  retries: 2,
  workers: 1, // sequential — shares one HA session
  use: {
    // Override with HA_URL to run against the physical rig, e.g.
    //   HA_URL=http://192.168.2.6:8123 npx playwright test
    baseURL: process.env.HA_URL || "http://localhost:15126",
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],
});
