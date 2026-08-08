import { describe, expect, it } from "vitest";
import {
  createP3bRuntimeEnvDiagnostic,
  isP3bStagedProductionHost,
} from "./comun-p3b-runtime-env-diagnostic";

const validKey = Buffer.alloc(32, 7).toString("base64url");

describe("P3B staged runtime environment diagnostic", () => {
  it("returns only booleans and requires the same cumulative location gate", () => {
    const result = createP3bRuntimeEnvDiagnostic({
      COMUN_RELATA_LOCATION_ENABLED: "enabled",
      COMUN_RELATA_LOCATION_ENCRYPTION_KEY: validKey,
      COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only",
    });

    expect(result).toEqual({
      locationFlagExactEnabled: true,
      locationKeyValid32Bytes: true,
      relataPersistenceEnabled: true,
      supabaseHttps: true,
      serviceRolePresent: true,
      locationCapabilityEnabled: true,
    });
    expect(JSON.stringify(result)).not.toContain(validKey);
  });

  it("fails closed for an invalid key or an inexact flag", () => {
    const base = {
      COMUN_RELATA_LOCATION_ENABLED: "enabled",
      COMUN_RELATA_LOCATION_ENCRYPTION_KEY: validKey,
      COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-only",
    };
    expect(
      createP3bRuntimeEnvDiagnostic({
        ...base,
        COMUN_RELATA_LOCATION_ENCRYPTION_KEY: "invalid",
      }).locationCapabilityEnabled,
    ).toBe(false);
    expect(
      createP3bRuntimeEnvDiagnostic({
        ...base,
        COMUN_RELATA_LOCATION_ENABLED: "enabled\n",
      }).locationCapabilityEnabled,
    ).toBe(false);
  });

  it("only exposes the probe on the exact staged production hostname", () => {
    const env = {
      VERCEL_ENV: "production",
      VERCEL_URL: "staged-example.vercel.app",
    };
    expect(isP3bStagedProductionHost("staged-example.vercel.app", env)).toBe(
      true,
    );
    expect(isP3bStagedProductionHost("comunsocial.online", env)).toBe(false);
    expect(
      isP3bStagedProductionHost("staged-example.vercel.app", {
        ...env,
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
  });
});
