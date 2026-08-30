import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3138";
const key = Buffer.alloc(32, 7).toString("base64url");
const spatialKey = Buffer.alloc(32, 9).toString("base64url");

export default defineConfig({
  testDir: "./tests/comun-relata-mocked",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  projects: [
    {
      name: "390x844",
      use: {
        viewport: { width: 390, height: 844 },
        permissions: ["geolocation"],
        geolocation: { longitude: -44.101, latitude: -22.52, accuracy: 18 },
      },
    },
    {
      name: "desktop",
      use: {
        viewport: { width: 1366, height: 768 },
        permissions: ["geolocation"],
        geolocation: { longitude: -44.101, latitude: -22.52, accuracy: 18 },
      },
    },
  ],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --webpack -p 3138",
    url: `${baseURL}/comun/relatar`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ALLOW_LOCAL_TESTS: "true",
      COMUN_RELATA_PREVIEW: "enabled",
      COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
      COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
      COMUN_RELATA_LOCATION_ENABLED: "enabled",
      COMUN_RELATA_COLLECTIVE_ENABLED: "enabled",
      COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
      COMUN_QUICK_CAPTURE_V2: "enabled",
      COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED: "enabled",
      COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED: "enabled",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "mock-local-only",
      COMUN_RELATA_LOCATION_ENCRYPTION_KEY: key,
      COMUN_RELATA_SPATIAL_HMAC_KEY: spatialKey,
    },
  },
});
