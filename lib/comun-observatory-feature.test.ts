import { describe, expect, it } from "vitest";
import {
  isComunObservatoriesFoundationEnabled,
  isComunObservatorySidewalkAdapterEnabled,
} from "./comun-observatory-feature";

const p4 = {
  COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
  COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED: "enabled",
  COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED: "enabled",
  COMUN_SIDEWALK_RELATA_ENABLED: "enabled",
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_ENABLED: "enabled",
  VERCEL_ENV: "production",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic",
};

describe("observatory feature flags", () => {
  it("fails closed by default", () => {
    expect(isComunObservatoriesFoundationEnabled({})).toBe(false);
    expect(isComunObservatorySidewalkAdapterEnabled({})).toBe(false);
  });

  it("requires the P4 public capability for the sidewalk adapter", () => {
    expect(isComunObservatorySidewalkAdapterEnabled(p4)).toBe(true);
    expect(
      isComunObservatorySidewalkAdapterEnabled({
        ...p4,
        COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED: "disabled",
      }),
    ).toBe(false);
  });
});
