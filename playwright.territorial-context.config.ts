import { defineConfig } from "@playwright/test";

const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./tests/territorial-context",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } } },
  ],
});
