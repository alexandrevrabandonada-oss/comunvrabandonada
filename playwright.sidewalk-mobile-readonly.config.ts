import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/sidewalk-mobile-readonly",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.COMUN_SIDEWALK_MOBILE_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "412x915", use: { viewport: { width: 412, height: 915 } } },
  ],
});
