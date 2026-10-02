import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/maplibre-migration",
  timeout: 60_000,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107/comun/calcadas",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } } },
    { name: "mobile-viewport", use: { viewport: { width: 390, height: 844 } } },
  ],
});
