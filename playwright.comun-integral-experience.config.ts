import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/comun-integral-experience",
  globalSetup: "./tests/comun-integral-experience/global-setup.mjs",
  globalTeardown: "./tests/comun-integral-experience/global-teardown.mjs",
  // A matriz com cinco sessões levou até 51,4 s. O gate integral acrescenta
  // auditoria Axe e captura em cada etapa; 120 s é o orçamento medido por fluxo,
  // sem retry, skip ou espera artificial.
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    {
      name: "1440x900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: `${(process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")}/comun`,
        // O ensaio integral usa somente a release local já reconciliada. A
        // flag fica contida no processo descartável do servidor; produção
        // continua fail-closed e depende do ledger remoto exato.
        env: {
          ...process.env,
          COMUN_SIDEWALK_OPERATIONAL_V2: "enabled",
        },
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
