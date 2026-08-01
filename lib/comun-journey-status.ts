export const COMUN_PUBLIC_JOURNEY_STATES = [
  "received",
  "awaiting_triage",
  "in_review",
  "information_requested",
  "approved",
  "published",
  "forwarded",
  "response_received",
  "result_registered",
  "completed",
  "withdrawn",
] as const;

export type ComunPublicJourneyState =
  (typeof COMUN_PUBLIC_JOURNEY_STATES)[number];

export const COMUN_JOURNEY_STATE_COPY: Record<
  ComunPublicJourneyState,
  { label: string; description: string; nextAction: string }
> = {
  received: {
    label: "Recebido",
    description: "O registro chegou ao COMUN e ainda não foi publicado.",
    nextAction: "Aguardar a triagem",
  },
  awaiting_triage: {
    label: "Aguardando triagem",
    description: "A equipe vai conferir contexto, segurança e destino.",
    nextAction: "Acompanhar uma mudança",
  },
  in_review: {
    label: "Em revisão",
    description: "O conteúdo e as evidências estão sendo conferidos.",
    nextAction: "Aguardar revisão",
  },
  information_requested: {
    label: "Complemento solicitado",
    description: "Uma informação é necessária para o processo continuar.",
    nextAction: "Abrir pedido na Caixa",
  },
  approved: {
    label: "Aprovado",
    description: "A revisão terminou e o próximo destino foi definido.",
    nextAction: "Ver decisão",
  },
  published: {
    label: "Publicado",
    description: "Uma versão pública e revisada está disponível.",
    nextAction: "Abrir publicação",
  },
  forwarded: {
    label: "Encaminhado",
    description: "O processo foi enviado à pessoa ou instituição responsável.",
    nextAction: "Aguardar retorno",
  },
  response_received: {
    label: "Resposta recebida",
    description: "Há uma resposta relacionada, ainda distinta de resultado.",
    nextAction: "Ler resposta",
  },
  result_registered: {
    label: "Resultado registrado",
    description: "Uma consequência foi registrada com fonte e limites.",
    nextAction: "Ver resultado",
  },
  completed: {
    label: "Encerrado",
    description: "O processo terminou com uma justificativa acessível.",
    nextAction: "Ver histórico",
  },
  withdrawn: {
    label: "Retirado",
    description: "O item foi retirado e não aparece como contribuição ativa.",
    nextAction: "Ver histórico",
  },
};

const aliases: Record<string, ComunPublicJourneyState> = {
  pending: "received",
  pending_review: "in_review",
  review: "in_review",
  needs_information: "information_requested",
  awaiting_person: "information_requested",
  accepted: "approved",
  resolved: "completed",
  archived: "completed",
  result_recorded: "result_registered",
};

export function normalizeComunJourneyStatus(
  value: unknown,
): ComunPublicJourneyState {
  const candidate = String(value ?? "received").toLowerCase();
  if (
    COMUN_PUBLIC_JOURNEY_STATES.includes(candidate as ComunPublicJourneyState)
  )
    return candidate as ComunPublicJourneyState;
  return aliases[candidate] ?? "received";
}
