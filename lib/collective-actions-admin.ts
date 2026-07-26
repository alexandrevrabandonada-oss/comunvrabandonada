export const collectiveForwardingStates = [
  "preparing",
  "sent",
  "protocol_registered",
  "awaiting_response",
  "response_received",
  "verified_in_territory",
  "closed",
] as const;

export const collectiveForwardingStateLabels: Record<
  (typeof collectiveForwardingStates)[number],
  string
> = {
  preparing: "preparando encaminhamento",
  sent: "encaminhamento enviado",
  protocol_registered: "protocolo registrado",
  awaiting_response: "aguardando resposta",
  response_received: "resposta recebida",
  verified_in_territory: "verificado no território",
  closed: "encaminhamento encerrado",
};

export const collectiveTimelineEvents = {
  action_published: { updateType: "announcement", title: "Ação publicada" },
  task_opened: { updateType: "task", title: "Tarefa aberta" },
  activity_realized: { updateType: "progress", title: "Atividade realizada" },
  forwarding_sent: {
    updateType: "forwarding",
    title: "Encaminhamento enviado",
  },
  protocol_registered: { updateType: "protocol", title: "Protocolo registrado" },
  response_received: { updateType: "response", title: "Resposta recebida" },
  result_verified: { updateType: "result", title: "Resultado verificado" },
  memory_completed: { updateType: "memory", title: "Memória concluída" },
} as const;

export type CollectiveTimelineEventKey = keyof typeof collectiveTimelineEvents;

const transitions: Record<string, readonly string[]> = {
  draft: ["preparing", "open", "cancelled", "archived"],
  preparing: ["draft", "open", "cancelled", "archived"],
  open: ["active", "awaiting_result", "cancelled", "archived"],
  active: ["open", "awaiting_result", "cancelled", "archived"],
  awaiting_result: ["active", "completed", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function canTransitionCollectiveAction(
  from: string,
  to: string,
) {
  return from === to || transitions[from]?.includes(to) === true;
}

export function nextCollectiveAdministrativeStep(action: {
  status: string;
  forwarding?: { state?: string | null } | null;
  result_summary?: string | null;
  memory_summary?: string | null;
}) {
  if (action.status === "draft") return "Revise o caderno e prepare a ação.";
  if (action.status === "preparing") return "Abra tarefas e publique quando houver um próximo passo claro.";
  if (action.status === "open") return "Acompanhe participação e registre a atividade realizada.";
  if (action.status === "active") return "Registre os passos coletivos e encaminhamentos revisados.";
  if (action.status === "awaiting_result") {
    if (!action.result_summary) return "Registre o resultado alcançado, parcial ou não alcançado.";
    return "Conclua a ação e preserve seus aprendizados.";
  }
  if (action.status === "completed" && !action.memory_summary)
    return "Escreva a memória final e os próximos desdobramentos.";
  if (action.status === "completed") return "A memória está publicada no caderno coletivo.";
  return "Esta ação não possui próximos passos administrativos.";
}

export function sanitizeCollectivePublicText(value: string, maxLength = 2_000) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[contato removido]")
    .replace(/(?:\+?\d[\d().\s-]{7,}\d)/g, "[telefone removido]")
    .trim()
    .slice(0, maxLength);
}

export function isSafePublicUrl(value: string | null) {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
