import { describe, expect, it } from "vitest";
import {
  isComunUrbanIncidentsEnabled,
  isComunUrbanIncidentsForwardingAssistedEnabled,
} from "./comun-urban-incidents-feature";

const persistence = {
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  ALLOW_LOCAL_TESTS: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
};

describe("COMUN P6B-B flags", () => {
  it("requires explicit classification and persistence", () => {
    expect(
      isComunUrbanIncidentsEnabled({
        ...persistence,
        COMUN_URBAN_INCIDENTS_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(isComunUrbanIncidentsEnabled(persistence)).toBe(false);
  });

  it("keeps urban forwarding fail-closed", () => {
    expect(
      isComunUrbanIncidentsForwardingAssistedEnabled({
        COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_ENABLED: "enabled",
      }),
    ).toBe(false);
  });
});
