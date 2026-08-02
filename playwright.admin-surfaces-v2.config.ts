import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/admin-surfaces-v2",
  globalSetup: "./tests/fixtures/comun/operational-visual-global-setup.mjs",
  globalTeardown: "./tests/fixtures/comun/operational-global-teardown.mjs",
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "320x568", use: { viewport: { width: 320, height: 568 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "landscape", use: { viewport: { width: 844, height: 390 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    {
      name: "1366x768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "node scripts/comun-local-env.mjs run npm run dev",
        url: "http://127.0.0.1:3000/comun",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
