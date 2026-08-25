export type DenunciasFollowupState =
  | "needs_send"
  | "waiting"
  | "needs_protocol"
  | "response_received"
  | "resolved"
  | "unresolved"
  | "escalation_available"
  | "needs_human_review";

export type DenunciasFollowupAttempt = {
  attemptId?: string;
  sequence?: number;
  state: string;
  channel?: string | null;
  institutionalChannelId?: string | null;
  declaredAt?: string | null;
  officialProtocolMasked?: string | null;
  resolutionOutcome?: "resolved" | "unresolved" | null;
};

export type DenunciasFollowupChannel = {
  id: string;
  label: string;
  sourceStatus?: string;
  operationalStatus?: string;
  protocolExpectation?: "expected" | "source_unclear" | "not_promised";
  emergencyOnly?: boolean;
  priorProtocolRequired?: boolean;
};

export type DenunciasEscalationStep = DenunciasFollowupChannel & {
  afterChannelIds: readonly string[];
  requiredPreviousChannelIds?: readonly string[];
};

export type DenunciasFollowupProjection = {
  state: DenunciasFollowupState;
  headline: string;
  explanation: string;
  elapsedLabel?: string;
  officialDeadlineLabel?: string;
  nextActionLabel?: string;
  nextChannelId?: string;
  escalationReason?: string;
};

export type DenunciasFollowupInput = {
  category: string;
  packageState?: string | null;
  attempts: readonly DenunciasFollowupAttempt[];
  selectedChannels?: readonly DenunciasFollowupChannel[];
  escalationSteps?: readonly DenunciasEscalationStep[];
  now?: Date;
  officialDeadlineAt?: string | null;
  officialDeadlineSourceValid?: boolean;
  emergency?: boolean;
};

export const POWER_ESCALATION_CHAIN: readonly DenunciasEscalationStep[] = [
  {
    id: "light-ouvidoria",
    label: "Ouvidoria Light",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    afterChannelIds: ["light-agencia-virtual", "light-call-center"],
    requiredPreviousChannelIds: [],
    protocolExpectation: "expected",
    priorProtocolRequired: true,
  },
  {
    id: "aneel-escalation",
    label: "Reclamação à ANEEL",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    afterChannelIds: ["light-ouvidoria"],
    requiredPreviousChannelIds: ["light-agencia-virtual", "light-call-center", "light-ouvidoria"],
    protocolExpectation: "expected",
    priorProtocolRequired: true,
  },
];

function elapsedLabel(declaredAt: string | null | undefined, now: Date) {
  if (!declaredAt) return undefined;
  const timestamp = Date.parse(declaredAt);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return undefined;
  const days = Math.floor((now.getTime() - timestamp) / 86_400_000);
  if (days === 0) return "Enviado hoje";
  if (days === 1) return "Enviado ontem";
  return `Enviado há ${days} dias`;
}

function sourceIsUsable(channel: DenunciasFollowupChannel | undefined) {
  return Boolean(
    channel &&
      channel.sourceStatus === "source_verified" &&
      channel.operationalStatus !== "degraded" &&
      channel.operationalStatus !== "unavailable" &&
      channel.emergencyOnly !== true,
  );
}

function currentChannelId(attempt: DenunciasFollowupAttempt) {
  return attempt.institutionalChannelId ?? null;
}

function hasRequiredPreviousProtocols(
  attempts: readonly DenunciasFollowupAttempt[],
  step: DenunciasEscalationStep,
) {
  const required = step.requiredPreviousChannelIds ?? [];
  return required.every((channelId) =>
    attempts.some(
      (attempt) =>
        currentChannelId(attempt) === channelId &&
        Boolean(attempt.officialProtocolMasked),
    ),
  );
}

function escalationFor(
  input: DenunciasFollowupInput,
  attempt: DenunciasFollowupAttempt,
) {
  if (input.emergency) return null;
  const current = currentChannelId(attempt);
  if (!current) return null;
  const steps = input.escalationSteps ??
    (input.category === "power_distribution" ? POWER_ESCALATION_CHAIN : []);
  const selected = input.selectedChannels ?? [];
  return (
    steps.find((step) =>
      step.afterChannelIds.includes(current) &&
      sourceIsUsable(step) &&
      (!step.priorProtocolRequired || Boolean(attempt.officialProtocolMasked)) &&
      hasRequiredPreviousProtocols(input.attempts, step) &&
      !selected.some((channel) => channel.id === step.id),
    ) ?? null
  );
}

