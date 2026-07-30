import { describe, expect, it } from "vitest";
import {
  allowedPautaActionCycleTargets,
  assertPautaActionCyclePublicPayload,
  nextPautaActionCycleStep,
  pautaActionCycleStages,
  sanitizePautaActionCycleTimeline,
  validatePautaActionCycleTransition,
  type PautaActionCycleEvidence,
  type PautaActionCycleStage,
} from "./pauta-action-cycle";

const completeEvidence: PautaActionCycleEvidence = {
  approvedContributionCount: 1,
  conversationId: "circle-1",
  synthesisVersionId: "synthesis-1",
  decisionId: "decision-1",
  decisionAuthorId: "author-1",
  decisionPublished: true,
  collectiveActionId: "action-1",
  openTaskCount: 1,
  activityCompleted: true,
  forwardingId: "forwarding-1",
  officialProtocolId: "protocol-1",
  protocolSubmitted: true,
  responseReceived: true,
  responsePublicSummary: "Resposta pública revisada.",
  resultId: "result-1",
  resultVerification: "verified",
  resultEvidenceCount: 1,
  memoryPublished: true,
  publicMemoryVersion: "v1",
};

function decision(
  from: PautaActionCycleStage,
  to: PautaActionCycleStage,
  evidence: PautaActionCycleEvidence = completeEvidence,
) {
  return validatePautaActionCycleTransition({
    from,
    to,
    actorId: "operator-1",
    actorRole: "editor",
    expectedVersion: 3,
    currentVersion: 3,
    idempotencyKey: `cycle:${from}:${to}:fixture`,
    evidence,
  });
}

describe("pauta action cycle", () => {
  it("permite a jornada política completa sem saltos", () => {
    const path: PautaActionCycleStage[] = [
      "contribution",
      "moderation",
      "conversation",
      "synthesis",
      "decision",
      "action",
      "tasks",
      "forwarding",
      "protocol",
      "response",
      "result",
      "memory",
    ];
    for (let index = 0; index < path.length - 1; index += 1)
      expect(decision(path[index], path[index + 1])).toMatchObject({
        ok: true,
      });
  });

  it("impede saltos incoerentes e deriva uma próxima ação", () => {
    expect(decision("moderation", "result")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
    expect(nextPautaActionCycleStep("response")).toContain("resultado");
    expect(allowedPautaActionCycleTargets("memory")).toEqual(["reopened"]);
  });

  it("não transforma atividade concluída em resultado", () => {
    expect(
      decision("response", "result", {
        ...completeEvidence,
        activityCompleted: false,
      }),
    ).toEqual({ ok: false, reason: "activity_not_result" });
    expect(
      decision("response", "result", {
        ...completeEvidence,
        resultId: null,
      }),
    ).toMatchObject({ ok: true });
  });

  it("exige resultado verificado e evidência antes da memória", () => {
    expect(
      decision("result", "memory", {
        ...completeEvidence,
        resultVerification: "pending",
      }),
    ).toEqual({ ok: false, reason: "verified_result_required" });
    expect(
      decision("result", "memory", {
        ...completeEvidence,
        resultEvidenceCount: 0,
      }),
    ).toEqual({ ok: false, reason: "result_evidence_required" });
  });

  it("impede protocolo sem envio e resposta sem resumo público", () => {
    expect(
      decision("protocol", "response", {
        ...completeEvidence,
        protocolSubmitted: false,
      }),
    ).toEqual({ ok: false, reason: "protocol_not_submitted" });
    expect(
      decision("response", "result", {
        ...completeEvidence,
        responsePublicSummary: null,
      }),
    ).toEqual({
      ok: false,
      reason: "public_response_summary_required",
    });
  });

  it("impede autoaprovação por papel sem autoridade reforçada", () => {
    const result = validatePautaActionCycleTransition({
      from: "decision",
      to: "action",
      actorId: "same-person",
      actorRole: "coordinator",
      expectedVersion: 1,
      currentVersion: 1,
      idempotencyKey: "cycle:decision:action:self",
      evidence: {
        ...completeEvidence,
        decisionAuthorId: "same-person",
      },
    });
    expect(result).toEqual({ ok: false, reason: "self_approval_not_allowed" });
  });

  it("protege contra repetição concorrente e papel insuficiente", () => {
    expect(
      validatePautaActionCycleTransition({
        from: "action",
        to: "tasks",
        actorId: "member-1",
        actorRole: "member",
        expectedVersion: 2,
        currentVersion: 3,
        idempotencyKey: "cycle:action:tasks:member",
        evidence: completeEvidence,
      }),
    ).toEqual({ ok: false, reason: "role_not_authorized" });
    expect(
      validatePautaActionCycleTransition({
        from: "action",
        to: "tasks",
        actorId: "operator-1",
        actorRole: "editor",
        expectedVersion: 2,
        currentVersion: 3,
        idempotencyKey: "cycle:action:tasks:stale",
        evidence: completeEvidence,
      }),
    ).toEqual({ ok: false, reason: "stale_version" });
  });

  it("remove fronteiras privadas da timeline e bloqueia segredos", () => {
    expect(
      sanitizePautaActionCycleTimeline([
        {
          stage: "response",
          public_summary: "Resumo revisado",
          response_text: "conteúdo bruto",
          member_user_id: "private-id",
          object_key: "private/object",
        },
      ]),
    ).toEqual([{ stage: "response", public_summary: "Resumo revisado" }]);
    expect(() =>
      assertPautaActionCyclePublicPayload({
        stage: "response",
        raw_text: "privado",
      }),
    ).toThrow("COMUN_PAUTA_ACTION_CYCLE_PRIVATE_FIELD_BLOCKED");
    expect(() =>
      assertPautaActionCyclePublicPayload({
        url: "postgresql://private",
      }),
    ).toThrow("COMUN_PAUTA_ACTION_CYCLE_SECRET_BLOCKED");
  });

  it("declara cada etapa uma única vez", () => {
    expect(new Set(pautaActionCycleStages).size).toBe(
      pautaActionCycleStages.length,
    );
  });
});
