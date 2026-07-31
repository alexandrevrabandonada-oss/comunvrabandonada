import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/comun-nucleo-vivo",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: "npm run dev",
          url: `${(process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")}/comun`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
