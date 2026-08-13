import { describe, expect, it } from "vitest";
import type { PublicEvidenceReferenceV1 } from "./comun-city-panorama";
import {
  createPublicEvidenceCitationV1,
  isPublicEvidenceCitationV1,
} from "./comun-public-evidence";
import { isComunPautasVivasCoreEnabled } from "./comun-pautas-vivas-feature";

const reference: PublicEvidenceReferenceV1 = {
  refId: "panorama:territory:coverage",
  observatoryId: "territory",
  layerId: "territory",
  claimKind: "coverage_statement",
  title: "Território e serviços públicos",
  publicPath: "/comun/observatorios/territorio",
  sourceKind: "official_public_data",
  referencePeriod: "Censo 2022",
  sourceRefs: ["source-b", "source-a"],
  limitations: ["Setor censitário não é bairro."],
};

describe("public evidence citation v1", () => {
  it("is deterministic and normalizes source reference order", () => {
    const first = createPublicEvidenceCitationV1(reference);
    const second = createPublicEvidenceCitationV1({
      ...reference,
      sourceRefs: ["source-a", "source-b", "source-a"],
    });
    expect(first.versionId).toBe(second.versionId);
    expect(first.sourceRefs).toEqual(["source-a", "source-b"]);
    expect(first.versionId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(isPublicEvidenceCitationV1(first)).toBe(true);
  });

  it("changes version when a semantic limitation changes", () => {
    const first = createPublicEvidenceCitationV1(reference);
    const second = createPublicEvidenceCitationV1({
      ...reference,
      limitations: ["Outra limitação pública."],
    });
    expect(first.versionId).not.toBe(second.versionId);
  });

  it("rejects non-observatory paths and private markers fail closed", () => {
    expect(() =>
      createPublicEvidenceCitationV1({ ...reference, publicPath: "/admin/pautas" }),
    ).toThrow("COMUN_PUBLIC_EVIDENCE_INVALID_PUBLIC_PATH");
    expect(() =>
      createPublicEvidenceCitationV1({ ...reference, title: "original_text" }),
    ).toThrow("COMUN_PUBLIC_EVIDENCE_PRIVATE_FIELD_REJECTED");
  });

  it("keeps the Pautas Vivas core flag disabled unless explicitly enabled", () => {
    expect(isComunPautasVivasCoreEnabled({})).toBe(false);
    expect(isComunPautasVivasCoreEnabled({ COMUN_PAUTAS_VIVAS_CORE_ENABLED: "disabled" })).toBe(false);
    expect(isComunPautasVivasCoreEnabled({ COMUN_PAUTAS_VIVAS_CORE_ENABLED: "enabled" })).toBe(true);
  });
});
