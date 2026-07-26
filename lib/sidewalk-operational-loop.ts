export type SidewalkOperationalInput = {
  status: string;
  verification_status?: string | null;
  forwarding_status?: string | null;
  forwarding_state?: string | null;
  updated_at?: string | null;
  last_observed_at?: string | null;
};

const forwardingLabels: Record<string, string> = {
  draft: "Encaminhamento em preparação",
  ready_for_review: "Encaminhamento em revisão",
  needs_correction: "Encaminhamento precisa de correção",
  protocol_pending: "Aguardando protocolo",
  protocol_registered: "Protocolo registrado",
  response_received: "Resposta recebida",
  result_recorded: "Resultado registrado",
  memory_draft: "Memória em revisão",
  closed: "Ciclo preservado em memória",
};

export function projectSidewalkOperationalState(
  input: SidewalkOperationalInput,
) {
  const forwardingState = input.forwarding_state ?? "";
  if (forwardingState) {
    const next: Record<string, string> = {
      draft: "A equipe revisará o pacote de encaminhamento.",
      ready_for_review: "Aguardar a decisão editorial do encaminhamento.",
      needs_correction: "A equipe corrigirá o pacote antes de prosseguir.",
      protocol_pending: "Aguardar o registro manual do protocolo.",
      protocol_registered: "Acompanhar o prazo e a resposta do órgão.",
      response_received: "A equipe verificará o resultado no território.",
      result_recorded: "Aguardar a revisão da memória pública.",
      memory_draft: "A equipe concluirá a revisão da memória.",
      closed: "Acompanhar se a melhoria permanece.",
    };
    return {
      state: forwardingLabels[forwardingState] ?? forwardingState,
      nextAction:
        next[forwardingState] ?? "Acompanhar a próxima atualização do ciclo.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  }
  if (input.forwarding_status === "priority")
    return {
      state: "Relacionado a prioridade",
      nextAction: "Acompanhar a proposta e a próxima ação coletiva.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  if (input.status === "published" || input.status === "verified")
    return {
      state: "Publicado após revisão",
      nextAction: "Confirmar mudanças ou enviar nova evidência aprovada.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  if (input.status === "under_review" || input.status === "pending")
    return {
      state: "Em triagem",
      nextAction: "Aguardar revisão ou pedido de complemento.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  if (input.status === "rejected")
    return {
      state: "Não publicado",
      nextAction: "Consulte a Caixa de entrada para entender a decisão.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  if (input.status === "withdrawn")
    return {
      state: "Retirado",
      nextAction: "Nenhuma ação necessária.",
      lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
    };
  return {
    state: input.status,
    nextAction: "Acompanhar a próxima atualização.",
    lastChangedAt: input.updated_at ?? input.last_observed_at ?? null,
  };
}

export function duplicateSignalScore(input: {
  distanceMeters?: number | null;
  sameCategory: boolean;
  hoursApart?: number | null;
  sameImageHash: boolean;
  textSimilarity?: number | null;
}) {
  const signals: string[] = [];
  let score = 0;
  if (input.distanceMeters != null && input.distanceMeters <= 75) {
    score += 30;
    signals.push("proximidade_territorial");
  }
  if (input.sameCategory) {
    score += 20;
    signals.push("mesma_categoria");
  }
  if (input.hoursApart != null && input.hoursApart <= 168) {
    score += 10;
    signals.push("intervalo_temporal");
  }
  if (input.sameImageHash) {
    score += 35;
    signals.push("mesmo_hash_imagem");
  }
  if ((input.textSimilarity ?? 0) >= 0.7) {
    score += 20;
    signals.push("semelhanca_textual");
  }
  return {
    score: Math.min(score, 100),
    signals,
    suggested: score >= 50,
  };
}
