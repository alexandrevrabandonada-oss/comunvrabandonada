import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/sidewalk-production-controlled",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.COMUN_CONTROLLED_CONTRIBUTION_BASE_URL,
    trace: "retain-on-failure",
  },
});
