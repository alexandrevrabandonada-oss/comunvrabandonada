import { defineConfig } from "@playwright/test";

const viewports = [
  ["mobile-360", 360, 800],
  ["mobile-390", 390, 844],
  ["tablet", 768, 1024],
  ["desktop", 1366, 768],
  ["wide", 1920, 1080],
] as const;

export default defineConfig({
  testDir: "./tests/miniapp-experience",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "node scripts/comun-local-env.mjs run npm run dev",
        url: "http://127.0.0.1:3000/comun/calcadas",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
