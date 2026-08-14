import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260813124308_comun_pautas_vivas_public_evidence.sql"),
  "utf8",
);
const attach = readFileSync(join(root, "lib/comun-pauta-public-evidence.ts"), "utf8");
const detail = readFileSync(join(root, "components/comun-pautas-vivas.tsx"), "utf8");

describe("Pautas Vivas A1 contract", () => {
  it("uses one additive evidence migration without changing pauta_spaces", () => {
    expect(migration).toContain("add column if not exists public_evidence_ref_id");
    expect(migration).toContain("source_type = 'public_evidence'");
    expect(migration).toContain("source_id is null");
    expect(migration).toContain("source_type <> 'public_evidence'");
    expect(migration).toContain("where source_type = 'public_evidence'");
    expect(migration).not.toMatch(/alter table public\.comun_pauta_spaces/);
    expect(migration).not.toMatch(/(^|\n)\s*(update|delete from|insert into)\s/i);
  });

  it("preserves public read and service-only writes", () => {
    expect(migration).not.toMatch(/\b(grant|revoke|create policy|drop policy)\b/i);
    expect(migration).not.toMatch(/alter table[^;]+(?:enable|disable|force|no force) row level security/i);
  });

  it("resolves the citation server-side and is idempotent", () => {
    expect(attach).toContain("resolveCurrentPublicEvidenceReference(input.refId)");
    expect(attach).toContain('source_type: "public_evidence"');
    expect(attach).toContain('sensitivity: "public_safe"');
    expect(attach).toContain('status: "approved"');
    expect(attach).toContain('inserted.error?.code === "23505"');
    expect(attach).not.toContain("input.payload");
  });

  it("keeps public evidence, participation and editorial synthesis distinct", () => {
    expect(detail).toContain(
      'data-comun-app-v2-page="pautas-vivas-collection"',
    );
    expect(detail).toContain("Evidências públicas");
    expect(detail).toContain("Participação");
    expect(detail).toContain("Síntese editorial");
    expect(detail).not.toContain("feed");
    expect(detail).toContain("Não há ranking de popularidade");
  });
});
