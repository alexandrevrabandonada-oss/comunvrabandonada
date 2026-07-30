export const pautaActionCycleStages = [
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
  "reopened",
] as const;

export type PautaActionCycleStage = (typeof pautaActionCycleStages)[number];

export const pautaActionCycleRoles = [
  "admin",
  "editor",
  "coordinator",
  "facilitator",
  "community_editor",
  "curator",
  "protocol_operator",
  "result_editor",
  "member",
] as const;

export type PautaActionCycleRole = (typeof pautaActionCycleRoles)[number];

export type PautaActionCycleEvidence = {
  approvedContributionCount?: number;
  conversationId?: string | null;
  synthesisVersionId?: string | null;
  decisionId?: string | null;
  decisionAuthorId?: string | null;
  decisionPublished?: boolean;
  collectiveActionId?: string | null;
  openTaskCount?: number;
  activityCompleted?: boolean;
  forwardingId?: string | null;
  officialProtocolId?: string | null;
  protocolSubmitted?: boolean;
  responseReceived?: boolean;
  responsePublicSummary?: string | null;
  resultId?: string | null;
  resultVerification?: "pending" | "verified" | "disputed" | "superseded";
  resultEvidenceCount?: number;
  memoryPublished?: boolean;
  publicMemoryVersion?: string | null;
};

export type PautaActionCycleTransitionInput = {
  from: PautaActionCycleStage;
  to: PautaActionCycleStage;
  actorId: string;
  actorRole: PautaActionCycleRole;
  expectedVersion: number;
  currentVersion: number;
  idempotencyKey: string;
  evidence: PautaActionCycleEvidence;
};

export type PautaActionCycleTransitionDecision =
  | {
      ok: true;
      nextAction: string;
      requiredRole: PautaActionCycleRole[];
    }
  | {
      ok: false;
      reason:
        | "invalid_transition"
        | "role_not_authorized"
        | "stale_version"
        | "idempotency_key_required"
        | "approved_contribution_required"
        | "conversation_required"
        | "synthesis_required"
        | "decision_required"
        | "decision_publication_required"
        | "self_approval_not_allowed"
        | "action_required"
        | "task_required"
        | "activity_not_result"
        | "forwarding_required"
        | "protocol_required"
        | "protocol_not_submitted"
        | "response_required"
        | "public_response_summary_required"
        | "verified_result_required"
        | "result_evidence_required"
        | "public_memory_required";
    };

const transitions: Record<
  PautaActionCycleStage,
  readonly PautaActionCycleStage[]
> = {
  contribution: ["moderation"],
  moderation: ["conversation"],
  conversation: ["synthesis"],
  synthesis: ["decision"],
  decision: ["action"],
  action: ["tasks"],
  tasks: ["forwarding"],
  forwarding: ["protocol"],
  protocol: ["response"],
  response: ["result"],
  result: ["memory"],
  memory: ["reopened"],
  reopened: ["moderation", "conversation"],
};

const rolesByTarget: Record<
  PautaActionCycleStage,
  readonly PautaActionCycleRole[]
> = {
  contribution: ["member", "admin", "editor"],
  moderation: ["admin", "editor", "community_editor", "curator"],
  conversation: ["admin", "editor", "coordinator", "facilitator"],
  synthesis: ["admin", "editor", "community_editor", "curator"],
  decision: ["admin", "editor", "coordinator"],
  action: ["admin", "editor", "coordinator"],
  tasks: ["admin", "editor", "coordinator"],
  forwarding: ["admin", "editor", "coordinator", "protocol_operator"],
  protocol: ["admin", "editor", "protocol_operator"],
  response: ["admin", "editor", "protocol_operator"],
  result: ["admin", "editor", "coordinator", "result_editor"],
  memory: ["admin", "editor", "coordinator", "community_editor"],
  reopened: ["admin", "editor", "coordinator", "result_editor"],
};

const nextActionByStage: Record<PautaActionCycleStage, string> = {
  contribution: "Revisar as contribuições recebidas.",
  moderation: "Organizar uma roda para escuta e propostas.",
  conversation: "Publicar uma síntese revisada da conversa.",
  synthesis: "Registrar uma decisão justificada.",
  decision: "Criar a ação coletiva vinculada à decisão.",
  action: "Abrir tarefas e formas de participação.",
  tasks: "Preparar o encaminhamento coletivo.",
  forwarding: "Registrar o protocolo oficial, sem envio automático.",
  protocol: "Registrar a resposta recebida e seu resumo público.",
  response: "Verificar o resultado com evidências.",
  result: "Publicar a memória revisada do processo.",
  memory: "Acompanhar; reabrir somente com justificativa.",
  reopened: "Retomar moderação ou conversa sem apagar o histórico.",
};

export function canTransitionPautaActionCycle(
  from: PautaActionCycleStage,
  to: PautaActionCycleStage,
) {
  return transitions[from].includes(to);
}

