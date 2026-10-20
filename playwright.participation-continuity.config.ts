import { defineConfig } from "@playwright/test";

// UI contract only: API responses are intercepted with synthetic records.
// No database, Auth identity, Production flag or persisted progress is simulated.
export default defineConfig({
  testDir: "./tests/participation-continuity",
  outputDir: "test-results/participation-continuity",
  timeout: 60_000,
  workers: 1,
  use: {
    channel: "chromium",
    baseURL: "http://127.0.0.1:3117",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 360, height: 800 } } },
    { name: "desktop", use: { viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3117",
    url: "http://127.0.0.1:3117/comun/ajuda/primeira-acao",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      COMUN_BASE_URL: "http://127.0.0.1:3117",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3117",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:59999",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-ui-contract-only",
      SUPABASE_DB_URL: "",
      SUPABASE_ACCESS_TOKEN: "",
      VERCEL_ENV: "development",
      ALLOW_LOCAL_TESTS: "true",
      COMUN_PARTICIPATION_WALLET_ENABLED: "",
      COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
    },
  },
});
