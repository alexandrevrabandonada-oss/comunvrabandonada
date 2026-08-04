import { describe, expect, it } from "vitest";
import { isComunBusLocalPilotEnabled, shouldCloakComunBus } from "./comun-bus-feature";

const enabled = { ALLOW_LOCAL_TESTS: "true", COMUN_BASE_URL: "http://127.0.0.1:3137", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431", SUPABASE_SERVICE_ROLE_KEY: "local", COMUN_BUS_LOCAL_PILOT: "enabled" };

describe("COMUN Ônibus local pilot", () => {
  it("requires the local barrier and loopback destinations", () => {
    expect(isComunBusLocalPilotEnabled(enabled)).toBe(true);
    expect(isComunBusLocalPilotEnabled({ ...enabled, COMUN_BUS_LOCAL_PILOT: "disabled" })).toBe(false);
    expect(isComunBusLocalPilotEnabled({ ...enabled, NEXT_PUBLIC_SUPABASE_URL: "https://supabase.co" })).toBe(false);
  });
  it("cloaks every route when dormant", () => {
    expect(shouldCloakComunBus("/comun/onibus", { ...enabled, COMUN_BUS_LOCAL_PILOT: "disabled" })).toBe(true);
    expect(shouldCloakComunBus("/api/comun/onibus/lines", { ...enabled, COMUN_BUS_LOCAL_PILOT: "disabled" })).toBe(true);
    expect(shouldCloakComunBus("/comun/onibus", enabled)).toBe(false);
    expect(shouldCloakComunBus("/comun/transporte", { ...enabled, COMUN_BUS_LOCAL_PILOT: "disabled" })).toBe(false);
  });
});
