import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_CANONICAL_MATRIX,
  OPERATIONAL_RULES,
  assertUniqueOperationalCandidates,
  deriveOperationalCandidate,
  deriveSlaState,
} from "./operational-adapters";

const base = {
  domain: "pautas" as const,
  sourceType: "contribution",
  sourceId: "11111111-1111-4111-8111-111111111111",
  sourceVersion: "7",
  workCategory: "contribution_triage",
  sourceState: "pending",
  updatedAt: "2026-07-30T10:00:00.000Z",
};

describe("operational source adapters", () => {
  it("deriva fila, SLA, papel e próxima ação sem copiar conteúdo da fonte", () => {
    const candidate = deriveOperationalCandidate(
      base,
      new Date("2026-07-30T11:00:00.000Z"),
    );
    expect(candidate).toMatchObject({
      domain: "pautas",
      queue: "triage",
      priority: 3,
      requiredRole: "contribution_reviewer",
      slaState: "due_soon",
    });
    expect(JSON.stringify(candidate)).not.toContain("raw_text");
  });

  it("popularidade não altera prioridade e risco comprovado vira P1", () => {
    expect(
      deriveOperationalCandidate({ ...base, risk: "normal" }).priority,
    ).toBe(3);
    expect(
      deriveOperationalCandidate({ ...base, risk: "critical" }).priority,
    ).toBe(1);
  });

  it("distingue os seis estados de SLA", () => {
    const now = new Date("2026-07-30T12:00:00.000Z");
    expect(deriveSlaState(null, now)).toBe("not_applicable");
    expect(deriveSlaState("2026-07-30T11:00:00.000Z", now)).toBe("overdue");
    expect(deriveSlaState("2026-07-31T11:00:00.000Z", now)).toBe("due_soon");
    expect(deriveSlaState("2026-08-05T11:00:00.000Z", now)).toBe("within_sla");
    expect(deriveSlaState(null, now, "information_requested")).toBe(
      "paused_for_information",
    );
    expect(deriveSlaState(null, now, "blocked_by_third_party")).toBe(
      "blocked_by_third_party",
    );
  });

  it("usa chave estável e rejeita duplicidade", () => {
    const candidate = deriveOperationalCandidate(base);
    expect(candidate.idempotencyKey).toBe(
      "pautas:contribution:11111111-1111-4111-8111-111111111111:contribution_triage:current",
    );
    expect(() =>
      assertUniqueOperationalCandidates([candidate, candidate]),
    ).toThrow("COMUN_OPERATIONAL_DUPLICATE_CANDIDATE");
  });

  it("falha fechado para fonte sem regra ou id inválido", () => {
    expect(() =>
      deriveOperationalCandidate({ ...base, workCategory: "popular" }),
    ).toThrow("COMUN_OPERATIONAL_SOURCE_RULE_NOT_ALLOWLISTED");
    expect(() =>
      deriveOperationalCandidate({ ...base, sourceId: "raw-id" }),
    ).toThrow("COMUN_OPERATIONAL_SOURCE_ID_INVALID");
  });

  it("cobre todos os domínios e as quinze linhas da matriz política", () => {
    expect(new Set(OPERATIONAL_RULES.map((rule) => rule.domain))).toEqual(
      new Set([
        "communities",
        "pautas",
        "actions",
        "protocols",
        "sidewalks",
        "archive",
        "radio",
        "art",
        "platform",
      ]),
    );
    expect(OPERATIONAL_CANONICAL_MATRIX).toHaveLength(15);
  });
});
