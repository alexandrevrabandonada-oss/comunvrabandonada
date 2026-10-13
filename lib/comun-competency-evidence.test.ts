import { describe, expect, it } from "vitest";
import {
  isComunCompetencyEligibleForMatching,
  projectPublicComunCompetency,
  validateComunCompetencyClaim,
  type ComunCompetencyClaim,
  type ComunCompetencyEvidence,
} from "@/lib/comun-competency-evidence";

const evidence: ComunCompetencyEvidence = {
  id: "ev-1",
  userId: "user-a",
  competencyId: "cad-funcional",
  sourceKind: "learning_practice",
  sourceId: "practice-1",
  state: "validated",
  reviewedBy: "reviewer-b",
  reviewedAt: "2026-10-06T18:00:00Z",
  occurredAt: "2026-10-06T17:00:00Z",
};

const claim: ComunCompetencyClaim = {
  id: "claim-1",
  userId: "user-a",
  competencyId: "cad-funcional",
  label: "CAD funcional",
  scope: "Modela peça simples a partir de medidas e testa o encaixe.",
  state: "demonstrated",
  visibility: "private",
  allowMatching: false,
  evidenceIds: ["ev-1"],
  reviewedBy: "reviewer-b",
  demonstratedAt: "2026-10-06T18:00:00Z",
  reviewDueAt: null,
};

describe("competências com evidência", () => {
  it("não aceita demonstração sustentada por auto-revisão", () => {
    const selfReviewed = { ...evidence, reviewedBy: "user-a" };
    expect(validateComunCompetencyClaim(claim, [selfReviewed])).toContain(
      "demonstrated_without_independent_review",
    );
  });

  it("não transforma conclusão sem evidência validada em competência", () => {
    const pending = { ...evidence, state: "pending" as const };
    expect(validateComunCompetencyClaim(claim, [pending])).toContain(
      "demonstrated_without_validated_evidence",
    );
  });

  it("bloqueia evidência de outra pessoa ou outra competência", () => {
    const wrong = {
      ...evidence,
      userId: "user-other",
      competencyId: "eletronica",
    };
    const findings = validateComunCompetencyClaim(claim, [wrong]);
    expect(findings).toContain("evidence_wrong_subject");
    expect(findings).toContain("evidence_wrong_competency");
  });

  it("mantém competência privada fora da projeção pública", () => {
    expect(projectPublicComunCompetency(claim, [evidence])).toBeNull();
  });

  it("publica somente o recorte mínimo após opt-in", () => {
    const publicClaim = { ...claim, visibility: "public_opt_in" as const };
    expect(projectPublicComunCompetency(publicClaim, [evidence])).toEqual({
      competencyId: "cad-funcional",
      label: "CAD funcional",
      scope: "Modela peça simples a partir de medidas e testa o encaixe.",
      demonstratedAt: "2026-10-06T18:00:00Z",
    });
  });

  it("matching é consentimento separado da publicação", () => {
    const matchingClaim = { ...claim, allowMatching: true };
    expect(
      isComunCompetencyEligibleForMatching(
        matchingClaim,
        [evidence],
        new Date("2026-10-07T00:00:00Z"),
      ),
    ).toBe(true);
    expect(projectPublicComunCompetency(matchingClaim, [evidence])).toBeNull();
  });

  it("não usa competência vencida para matching", () => {
    const expired = {
      ...claim,
      allowMatching: true,
      reviewDueAt: "2026-10-06T20:00:00Z",
    };
    expect(
      isComunCompetencyEligibleForMatching(
        expired,
        [evidence],
        new Date("2026-10-07T00:00:00Z"),
      ),
    ).toBe(false);
  });
});
