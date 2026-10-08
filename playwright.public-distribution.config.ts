import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "specialized-observatory-sharing.spec.ts",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3028",
    channel: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 -p 3028",
    url: "http://127.0.0.1:3028/comun/observatorios/ambiente/qualidade-dos-rios",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
      COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED: "enabled",
      COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED: "enabled",
    },
  },
});
