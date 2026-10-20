import { describe, expect, it } from "vitest";
import {
  suggestComunTasksByCompetency,
  type ComunCanonicalTaskCandidate,
  type ComunTaskCapabilityRequirement,
} from "@/lib/comun-competency-task-suggestions";
import type {
  ComunCompetencyClaim,
  ComunCompetencyEvidence,
} from "@/lib/comun-competency-evidence";

const evidence: ComunCompetencyEvidence[] = [
  {
    id: "ev-cad",
    userId: "user-a",
    competencyId: "cad-funcional",
    sourceKind: "reviewed_artifact",
    sourceId: "artifact-private",
    state: "validated",
    reviewedBy: "reviewer-private",
    reviewedAt: "2026-10-06T18:00:00Z",
    occurredAt: "2026-10-06T17:00:00Z",
  },
  {
    id: "ev-doc",
    userId: "user-a",
    competencyId: "documentacao-tecnica",
    sourceKind: "community_delivery",
    sourceId: "delivery-private",
    state: "validated",
    reviewedBy: "reviewer-private",
    reviewedAt: "2026-10-06T18:00:00Z",
    occurredAt: "2026-10-06T17:00:00Z",
  },
];

const claims: ComunCompetencyClaim[] = [
  {
    id: "claim-cad",
    userId: "user-a",
    competencyId: "cad-funcional",
    label: "CAD funcional",
    scope: "Modela peças funcionais simples.",
    state: "demonstrated",
    visibility: "private",
    allowMatching: true,
    evidenceIds: ["ev-cad"],
    reviewedBy: "reviewer-private",
    demonstratedAt: "2026-10-06T18:00:00Z",
    reviewDueAt: null,
  },
  {
    id: "claim-doc",
    userId: "user-a",
    competencyId: "documentacao-tecnica",
    label: "Documentação técnica",
    scope: "Documenta versão, teste e instruções.",
    state: "demonstrated",
    visibility: "public_opt_in",
    allowMatching: false,
    evidenceIds: ["ev-doc"],
    reviewedBy: "reviewer-private",
    demonstratedAt: "2026-10-06T18:00:00Z",
    reviewDueAt: null,
  },
];

const tasks: ComunCanonicalTaskCandidate[] = [
  {
    id: "task-cad",
    actionId: "action-1",
    title: "Modelar caixa de sensor",
    description: "Criar o primeiro modelo funcional da caixa.",
    state: "open",
    dueAt: "2026-10-20T18:00:00Z",
    desiredCount: 2,
    activeCount: 1,
    effortLevel: "medium",
    participationMode: "hybrid",
  },
  {
    id: "task-full",
    actionId: "action-1",
    title: "Tarefa lotada",
    description: "Não deve aparecer.",
    state: "open",
    dueAt: null,
    desiredCount: 1,
    activeCount: 1,
    effortLevel: "small",
    participationMode: "remote",
  },
];

const requirements: ComunTaskCapabilityRequirement[] = [
  {
    taskId: "task-cad",
    requiredCompetencyIds: ["cad-funcional"],
    optionalCompetencyIds: ["documentacao-tecnica"],
  },
  {
    taskId: "task-full",
    requiredCompetencyIds: ["cad-funcional"],
    optionalCompetencyIds: [],
  },
];

describe("sugestões privadas por competência", () => {
  it("usa matching privado sem exigir perfil público", () => {
    const result = suggestComunTasksByCompetency({
      claims,
      evidence,
      tasks,
      requirements,
      eligibleActionIds: ["action-1"],
      now: new Date("2026-10-07T00:00:00Z"),
    });
    expect(result.map((item) => item.taskId)).toEqual(["task-cad"]);
  });

  it("não usa competência pública quando matching está desligado", () => {
    const result = suggestComunTasksByCompetency({
      claims: claims.filter((claim) => claim.competencyId === "documentacao-tecnica"),
      evidence,
      tasks,
      requirements: [
        {
          taskId: "task-cad",
          requiredCompetencyIds: ["documentacao-tecnica"],
          optionalCompetencyIds: [],
        },
      ],
      eligibleActionIds: ["action-1"],
      now: new Date("2026-10-07T00:00:00Z"),
    });
    expect(result).toEqual([]);
  });

  it("não sugere tarefa fora de ação elegível", () => {
    expect(
      suggestComunTasksByCompetency({
        claims,
        evidence,
        tasks,
        requirements,
        eligibleActionIds: [],
        now: new Date("2026-10-07T00:00:00Z"),
      }),
    ).toEqual([]);
  });

  it("não sugere tarefa lotada ou sem metadado de competência", () => {
    const withoutMetadata = {
      ...tasks[0],
      id: "task-without-metadata",
    };
    const result = suggestComunTasksByCompetency({
      claims,
      evidence,
      tasks: [...tasks, withoutMetadata],
      requirements,
      eligibleActionIds: ["action-1"],
      now: new Date("2026-10-07T00:00:00Z"),
    });
    expect(result.map((item) => item.taskId)).toEqual(["task-cad"]);
  });

  it("não vaza identidade, reviewer ou fonte privada na sugestão", () => {
    const [suggestion] = suggestComunTasksByCompetency({
      claims,
      evidence,
      tasks,
      requirements,
      eligibleActionIds: ["action-1"],
      now: new Date("2026-10-07T00:00:00Z"),
    });
    const serialized = JSON.stringify(suggestion);
    expect(serialized).not.toContain("user-a");
    expect(serialized).not.toContain("reviewer-private");
    expect(serialized).not.toContain("artifact-private");
  });

  it("não sugere competência com revisão vencida", () => {
    const expiredClaims = claims.map((claim) =>
      claim.competencyId === "cad-funcional"
        ? {
            ...claim,
            reviewDueAt: "2026-10-06T20:00:00Z",
          }
        : claim,
    );
    const result = suggestComunTasksByCompetency({
      claims: expiredClaims,
      evidence,
      tasks,
      requirements,
      eligibleActionIds: ["action-1"],
      now: new Date("2026-10-07T00:00:00Z"),
    });
    expect(result).toEqual([]);
  });
});
