import { defineConfig } from "@playwright/test";

const baseURL = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3131";
const port = new URL(baseURL).port || "3131";
const viewports = [
  ["320x568", 320, 568],
  ["360x800", 360, 800],
  ["390x844", 390, 844],
  ["landscape-844x390", 844, 390],
  ["desktop-1366x768", 1366, 768],
  ["pwa-standalone-430x932", 430, 932],
] as const;

export default defineConfig({
  testDir: "./tests/default-experience-promotion",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: { baseURL, trace: "retain-on-failure" },
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: `npm run dev -- -p ${port}`,
          url: `${baseURL.replace(/\/$/, "")}/comun`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
