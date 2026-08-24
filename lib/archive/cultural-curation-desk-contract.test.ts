import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const desk = readFileSync(resolve(process.cwd(), "app/comun/admin/curadoria/page.tsx"), "utf8");
const photoQueue = readFileSync(resolve(process.cwd(), "app/comun/admin/acervo/contribuicoes/page.tsx"), "utf8");

describe("cultural curation desk route contract", () => {
  it("is admin/editor-only and keeps all four source queries read-only", () => {
    expect(desk).toContain('requireComunAdmin({ roles: ["admin", "editor"] })');
    for (const source of ["comun_archive_submissions", "comun_archive_artwork_submissions", "comun_archive_oral_history_suggestions", "comun_radio_contributions"]) expect(desk).toContain(source);
    expect(desk).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  });

  it("supports filters, accessible landmarks, detail links and an empty state", () => {
    expect(desk).toContain('name="tipo"');
    expect(desk).toContain('name="situacao"');
    expect(desk).toContain('name="busca"');
    expect(desk).toContain('aria-label="Filtros da mesa"');
    expect(desk).toContain('aria-live="polite"');
    expect(desk).toContain("Abrir contribuição");
    expect(desk).toContain("Abrir rascunho privado");
    expect(desk).toContain("Não encontramos itens com esses filtros.");
  });

  it("never offers publication or prints known raw blocker codes", () => {
    expect(desk).not.toMatch(/>Publicar</);
    for (const code of ["rights_review_required", "asset_not_ready", "private_root_source_ineligible"]) {
      expect(desk).not.toContain(code);
      expect(photoQueue).not.toContain(`Bloqueios: ${code}`);
    }
  });
});
