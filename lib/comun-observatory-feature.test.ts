import { describe, expect, it } from "vitest";
import {
  isComunObservatoriesFoundationEnabled,
  isComunObservatorySidewalkAdapterEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTransportProgrammedEnabled,
} from "./comun-observatory-feature";

const p4 = {
  COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
  COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED: "enabled",
  COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED: "enabled",
  COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED: "enabled",
  COMUN_SIDEWALK_RELATA_ENABLED: "enabled",
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_ENABLED: "enabled",
  VERCEL_ENV: "production",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY:
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic",
};

describe("observatory feature flags", () => {
  it("fails closed by default", () => {
    expect(isComunObservatoriesFoundationEnabled({})).toBe(false);
    expect(isComunObservatorySidewalkAdapterEnabled({})).toBe(false);
    expect(isComunObservatorySidewalkAnalyticsEnabled({})).toBe(false);
    expect(isComunObservatoryTransportProgrammedEnabled({})).toBe(false);
  });

  it("requires only the public foundation and its own C1 flag for programmed transport", () => {
    expect(
      isComunObservatoryTransportProgrammedEnabled({
        COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
        COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(
      isComunObservatoryTransportProgrammedEnabled({
        COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED: "enabled",
      }),
    ).toBe(false);
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

  it("keeps 48.2-A active while the analytics route is cloaked", () => {
    const flagsOff = {
      ...p4,
      COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED: "disabled",
    };
    expect(isComunObservatorySidewalkAdapterEnabled(flagsOff)).toBe(true);
    expect(isComunObservatorySidewalkAnalyticsEnabled(flagsOff)).toBe(false);
  });

  it("requires foundation, adapter and P4 before analytics can open", () => {
    expect(isComunObservatorySidewalkAnalyticsEnabled(p4)).toBe(true);
    for (const key of [
      "COMUN_OBSERVATORIES_FOUNDATION_ENABLED",
      "COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED",
      "COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED",
    ] as const) {
      expect(
        isComunObservatorySidewalkAnalyticsEnabled({ ...p4, [key]: "disabled" }),
      ).toBe(false);
    }
  });
});
