import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "pauta-action-cycle.spec.ts",
    "public-sharing.spec.ts",
    "specialized-observatory-sharing.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3114",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3114",
    url: "http://127.0.0.1:3114/comun/preview/esteira-politica",
    reuseExistingServer: false,
    env: {
      ...process.env,
      VERCEL_ENV: "preview",
      // Static public snapshots and Preview fixtures only: never inherit a remote DB.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_DB_URL: "",
      COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES: "enabled",
      COMUN_LEARNING_R0_ENABLED: "disabled",
      COMUN_OBSERVATORIES_FOUNDATION_ENABLED:
        process.env.COMUN_TEST_OBSERVATORY_DISABLED === "1"
          ? "disabled"
          : "enabled",
      COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED: "enabled",
      COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED: "enabled",
      COMUN_NEXT_DIST_DIR: ".next-pauta-action-cycle",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-popular",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
