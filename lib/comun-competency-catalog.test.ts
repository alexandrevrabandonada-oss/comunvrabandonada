import { describe, expect, it } from "vitest";
import {
  getComunCompetencyCatalogEntry,
  listCompetencyCandidatesFromLearningPractice,
} from "@/lib/comun-competency-catalog";

describe("catálogo inicial de competências", () => {
  it("não gera evidência candidata antes da validação da prática", () => {
    expect(
      listCompetencyCandidatesFromLearningPractice({
        missionId: "adicionar-evidencia",
        state: "pending",
      }),
    ).toEqual([]);
  });

  it("uma prática validada só vira candidata, nunca competência automática", () => {
    expect(
      listCompetencyCandidatesFromLearningPractice({
        missionId: "adicionar-evidencia",
        state: "validated",
      }),
    ).toEqual([
      {
        competencyId: "evidence-handling",
        missionId: "adicionar-evidencia",
        contributionScope:
          "Registro revisável de afirmação, fonte e limite.",
      },
    ]);
  });

  it("missão sem prática mapeada não inventa competência", () => {
    expect(
      listCompetencyCandidatesFromLearningPractice({
        missionId: "hierarquia-de-fontes",
        state: "validated",
      }),
    ).toEqual([]);
  });

  it("catálogo descreve a regra de evidência sem pontuação", () => {
    const entry = getComunCompetencyCatalogEntry("community-facilitation");
    expect(entry?.label).toBe("Escuta e facilitação comunitária");
    expect(entry?.evidenceRule).toContain("prática revisada");
    expect(entry).not.toHaveProperty("points");
    expect(entry).not.toHaveProperty("rank");
  });
});