export function allowedPautaActionCycleTargets(from: PautaActionCycleStage) {
  return [...transitions[from]];
}

export function rolesForPautaActionCycleTarget(target: PautaActionCycleStage) {
  return [...rolesByTarget[target]];
}

export function nextPautaActionCycleStep(stage: PautaActionCycleStage) {
  return nextActionByStage[stage];
}

export function validatePautaActionCycleTransition(
  input: PautaActionCycleTransitionInput,
): PautaActionCycleTransitionDecision {
  if (!canTransitionPautaActionCycle(input.from, input.to))
    return { ok: false, reason: "invalid_transition" };
  if (!rolesByTarget[input.to].includes(input.actorRole))
    return { ok: false, reason: "role_not_authorized" };
  if (input.expectedVersion !== input.currentVersion)
    return { ok: false, reason: "stale_version" };
  if (!/^[a-z0-9][a-z0-9:_-]{7,159}$/i.test(input.idempotencyKey))
    return { ok: false, reason: "idempotency_key_required" };

  const evidence = input.evidence;
  if (
    ["moderation", "conversation"].includes(input.to) &&
    (evidence.approvedContributionCount ?? 0) < 1
  )
    return { ok: false, reason: "approved_contribution_required" };
  if (input.to === "synthesis" && !evidence.conversationId)
    return { ok: false, reason: "conversation_required" };
  if (input.to === "decision" && !evidence.synthesisVersionId)
    return { ok: false, reason: "synthesis_required" };
  if (input.to === "action" && !evidence.decisionId)
    return { ok: false, reason: "decision_required" };
  if (input.to === "action" && !evidence.decisionPublished)
    return { ok: false, reason: "decision_publication_required" };
  if (
    input.to === "action" &&
    evidence.decisionAuthorId === input.actorId &&
    input.actorRole !== "admin"
  )
    return { ok: false, reason: "self_approval_not_allowed" };
  if (input.to === "tasks" && !evidence.collectiveActionId)
    return { ok: false, reason: "action_required" };
  if (input.to === "forwarding" && (evidence.openTaskCount ?? 0) < 1)
    return { ok: false, reason: "task_required" };
  if (input.to === "result" && !evidence.activityCompleted)
    return { ok: false, reason: "activity_not_result" };
  if (input.to === "protocol" && !evidence.forwardingId)
    return { ok: false, reason: "forwarding_required" };
  if (input.to === "response" && !evidence.officialProtocolId)
    return { ok: false, reason: "protocol_required" };
  if (input.to === "response" && !evidence.protocolSubmitted)
    return { ok: false, reason: "protocol_not_submitted" };
  if (input.to === "result" && !evidence.responseReceived)
    return { ok: false, reason: "response_required" };
  if (
    input.to === "result" &&
    (evidence.responsePublicSummary?.trim().length ?? 0) < 3
  )
    return { ok: false, reason: "public_response_summary_required" };
  if (
    input.to === "memory" &&
    (!evidence.resultId || evidence.resultVerification !== "verified")
  )
    return { ok: false, reason: "verified_result_required" };
  if (input.to === "memory" && (evidence.resultEvidenceCount ?? 0) < 1)
    return { ok: false, reason: "result_evidence_required" };
  if (
    input.to === "reopened" &&
    (!evidence.memoryPublished || !evidence.publicMemoryVersion)
  )
    return { ok: false, reason: "public_memory_required" };

  return {
    ok: true,
    nextAction: nextActionByStage[input.to],
    requiredRole: [...rolesByTarget[input.to]],
  };
}

const forbiddenPublicKeys = new Set([
  "raw_text",
  "contact_private",
  "email",
  "user_id",
  "member_user_id",
  "internal_notes",
  "private_notes",
  "response_text",
  "original_photo",
  "object_key",
  "signed_url",
  "token",
  "secret",
  "private_geometry",
  "exact_latitude",
  "exact_longitude",
]);

export function sanitizePautaActionCycleTimeline<
  T extends Record<string, unknown>,
>(events: readonly T[]) {
  return events.map((event) =>
    Object.fromEntries(
      Object.entries(event).filter(
        ([key]) => !forbiddenPublicKeys.has(key.toLowerCase()),
      ),
    ),
  );
}

export function assertPautaActionCyclePublicPayload(
  value: Record<string, unknown>,
) {
  const serialized = JSON.stringify(value);
  for (const key of forbiddenPublicKeys) {
    if (new RegExp(`"${key}"\\s*:`, "i").test(serialized))
      throw new Error("COMUN_PAUTA_ACTION_CYCLE_PRIVATE_FIELD_BLOCKED");
  }
  if (
    /postgres(?:ql)?:\/\/|service[_-]?role|authorization|bearer\s+|signed[_-]?url/i.test(
      serialized,
    )
  )
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_SECRET_BLOCKED");
  return value;
}
