import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3144";

export default defineConfig({
  testDir: "./tests/google-auth-local",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/solo/run-p1g-google-auth-test-server.mjs",
    url: `${baseURL}/comun/entrar`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
