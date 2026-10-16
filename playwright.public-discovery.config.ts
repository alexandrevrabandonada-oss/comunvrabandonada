import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/public-discovery",
  testMatch: "*.spec.ts",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/public-discovery/results.json" }],
  ],
  workers: 1,
  fullyParallel: false,
  outputDir: "test-results/public-discovery",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3150",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } } },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: "node tests/public-discovery/run-fixture.mjs start",
          url: "http://127.0.0.1:3150/comun/explorar",
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            COMUN_SOC_D09_FIXTURE: "LOCAL_SYNTHETIC_ONLY",
            SUPABASE_DB_URL: "",
            SUPABASE_ACCESS_TOKEN: "",
            SUPABASE_SERVICE_ROLE_KEY: "",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            NEXT_PUBLIC_SUPABASE_URL: "",
            COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
            COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
            COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "enabled",
          },
        },
});
