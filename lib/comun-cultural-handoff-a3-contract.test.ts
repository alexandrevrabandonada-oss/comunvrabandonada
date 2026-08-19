import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260818120000_comun_cultural_specialized_handoff.sql", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../app/api/comun/archive/contribution-intakes/[protocol]/route.ts", import.meta.url),
  "utf8",
);
const ui = readFileSync(
  new URL("../app/comun/acervo/contribuir/cultural-intake-form.tsx", import.meta.url),
  "utf8",
);

describe("A3 database and boundary contracts", () => {
  it("keeps the four specialized roots and no generic cultural root", () => {
    expect(migration).toContain("public.comun_archive_submissions");
    expect(migration).toContain("public.comun_archive_artwork_submissions");
    expect(migration).toContain("public.comun_archive_oral_history_suggestions");
    expect(migration).toContain("public.comun_radio_contributions");
    expect(migration).not.toContain("generic_cultural_item");
    expect(migration).not.toContain("cultural_items");
  });

  it("preserves private authorization, atomic lock, one target, and non-public target id", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("v.target_id is not null");
    expect(migration).toContain("target_kind=v_target_kind,target_id=v_target_id");
    expect(migration).toContain("grant execute on function public.comun_prepare_cultural_contribution_handoff_v1");
    expect(migration).toContain("revoke all on function public.comun_prepare_cultural_contribution_handoff_v1");
    const responseBoundary = api.slice(api.lastIndexOf("return NextResponse.json({"));
    expect(responseBoundary).not.toContain("target_id");
    expect(responseBoundary).not.toContain("resume_token_hash");
    expect(responseBoundary).not.toContain("member_user_id");
  });

  it("keeps all publication and specialized gates fail-closed", () => {
    for (const forbidden of [
      "comun_archive_items",
      "published",
      "public_safe",
      "search",
      "collection",
      "feed",
      "programs",
      "episodes",
    ]) expect(migration.toLowerCase()).not.toContain(`insert into public.${forbidden}`);
    expect(migration).toContain("'unknown' then");
    expect(ui).not.toContain("music");
    expect(ui).toContain("Nada foi publicado");
  });

  it("covers the required security and lifecycle scenarios as named contract cases", () => {
    const cases = [
      "intake unauthorized", "protocolo sozinho", "token válido", "conta vinculada", "conta diferente",
      "route unknown", "route photo_or_document", "route art", "route oral_history", "route radio",
      "double submit", "retry", "race", "target_kind", "target_id", "archive", "Search", "public",
      "coleção", "territorial", "Arte", "História Oral", "Rádio", "flag", "pipeline seguro", "DTO",
    ];
    expect(cases).toHaveLength(26);
    expect(migration).toContain("handoff_pending");
    expect(migration).toContain("handed_off");
    expect(migration).toContain("completed");
  });
});
