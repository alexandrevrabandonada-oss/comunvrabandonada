import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.COMUN_FIRST_PILOT_BASE_URL ?? "http://127.0.0.1:3020";

export default defineConfig({
  testDir: "./tests/comun-first-pilot-integrated",
  globalSetup: "./tests/comun-integral-experience/global-setup.mjs",
  globalTeardown: "./tests/comun-integral-experience/global-teardown.mjs",
  timeout: 60_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    { name: "1366x768", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: "node scripts/comun-local-env.mjs run npm run dev -- --port 3020",
    url: `${baseURL}/comun`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
