import { defineConfig } from "@playwright/test";

const viewports = [
  ["320x568-low-android", 320, 568, true, 1],
  ["360x640-android", 360, 640, true, 2],
  ["375x667-small-iphone", 375, 667, true, 2],
  ["390x844-current-iphone", 390, 844, true, 3],
  ["412x915-mid-android", 412, 915, true, 2],
  ["768x1024-tablet", 768, 1024, true, 2],
  ["1024x768-tablet-landscape", 1024, 768, false, 1],
  ["1280x720-modest-desktop", 1280, 720, false, 1],
  ["1440x900-desktop", 1440, 900, false, 1],
] as const;

const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3022";

export default defineConfig({
  testDir: "./tests/quality-performance",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: viewports.map(
    ([name, width, height, hasTouch, deviceScaleFactor]) => ({
      name,
      use: { viewport: { width, height }, hasTouch, deviceScaleFactor },
    }),
  ),
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command:
            process.env.COMUN_QUALITY_SERVER_COMMAND ??
            "npm run dev -- --port 3022",
          url: `${baseURL}/comun`,
          reuseExistingServer: true,
          timeout: 180_000,
          env: { NEXT_PUBLIC_COMUN_WEB_VITALS_SAMPLE_RATE: "1" },
        },
});
