import { describe, expect, it } from "vitest";
import {
  evaluateComunFactoryPilot,
  type ComunFactoryPilotEvaluationCase,
} from "@/lib/comun-factory-pilot-evaluation";

function makeCase(
  n: number,
  overrides: Partial<ComunFactoryPilotEvaluationCase> = {},
): ComunFactoryPilotEvaluationCase {
  return {
    code: `FC-${String(n).padStart(4, "0")}`,
    started: true,
    resolved: n <= 5,
    disposition: n === 10 ? "do_not_fabricate" : "fabricate",
    riskClass: "R1",
    hadRevision: n === 4,
    hasCostRecord: true,
    hasVersionRecord: true,
    hasOpenProject: false,
    reusedByAnotherCase: false,
    tags: ["internal"],
    ...overrides,
  };
}

describe("avaliação do piloto da Fábrica COMUN", () => {
  it("fecha o mínimo D1 sem fingir o checkpoint ampliado", () => {
    const cases = Array.from({ length: 10 }, (_, index) =>
      makeCase(index + 1),
    );
    const minimum = evaluateComunFactoryPilot(
      {
        cases,
        autonomousOperators: 1,
        peopleInTraining: 2,
        institutionsServed: 1,
      },
      "D1_MINIMUM",
    );
    expect(minimum.passed).toBe(true);

    const expanded = evaluateComunFactoryPilot(
      {
        cases,
        autonomousOperators: 1,
        peopleInTraining: 2,
        institutionsServed: 1,
      },
      "FC_MVP_25",
    );
    expect(expanded.passed).toBe(false);
    expect(expanded.findings).toContain("cases_started_below_25");
  });

  it("exige ao menos um caso em que a decisão correta é não fabricar", () => {
    const cases = Array.from({ length: 10 }, (_, index) =>
      makeCase(index + 1, { disposition: "fabricate" }),
    );
    const result = evaluateComunFactoryPilot(
      {
        cases,
        autonomousOperators: 3,
        peopleInTraining: 5,
        institutionsServed: 2,
      },
      "D1_MINIMUM",
    );
    expect(result.findings).toContain("no_do_not_fabricate_case");
  });

  it("exige registro de custo e versão nos casos iniciados", () => {
    const cases = Array.from({ length: 10 }, (_, index) =>
      makeCase(index + 1),
    );
    cases[2] = { ...cases[2], hasCostRecord: false };
    cases[3] = { ...cases[3], hasVersionRecord: false };

    const result = evaluateComunFactoryPilot(
      {
        cases,
        autonomousOperators: 3,
        peopleInTraining: 5,
        institutionsServed: 2,
      },
      "D1_MINIMUM",
    );
    expect(result.findings).toContain("cost_records_incomplete");
    expect(result.findings).toContain("version_records_incomplete");
  });

  it("FC-MVP-25 exige escola, acessibilidade, ambiente e reuso", () => {
    const cases = Array.from({ length: 25 }, (_, index) =>
      makeCase(index + 1, {
        resolved: index < 15,
        hasOpenProject: index < 5,
      }),
    );
    cases[0] = { ...cases[0], tags: ["school"] };
    cases[1] = { ...cases[1], tags: ["accessibility"] };
    cases[2] = { ...cases[2], tags: ["environment"] };
    cases[3] = { ...cases[3], reusedByAnotherCase: true };

    const result = evaluateComunFactoryPilot(
      {
        cases,
        autonomousOperators: 3,
        peopleInTraining: 5,
        institutionsServed: 3,
      },
      "FC_MVP_25",
    );
    expect(result.passed).toBe(true);
  });

  it("contagens operacionais não viram pontuação ou ranking", () => {
    const result = evaluateComunFactoryPilot(
      {
        cases: Array.from({ length: 10 }, (_, index) => makeCase(index + 1)),
        autonomousOperators: 3,
        peopleInTraining: 5,
        institutionsServed: 2,
      },
      "D1_MINIMUM",
    );
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("ranking");
  });
});
