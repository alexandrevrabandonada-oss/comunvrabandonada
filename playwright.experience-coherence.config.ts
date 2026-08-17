import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/experience-coherence",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "430x932", use: { viewport: { width: 430, height: 932 } } },
    { name: "768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    {
      name: "1366x768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: "1440x900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: "npm run dev",
          url: `${process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000"}/comun`,
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            ...process.env,
            COMUN_PAUTAS_VIVAS_CORE_ENABLED: "enabled",
            COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED: "enabled",
            COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
          },
        },
});
