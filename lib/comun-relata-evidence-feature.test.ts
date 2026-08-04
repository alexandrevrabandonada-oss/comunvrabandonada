import { describe, expect, it } from "vitest";
import {
  areComunRelataEvidenceFlagsEnabled,
  COMUN_RELATA_LOCATION_KEY,
  COMUN_RELATA_SPATIAL_KEY,
  isComunRelataEvidenceEnabled,
  shouldCloakComunRelataEvidenceApi,
  areComunRelataPublicMapFlagsEnabled,
  isComunRelataPublicMapEnabled,
  shouldCloakComunRelataPublicMap,
} from "./comun-relata-evidence-feature";

const key = (byte: number) => Buffer.alloc(32, byte).toString("base64url");

function enabledEnv() {
  return {
    COMUN_RELATA_PREVIEW: "enabled",
    COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
    COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: "local-only",
    [COMUN_RELATA_LOCATION_KEY]: key(1),
    [COMUN_RELATA_SPATIAL_KEY]: key(2),
  };
}

describe("COMUN Relata evidence flags", () => {
  it("requires the cumulative fourth map barrier and cloaks page/API uniformly", () => {
    expect(isComunRelataPublicMapEnabled({ ...enabledEnv(), COMUN_RELATA_LOCAL_PUBLIC_MAP: "enabled" })).toBe(true);
    const dormant = { ...enabledEnv(), COMUN_RELATA_LOCAL_PUBLIC_MAP: "disabled" };
    expect(areComunRelataPublicMapFlagsEnabled(dormant)).toBe(false);
    for (const methodPath of ["/comun/relata/mapa", "/api/comun/relata/public/cases", "/api/comun/relata/public/cases/id/confirm"]) {
      expect(shouldCloakComunRelataPublicMap(methodPath, dormant)).toBe(true);
    }
    expect(shouldCloakComunRelataPublicMap("/api/comun/relata/publicity", dormant)).toBe(false);
  });
  it("requires all three flags, loopback, service role and distinct 256-bit keys", () => {
    expect(isComunRelataEvidenceEnabled(enabledEnv())).toBe(true);
    expect(
      isComunRelataEvidenceEnabled({
        ...enabledEnv(),
        COMUN_RELATA_LOCAL_EVIDENCE: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunRelataEvidenceEnabled({
        ...enabledEnv(),
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBe(false);
    expect(
      isComunRelataEvidenceEnabled({
        ...enabledEnv(),
        [COMUN_RELATA_SPATIAL_KEY]: key(1),
      }),
    ).toBe(false);
  });

  it("fails before reading cryptographic secrets when a flag is off", () => {
    let secretReads = 0;
    const env: Record<string, string | undefined> = {
      ...enabledEnv(),
      COMUN_RELATA_LOCAL_EVIDENCE: "disabled",
    };
    Object.defineProperty(env, COMUN_RELATA_LOCATION_KEY, {
      get() {
        secretReads += 1;
        return key(1);
      },
    });
    Object.defineProperty(env, COMUN_RELATA_SPATIAL_KEY, {
      get() {
        secretReads += 1;
        return key(2);
      },
    });
    expect(areComunRelataEvidenceFlagsEnabled(env)).toBe(false);
    expect(isComunRelataEvidenceEnabled(env)).toBe(false);
    expect(secretReads).toBe(0);
  });

  it("cloaks every evidence subroute before method dispatch while dormant", () => {
    const dormant = {
      ...enabledEnv(),
      COMUN_RELATA_LOCAL_EVIDENCE: "disabled",
    };
    expect(
      shouldCloakComunRelataEvidenceApi(
        "/api/comun/relata/evidence/location",
        dormant,
      ),
    ).toBe(true);
    expect(
      shouldCloakComunRelataEvidenceApi(
        "/api/comun/relata/evidence/grouping",
        dormant,
      ),
    ).toBe(true);
    expect(
      shouldCloakComunRelataEvidenceApi(
        "/api/comun/relata/evidence-not-this-contract",
        dormant,
      ),
    ).toBe(false);
    expect(
      shouldCloakComunRelataEvidenceApi(
        "/api/comun/relata/evidence/location",
        enabledEnv(),
      ),
    ).toBe(false);
  });
});
