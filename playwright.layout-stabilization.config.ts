import { defineConfig } from "@playwright/test";

const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3130";
const port = new URL(baseURL).port || "3130";
const viewports = [
  ["320x568", 320, 568],
  ["360x740", 360, 740],
  ["360x800", 360, 800],
  ["390x844", 390, 844],
  ["412x915", 412, 915],
  ["landscape-844x390", 844, 390],
  ["tablet-768x1024", 768, 1024],
  ["desktop-1366x768", 1366, 768],
  ["pwa-standalone-430x932", 430, 932],
] as const;

export default defineConfig({
  testDir: "./tests/layout-stabilization",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL, trace: "retain-on-failure" },
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${port}`,
        url: `${baseURL.replace(/\/$/, "")}/comun/participar?experiencia=app-v2`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
