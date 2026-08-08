import { describe, expect, it } from "vitest";
import { isComunBusRelataEnabled, shouldCloakComunBus } from "./comun-bus-feature";
import { isComunStmuAssistedEnabled, shouldCloakComunStmuAssisted } from "./comun-stmu-assisted-feature";

const production = {
  COMUN_BUS_RELATA_ENABLED: "enabled",
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic",
};

describe("COMUN P5 feature barriers", () => {
  it("requires the complete production bus barrier", () => {
    expect(isComunBusRelataEnabled(production)).toBe(true);
    expect(isComunBusRelataEnabled({ ...production, COMUN_RELATA_PERSISTENCE_ENABLED: "disabled" })).toBe(false);
    expect(shouldCloakComunBus("/comun/onibus", { ...production, COMUN_BUS_RELATA_ENABLED: "disabled" })).toBe(true);
  });

  it("keeps STMU cumulative and cloaked independently", () => {
    expect(isComunStmuAssistedEnabled({ ...production, COMUN_STMU_ASSISTED_ENABLED: "enabled" })).toBe(true);
    expect(isComunStmuAssistedEnabled({ ...production, COMUN_STMU_ASSISTED_ENABLED: "disabled" })).toBe(false);
    expect(shouldCloakComunStmuAssisted("/api/comun/stmu-assisted/packages/x", production)).toBe(true);
  });

  it("accepts legacy flags only in an explicit loopback laboratory", () => {
    const local = { ALLOW_LOCAL_TESTS: "true", COMUN_BUS_LOCAL_PILOT: "enabled", COMUN_RELATA_LOCAL_PERSISTENCE: "enabled", COMUN_PARTICIPATION_WALLET_LOCAL: "enabled", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "synthetic", COMUN_STMU_ASSISTED_ENABLED: "enabled" };
    expect(isComunBusRelataEnabled(local)).toBe(true);
    expect(isComunStmuAssistedEnabled(local)).toBe(true);
    expect(isComunBusRelataEnabled({ ...local, ALLOW_LOCAL_TESTS: "false" })).toBe(false);
  });
});
