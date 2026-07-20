import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/comun-community-experience",
  globalSetup: "./tests/comun-community-experience/global-setup.mjs",
  globalTeardown: "./tests/comun-community-experience/global-teardown.mjs",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3017",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    {
      name: "1366x768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: "node scripts/comun-local-env.mjs run npm run dev -- --port 3017",
    url: "http://127.0.0.1:3017/comun/comunidades",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
