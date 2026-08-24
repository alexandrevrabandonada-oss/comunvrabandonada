import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/20260824001340_comun_artwork_submission_private_materialization.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/comun/admin/acervo/specialized-provenance-actions.ts", import.meta.url), "utf8");
const artworkDetail = readFileSync(new URL("../app/comun/admin/acervo/arte/contribuicoes/[id]/page.tsx", import.meta.url), "utf8");

describe("A5-A2 private materialization contract", () => {
  it("keeps artwork creation atomic, locked, typed and idempotent", () => {
    expect(migration).toContain("comun_materialize_artwork_submission_private_root_v1");
    expect(migration).toContain("comun_link_artwork_submission_private_root_v1");
    expect(migration).toContain("for update");
    expect(migration).toContain("private-root provenance is immutable");
    expect(migration).toContain("territorial_artwork");
    expect(migration).toContain("'unknown', 'draft', 'private'");
  });

  it("does not create public projections or infer authorship from an artwork envelope", () => {
    for (const forbidden of ["comun_search_documents", "comun_archive_collections", "public_safe", "creator_credit_suggestion", "visibility, 'public'"]) {
      expect(migration).not.toContain(forbidden);
    }
    expect(migration).not.toMatch(/insert into public\.comun_archive_artwork_(?:credits|rights|safety_reviews)/i);
  });

  it("limits artwork RPC execution to the service role", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("requires server authorization, refetch, readiness and atomic RPCs", () => {
    expect(actions).toContain('requireComunAdmin({ roles: ["admin", "editor"] })');
    expect(actions).toContain("resolveOralHistorySuggestionReadiness");
    expect(actions).toContain("resolveRadioContributionReadiness");
    expect(actions).toContain("resolveArtworkSubmissionReadiness");
    expect(actions).toContain("comun_materialize_oral_history_suggestion_private_root_v1");
    expect(actions).toContain("comun_materialize_radio_contribution_private_root_v1");
    expect(actions).toContain("comun_link_radio_contribution_private_root_v1");
    expect(actions).toContain("logComunAdminAction");
  });

  it("activates distinct private-create and explicit existing-root actions without publication", () => {
    expect(artworkDetail).toContain("materializeArtworkSubmissionPrivateRoot");
    expect(artworkDetail).toContain("linkArtworkSubmissionPrivateRoot");
    expect(artworkDetail).toContain("Criar rascunho privado");
    expect(artworkDetail).toContain("Vincular a uma obra existente");
    expect(actions).toContain("artwork_existing_root_linked");
    expect(actions).toContain("comun_link_artwork_submission_private_root_v1");
    expect(actions).toContain('.eq("item_type", "territorial_artwork")');
    expect(actions).toContain('.eq("status", "draft")');
    expect(actions).toContain('.eq("visibility", "private")');
    expect(artworkDetail).toContain("Publicação não está autorizada");
  });
});
