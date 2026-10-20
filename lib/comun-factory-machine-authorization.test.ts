import { describe, expect, it } from "vitest";
import {
  evaluateComunFactoryMachineUse,
  type ComunFactoryMachineAuthorization,
} from "@/lib/comun-factory-machine-authorization";
import type {
  ComunCompetencyClaim,
  ComunCompetencyEvidence,
} from "@/lib/comun-competency-evidence";

const evidence: ComunCompetencyEvidence = {
  id: "ev-fdm",
  userId: "user-a",
  competencyId: "fdm-basic",
  sourceKind: "learning_practice",
  sourceId: "practice-private",
  state: "validated",
  reviewedBy: "reviewer-b",
  reviewedAt: "2026-10-06T18:00:00Z",
  occurredAt: "2026-10-06T17:00:00Z",
};

const claim: ComunCompetencyClaim = {
  id: "claim-fdm",
  userId: "user-a",
  competencyId: "fdm-basic",
  label: "Impressão FDM básica",
  scope: "Prepara e acompanha impressão simples em material autorizado.",
  state: "demonstrated",
  visibility: "private",
  allowMatching: false,
  evidenceIds: ["ev-fdm"],
  reviewedBy: "reviewer-b",
  demonstratedAt: "2026-10-06T18:00:00Z",
  reviewDueAt: null,
};

const authorization: ComunFactoryMachineAuthorization = {
  id: "auth-1",
  userId: "user-a",
  capability: "fdm_basic",
  level: "independent",
  grantedBy: "operator-c",
  grantedAt: "2026-10-06T19:00:00Z",
  expiresAt: null,
  revokedAt: null,
  safetyBriefingRef: "briefing-fdm-v1",
  competencyClaimIds: ["claim-fdm"],
};

describe("autorização de máquinas da Fábrica COMUN", () => {
  it("competência demonstrada sem autorização não libera máquina", () => {
    expect(
      evaluateComunFactoryMachineUse({
        userId: "user-a",
        capability: "fdm_basic",
        riskClass: "R1",
        authorization: null,
        claims: [claim],
        evidence: [evidence],
        qualifiedOversightPresent: false,
      }),
    ).toEqual({
      allowed: false,
      mode: "blocked",
      reasons: ["authorization_missing"],
    });
  });

  it("autorização sem competência demonstrada também não libera", () => {
    const decision = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R1",
      authorization,
      claims: [],
      evidence: [evidence],
      qualifiedOversightPresent: false,
    });
    expect(decision.reasons).toContain("competency_not_demonstrated");
  });

  it("autorização supervisionada nunca vira uso independente", () => {
    const decision = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R1",
      authorization: { ...authorization, level: "supervised" },
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: false,
    });
    expect(decision).toEqual({
      allowed: true,
      mode: "supervised",
      reasons: [],
    });
  });

  it("R3 exige supervisão qualificada mesmo com autorização independente", () => {
    const blocked = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R3",
      authorization,
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: false,
    });
    expect(blocked.reasons).toContain("qualified_oversight_required");

    const supervised = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R3",
      authorization,
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: true,
    });
    expect(supervised.mode).toBe("supervised");
  });

  it("R4 permanece bloqueado", () => {
    const decision = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R4",
      authorization,
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("critical_case_blocked");
  });

  it("revogação, validade e briefing são gates próprios", () => {
    const revoked = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R1",
      authorization: { ...authorization, revokedAt: "2026-10-07T00:00:00Z" },
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: false,
    });
    expect(revoked.reasons).toContain("authorization_revoked");

    const expired = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R1",
      authorization: { ...authorization, expiresAt: "2026-10-06T20:00:00Z" },
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: false,
      now: new Date("2026-10-07T00:00:00Z"),
    });
    expect(expired.reasons).toContain("authorization_expired");

    const noBriefing = evaluateComunFactoryMachineUse({
      userId: "user-a",
      capability: "fdm_basic",
      riskClass: "R1",
      authorization: { ...authorization, safetyBriefingRef: "" },
      claims: [claim],
      evidence: [evidence],
      qualifiedOversightPresent: false,
    });
    expect(noBriefing.reasons).toContain("safety_briefing_missing");
  });
});
