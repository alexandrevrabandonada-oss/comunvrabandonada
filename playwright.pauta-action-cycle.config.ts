import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "pauta-action-cycle.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3114",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3114",
    url: "http://127.0.0.1:3114/comun/preview/esteira-politica",
    reuseExistingServer: false,
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES: "enabled",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-popular",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
