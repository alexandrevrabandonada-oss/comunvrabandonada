import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3137";
const viewports = [
  ["320x568", 320, 568],
  ["390x844", 390, 844],
  ["landscape-844x390", 844, 390],
  ["768x1024", 768, 1024],
  ["pwa-standalone-430x932", 430, 932],
] as const;

export default defineConfig({
  testDir: "./tests/comun-bus",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  projects: viewports.map(([name, width, height]) => ({ name, use: { viewport: { width, height } } })),
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/comun-local-env.mjs run node scripts/comun-relata-test-server.mjs",
    url: `${baseURL}/comun/onibus`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
