import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  retries: 1, // retry once for timing-sensitive tests
  workers: 1, // sequential — shares one HA session
  use: {
    baseURL: "http://localhost:15126",
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],
});
