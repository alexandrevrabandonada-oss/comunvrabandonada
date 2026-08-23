import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260823003249_comun_cultural_specialized_provenance_readiness.sql", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/comun/admin/acervo/specialized-provenance-actions.ts", import.meta.url),
  "utf8",
);
const oralActions = readFileSync(
  new URL("../app/comun/admin/acervo/historias-orais/actions.ts", import.meta.url),
  "utf8",
);

describe("A5-A1 specialized immutable provenance contract", () => {
  it("adds only source-owned, nullable provenance columns without a new queue or backfill", () => {
    expect(migration).toContain("add column private_root_archive_item_id uuid");
    expect(migration).toContain("add column private_root_kind text");
    expect(migration).not.toMatch(/create table\s+public\.comun_.*(?:queue|workflow)/i);
    expect(migration).not.toMatch(/update\s+public\.comun_.*set\s+private_root/i);
  });

  it("requires typed targets, complete pairs, source locking, and immutable links", () => {
    expect(migration).toContain("comun_radio_contributions_private_root_pair_check");
    expect(migration).toContain("community_radio_program");
    expect(migration).toContain("community_radio_episode");
    expect(migration).toContain("oral_history");
    expect(migration).toContain("for update");
    expect(migration).toContain("private-root provenance is immutable");
  });

  it("keeps the materializers server-only and service-role-only", () => {
    for (const fn of [
      "comun_link_oral_history_suggestion_private_root_v1",
      "comun_materialize_oral_history_suggestion_private_root_v1",
      "comun_link_radio_contribution_private_root_v1",
      "comun_materialize_radio_contribution_private_root_v1",
    ]) {
      expect(migration).toContain(`revoke all on function public.${fn}`);
      expect(migration).toContain(`grant execute on function public.${fn}`);
    }
    expect(actions).toContain('requireComunAdmin({ roles: ["admin", "editor"] })');
    expect(actions).toContain("logComunAdminAction");
  });

  it("never creates a public root, Search document, collection, or public asset", () => {
    expect(migration).toContain("'draft', 'private'");
    expect(migration).toContain("'unknown', 'draft', 'private'");
    for (const forbidden of ["comun_search_documents", "comun_archive_collections", "public_safe", "visibility: 'public'"]) {
      expect(migration).not.toContain(forbidden);
    }
  });

  it("corrects only future oral-history roots to unknown rights", () => {
    expect(oralActions).toContain("rights_status: 'unknown'");
    expect(oralActions).not.toContain("rights_status: 'permission_granted'");
  });
});
