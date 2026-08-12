import { describe, expect, it } from "vitest";
import {
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoriesFoundationEnabled,
  isComunObservatorySidewalkAdapterEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTransportProgrammedEnabled,
  isComunObservatoryTransportSystemMetricsEnabled,
  isComunObservatoryTerritorialContextEnabled,
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
    expect(isComunObservatoryTransportSystemMetricsEnabled({})).toBe(false);
    expect(isComunObservatoryTerritorialContextEnabled({})).toBe(false);
  });

  it("requires the observatory foundation and an explicit territorial flag", () => {
    expect(
      isComunObservatoryTerritorialContextEnabled({
        COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_ENABLED: "enabled",
      }),
    ).toBe(false);
    expect(
      isComunObservatoryTerritorialContextEnabled({
        COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
        COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_ENABLED: "enabled",
      }),
    ).toBe(true);
  });

  it("keeps environmental surface water cloaked until its isolated flag is enabled", () => {
    expect(isComunObservatoryEnvironmentSurfaceWaterEnabled({ COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled" })).toBe(false);
    expect(isComunObservatoryEnvironmentSurfaceWaterEnabled({ COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled", COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED: "enabled" })).toBe(true);
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

  it("keeps C1 public while C2 system metrics stays cloaked", () => {
    const c1 = {
      COMUN_OBSERVATORIES_FOUNDATION_ENABLED: "enabled",
      COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED: "enabled",
    };
    expect(isComunObservatoryTransportProgrammedEnabled(c1)).toBe(true);
    expect(isComunObservatoryTransportSystemMetricsEnabled(c1)).toBe(false);
    expect(
      isComunObservatoryTransportSystemMetricsEnabled({
        ...c1,
        COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_ENABLED: "enabled",
      }),
    ).toBe(true);
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
