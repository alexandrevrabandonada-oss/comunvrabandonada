import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isComunDenunciasPublicMapEnabled, shouldCloakComunDenunciasPublicMap } from "./comun-denuncias-public-map-feature";

const migration = readFileSync(
  "supabase/migrations/20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql",
  "utf8",
);

describe("B2-A1 contract", () => {
  it("keeps Panorama validation and adds only the strict Denúncias branch", () => {
    expect(migration).toContain("p_public_evidence ->> 'namespace' = 'comun.panorama'");
    expect(migration).toContain("p_public_evidence ->> 'namespace' = 'comun.denuncias'");
    expect(migration).toContain("p_public_evidence ->> 'claimKind' = 'community_observation'");
    expect(migration).toContain("p_public_evidence ->> 'sourceKind' = 'reviewed_community_projection'");
    expect(migration).toContain("jsonb_array_length(p_public_evidence -> 'sourceRefs') = 0");
    expect(migration).not.toMatch(/create table|alter table/i);
    expect(migration).not.toContain("comun_collective_actions");
  });

  it("cloaks Denúncias evidence while the Production map is OFF", async () => {
    expect(isComunDenunciasPublicMapEnabled({})).toBe(false);
    expect(shouldCloakComunDenunciasPublicMap(
      "/comun/denuncias/problemas/11111111-1111-4111-8111-111111111111",
      {},
    )).toBe(true);
  });
});
