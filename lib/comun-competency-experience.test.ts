import { describe, expect, it } from "vitest";
import {
  buildComunCompetencyExperienceCard,
  sortComunCompetencyExperienceCards,
  summarizeComunCompetencyExperience,
} from "@/lib/comun-competency-experience";
import type {
  ComunCompetencyClaim,
  ComunCompetencyEvidence,
} from "@/lib/comun-competency-evidence";

const evidence: ComunCompetencyEvidence = {
  id: "ev-1",
  userId: "user-a",
  competencyId: "evidence-handling",
  sourceKind: "learning_practice",
  sourceId: "practice-1",
  state: "validated",
  reviewedBy: "reviewer-b",
  reviewedAt: "2026-10-06T18:00:00Z",
  occurredAt: "2026-10-06T17:00:00Z",
};

const baseClaim: ComunCompetencyClaim = {
  id: "claim-1",
  userId: "user-a",
  competencyId: "evidence-handling",
  label: "Investigação e evidências",
  scope: "Registra fonte, afirmação e limite de forma revisável.",
  state: "demonstrated",
  visibility: "private",
  allowMatching: false,
  evidenceIds: ["ev-1"],
  reviewedBy: "reviewer-b",
  demonstratedAt: "2026-10-06T18:00:00Z",
  reviewDueAt: null,
};

describe("experiência privada de competências", () => {
  it("apresenta demonstração válida sem expor reviewer ou sourceId", () => {
    const card = buildComunCompetencyExperienceCard(baseClaim, [evidence]);
    expect(card.state).toBe("demonstrated");
    expect(card.publicVisibility).toBe("private");
    expect(card).not.toHaveProperty("reviewedBy");
    expect(card).not.toHaveProperty("sourceId");
    expect(JSON.stringify(card)).not.toContain("reviewer-b");
    expect(JSON.stringify(card)).not.toContain("practice-1");
  });

  it("não mostra matching como ligado antes de demonstração válida", () => {
    const claim = {
      ...baseClaim,
      state: "proposed" as const,
      allowMatching: true,
      demonstratedAt: null,
    };
    const card = buildComunCompetencyExperienceCard(claim, [evidence]);
    expect(card.matching).toBe("off");
    expect(card.state).toBe("awaiting_review");
  });

  it("separa publicação e matching", () => {
    const publicOnly = buildComunCompetencyExperienceCard(
      { ...baseClaim, visibility: "public_opt_in" as const },
      [evidence],
    );
    expect(publicOnly.publicVisibility).toBe("public");
    expect(publicOnly.matching).toBe("off");

    const matchingOnly = buildComunCompetencyExperienceCard(
      { ...baseClaim, allowMatching: true },
      [evidence],
    );
    expect(matchingOnly.publicVisibility).toBe("private");
    expect(matchingOnly.matching).toBe("on");
  });

  it("prioriza revisão e espera antes de itens demonstrados", () => {
    const demonstrated = buildComunCompetencyExperienceCard(baseClaim, [
      evidence,
    ]);
    const due = {
      ...demonstrated,
      id: "claim-due",
      label: "CAD funcional",
      state: "review_due" as const,
      stateLabel: "Precisa revisar",
    };
    const waiting = {
      ...demonstrated,
      id: "claim-waiting",
      label: "Facilitação",
      state: "awaiting_review" as const,
      stateLabel: "Aguardando revisão",
    };
    expect(
      sortComunCompetencyExperienceCards([demonstrated, waiting, due]).map(
        (item) => item.id,
      ),
    ).toEqual(["claim-due", "claim-waiting", "claim-1"]);
  });

  it("resume atenção sem transformar contagem em pontuação", () => {
    const demonstrated = buildComunCompetencyExperienceCard(baseClaim, [
      evidence,
    ]);
    const due = {
      ...demonstrated,
      id: "claim-due",
      state: "review_due" as const,
      stateLabel: "Precisa revisar",
    };
    expect(summarizeComunCompetencyExperience([demonstrated, due])).toEqual({
      total: 2,
      demonstrated: 1,
      needsAttention: 1,
      publicCount: 0,
      matchingCount: 0,
    });
  });
});