export function resolveDenunciasFollowup(
  input: DenunciasFollowupInput,
): DenunciasFollowupProjection {
  const now = input.now ?? new Date();
  const attempts = [...input.attempts].sort(
    (left, right) => (right.sequence ?? 0) - (left.sequence ?? 0),
  );
  const attempt = attempts[0];
  if (!attempt) {
    return {
      state: "needs_send",
      headline: "Você ainda não enviou",
      explanation: "O encaminhamento está preparado. Abra o canal e decida se quer enviar.",
      nextActionLabel: "Abrir o canal oficial",
    };
  }

  const elapsed = elapsedLabel(attempt.declaredAt, now);
  const selected = input.selectedChannels?.find(
    (channel) => channel.id === currentChannelId(attempt),
  );
  const officialDeadline =
    input.officialDeadlineSourceValid && input.officialDeadlineAt
      ? `Prazo informado pelo órgão: ${new Date(input.officialDeadlineAt).toLocaleDateString("pt-BR")}.`
      : "Não encontramos um prazo oficial claro para este canal.";
  const base = { elapsedLabel: elapsed, officialDeadlineLabel: officialDeadline };

  if (attempt.state === "prepared") {
    return {
      ...base,
      state: "needs_send",
      headline: "Você ainda não enviou",
      explanation: "Abrir ou copiar o canal não significa que o envio aconteceu.",
      nextActionLabel: "Abrir o canal oficial",
    };
  }
  if (attempt.state === "no_response") {
    return {
      ...base,
      state: "waiting",
      headline: "Ainda não houve resposta",
      explanation: "O COMUN registrou sua declaração e aguarda uma atualização do órgão.",
      nextActionLabel: "Registrar uma resposta quando chegar",
    };
  }
  if (attempt.state === "person_declared_sent") {
    if (selected?.protocolExpectation === "expected" && !attempt.officialProtocolMasked) {
      return {
        ...base,
        state: "needs_protocol",
        headline: "Você enviou, mas falta registrar o protocolo",
        explanation: "Guarde o número informado pelo órgão para acompanhar este mesmo caso.",
        nextActionLabel: "Registrar protocolo do órgão",
      };
    }
    return {
      ...base,
      state: "waiting",
      headline: "Esperando resposta",
      explanation: officialDeadline,
      nextActionLabel: "Registrar resposta quando chegar",
    };
  }
  if (attempt.state === "responded" && attempt.resolutionOutcome === "resolved") {
    return { ...base, state: "resolved", headline: "Resolvido", explanation: "Você registrou que a resposta resolveu o problema." };
  }
  if (attempt.state === "responded" && attempt.resolutionOutcome === "unresolved") {
    const next = escalationFor(input, attempt);
    if (next) {
      return {
        ...base,
        state: "escalation_available",
        headline: "A resposta não resolveu",
        explanation: "Há um próximo canal oficial possível para este caso.",
        nextActionLabel: `Ver ${next.label}`,
        nextChannelId: next.id,
        escalationReason: "resposta não resolveu e a etapa anterior tem os protocolos exigidos",
      };
    }
    return {
      ...base,
      state: "unresolved",
      headline: "A resposta não resolveu",
      explanation: "Precisamos revisar o próximo passo com segurança; não vamos inventar uma escalada.",
      nextActionLabel: "Ver próximo passo",
    };
  }
  if (attempt.state === "responded") {
    return {
      ...base,
      state: "response_received",
      headline: "Resposta recebida",
      explanation: "Revise o resultado registrado. O histórico antigo não permite inferir se resolveu.",
      nextActionLabel: "Revisar o resultado",
    };
  }
  return {
    ...base,
    state: "needs_human_review",
    headline: "Precisamos revisar o próximo passo",
    explanation: "O estado deste encaminhamento não corresponde a uma etapa conhecida.",
  };
}
