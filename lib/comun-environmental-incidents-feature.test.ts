import { describe, expect, it } from "vitest";
import {
  isComunEnvironmentalForwardingAssistedEnabled,
  isComunEnvironmentalIncidentsEnabled,
} from "./comun-environmental-incidents-feature";

const production = {
  COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED: "enabled",
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "fixture",
};

describe("COMUN environmental incidents flags", () => {
  it("enables classification independently from forwarding", () => {
    expect(isComunEnvironmentalIncidentsEnabled(production)).toBe(true);
    expect(
      isComunEnvironmentalForwardingAssistedEnabled({
        ...production,
        COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED: "enabled",
      }),
    ).toBe(false);
  });

  it("keeps classification cloaked without its explicit flag", () => {
    expect(
      isComunEnvironmentalIncidentsEnabled({
        ...production,
        COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED: undefined,
      }),
    ).toBe(false);
  });
});
