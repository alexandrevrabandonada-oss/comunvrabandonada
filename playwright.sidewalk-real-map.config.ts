import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sidewalk-real-map",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
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
        env: {
          ...process.env,
          NEXT_PUBLIC_SIDEWALK_BASEMAP_PROVIDER: "realVoltaRedonda",
          NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL:
            "/maps/volta-redonda/volta-redonda.pmtiles",
        },
      },
  projects: [
    { name: "360x800", use: { viewport: { width: 360, height: 800 } } },
    { name: "390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "1024x768", use: { viewport: { width: 1024, height: 768 } } },
    { name: "1366x768", use: { viewport: { width: 1366, height: 768 } } },
  ],
});
