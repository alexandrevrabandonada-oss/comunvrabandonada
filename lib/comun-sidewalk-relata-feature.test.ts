import { describe, expect, it } from "vitest";
import {
  isComunSidewalkRelataForwardingEnabled,
  shouldCloakComunSidewalkRelata,
} from "./comun-sidewalk-relata-feature";

const enabled = {
  COMUN_SIDEWALK_RELATA_FORWARDING_LOCAL: "enabled",
  ALLOW_LOCAL_TESTS: "true",
  COMUN_SIDEWALK_OPERATIONAL_V2: "enabled",
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  COMUN_FORWARDING_LOCAL: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-local-only",
};

describe("sidewalk Relata cumulative flag", () => {
  it("requires every local barrier", () => {
    expect(isComunSidewalkRelataForwardingEnabled(enabled)).toBe(true);
    expect(isComunSidewalkRelataForwardingEnabled({ ...enabled, COMUN_FORWARDING_LOCAL: "disabled" })).toBe(false);
  });

  it("cloaks every route while dormant", () => {
    expect(shouldCloakComunSidewalkRelata("/api/comun/sidewalk-relata/records/create-relata", { ...enabled, COMUN_SIDEWALK_RELATA_FORWARDING_LOCAL: "disabled" })).toBe(true);
    expect(shouldCloakComunSidewalkRelata("/api/comun/sidewalk-relata/records/create-relata", enabled)).toBe(false);
  });
});
