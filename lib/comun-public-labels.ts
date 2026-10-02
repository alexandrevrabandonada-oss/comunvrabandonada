const pautaStatuses: Record<string, string> = {
  received: "Recebida",
  triage: "Em triagem",
  investigating: "Em investigação",
  collecting_evidence: "Reunindo evidências",
  building_proposal: "Construindo proposta",
  ready_for_action: "Pronta para ação",
  active_mobilization: "Em mobilização",
  awaiting_response: "Aguardando resposta",
  monitoring: "Em acompanhamento",
  partial_win: "Resultado parcial",
  resolved: "Resolvida",
  no_progress: "Sem avanço",
  archived: "Arquivada",
  observing: "Observando",
  organizing: "Organizando",
  drafting: "Sintetizando",
  pressuring: "Cobrando",
  unresolved: "Não resolvida",
  receiving_reports: "Recebendo relatos",
  checking: "Em verificação",
  became_post: "Publicação produzida",
  preparing_dossier: "Preparando dossiê",
  forwarded: "Encaminhada",
};

export function publicPautaStatusLabel(value: string) {
  return Object.hasOwn(pautaStatuses, value)
    ? pautaStatuses[value]
    : "Estado não informado";
}

export function publicPautaStateLabel(
  status: string,
  editorialState?: string | null,
) {
  const value = editorialState?.trim();
  if (!value) return publicPautaStatusLabel(status);
  if (Object.hasOwn(pautaStatuses, value)) return publicPautaStatusLabel(value);
  // Preserve editorial wording, but do not expose an unknown snake_case code.
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(value))
    return "Estado não informado";
  return value;
}

const sidewalkProblems: Record<string, string> = {
  hole: "Buraco",
  buraco: "Buraco",
  irregular: "Piso irregular",
  no_ramp: "Sem rampa",
  sem_rampa: "Sem rampa",
  obstacle: "Obstáculo",
  obstaculo: "Obstáculo",
  narrow: "Calçada estreita",
  estreita: "Calçada estreita",
  no_sidewalk: "Sem calçada",
  sem_calcada: "Sem calçada",
};

export function publicSidewalkProblemLabels(values: readonly string[]) {
  return [
    ...new Set(
      values.map(
        (value) => sidewalkProblems[value] ?? "Problema não classificado",
      ),
    ),
  ].join(" · ");
}
