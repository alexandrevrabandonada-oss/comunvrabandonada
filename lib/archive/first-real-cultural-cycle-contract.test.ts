import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { knownCurationBlockerCodes } from "./cultural-curation-copy";
import { resolveArchiveSubmissionReadiness } from "./cultural-curation-readiness";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("A5-A4 publication and copy contracts", () => {
  it("refetches specialized child roots and fails closed in the server action", () => {
    const source = read("app/comun/admin/acervo/actions.ts");
    for (const table of [
      "comun_archive_artworks",
      "comun_archive_oral_histories",
      "comun_radio_programs",
      "comun_radio_episodes",
    ])
      expect(source).toContain(`from(\"${table}\")`);
    expect(source).toContain("if (!boundary.genericPublisherAllowed)");
    expect(source).toContain(
      "Este conteúdo possui um fluxo especializado de publicação.",
    );
  });

  it("does not render raw readiness codes in the photo/document detail", () => {
    const source = read("app/comun/admin/acervo/contribuicoes/[id]/page.tsx");
    expect(source).toContain("humanizeCurationBlocker");
    expect(source).toContain("humanizeCurationAction");
    expect(source).not.toContain('readiness.blockers.join(" · ")');
    expect(source).not.toContain('readiness.requiredActions.join(" · ")');
    for (const code of knownCurationBlockerCodes) {
      expect(source).not.toContain(`>${code}<`);
    }
  });

  it("keeps readiness separate from final publication authority", () => {
    const readiness = resolveArchiveSubmissionReadiness(
      {
        submission_type: "historical_photo",
        title_suggestion: "Memória documental",
        description_suggestion: "Contexto suficiente para triagem.",
        relationship_to_material: "Acervo familiar",
        source_name: "Arquivo identificado",
        source_story: "Origem registrada",
        rights_state: "declared",
        publication_scope: "comun_publication",
        reuse_permission: "comun_only",
        risk_level: "normal",
      },
      { confirmedOriginal: true, derivativesReady: true },
    );
    expect(readiness.publicationEligible).toBe(false);
  });

  it("keeps specialized publishers in place", () => {
    expect(read("app/comun/acervo/arte/actions.ts")).toContain(
      "publishArtworkAdminAction",
    );
    expect(read("app/comun/admin/acervo/historias-orais/actions.ts")).toContain(
      "updateOralHistoryWorkflow",
    );
  });
});
