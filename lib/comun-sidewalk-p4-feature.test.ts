import { describe, expect, it } from "vitest";
import {
  isComunSidewalkPublicProjectionEnabled,
  isComunSidewalkRelataEnabled,
  shouldCloakComunSidewalkP4,
} from "./comun-sidewalk-p4-feature";

const local = {
  ALLOW_LOCAL_TESTS: "true",
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  COMUN_SIDEWALK_RELATA_ENABLED: "enabled",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64url"),
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-only",
};

describe("COMUN sidewalk P4 gates", () => {
  it("requires the complete private intake chain", () => {
    expect(isComunSidewalkRelataEnabled(local)).toBe(true);
    expect(
      isComunSidewalkRelataEnabled({ ...local, COMUN_RELATA_LOCATION_ENABLED: "disabled" }),
    ).toBe(false);
    expect(
      isComunSidewalkRelataEnabled({ ...local, COMUN_SIDEWALK_OPERATIONAL_V2: "disabled" }),
    ).toBe(true);
  });

  it("keeps projection independent and cumulative", () => {
    expect(isComunSidewalkPublicProjectionEnabled(local)).toBe(false);
    expect(
      isComunSidewalkPublicProjectionEnabled({
        ...local,
        COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED: "enabled",
      }),
    ).toBe(true);
  });

  it("cloaks every intake method while dormant", () => {
    expect(shouldCloakComunSidewalkP4("/api/comun/calcadas/intake", {})).toBe(true);
    expect(shouldCloakComunSidewalkP4("/api/comun/relata/sidewalk/finalize", local)).toBe(false);
  });
});
