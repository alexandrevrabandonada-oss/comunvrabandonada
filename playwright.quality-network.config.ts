import { defineConfig } from "@playwright/test";

const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3022";

export default defineConfig({
  testDir: "./tests/quality-performance",
  grep: /@network/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "allow",
  },
  projects: [
    {
      name: "320x568-low-android",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
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
          env: { NEXT_PUBLIC_COMUN_WEB_VITALS_SAMPLE_RATE: "0" },
        },
});
