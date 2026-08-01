import { defineConfig } from "@playwright/test";

const viewports = [
  ["mobile-320x568", 320, 568],
  ["mobile-390x844", 390, 844],
  ["landscape-844x390", 844, 390],
  ["tablet-768x1024", 768, 1024],
  ["pwa-standalone-430x932", 430, 932],
] as const;
const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3100";
const port = new URL(baseURL).port || "3100";

export default defineConfig({
  testDir: "./tests/civic-graph",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  use: { baseURL, trace: "retain-on-failure" },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${port}`,
        url: `${baseURL.replace(/\/$/, "")}/comun/territorios?experiencia=app-v2`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
