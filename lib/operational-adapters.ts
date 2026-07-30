import type { OperationQueue } from "./editorial-operation";
import type { ComunOperationalRole } from "./types";

export const OPERATIONAL_DOMAINS = [
  "communities",
  "pautas",
  "actions",
  "protocols",
  "sidewalks",
  "archive",
  "radio",
  "art",
  "platform",
] as const;

export type OperationalDomain = (typeof OPERATIONAL_DOMAINS)[number];
export type OperationalSlaState =
  | "within_sla"
  | "due_soon"
  | "overdue"
  | "paused_for_information"
  | "blocked_by_third_party"
  | "not_applicable";

export type OperationalSourceSnapshot = {
  domain: OperationalDomain;
  sourceType: string;
  sourceId: string;
  sourceVersion: string;
  workCategory: string;
  sourceState: string;
  updatedAt: string;
  dueAt?: string | null;
  risk?: "normal" | "attention" | "high" | "critical";
  cycle?: string;
  pautaId?: string | null;
  territoryId?: string | null;
};

export type SanitizedOperationalCandidate = {
  domain: OperationalDomain;
  sourceType: string;
  sourceKey: string;
  sourceVersion: string;
  workCategory: string;
  idempotencyKey: string;
  queue: OperationQueue;
  state: "pending" | "assigned" | "in_review" | "blocked" | "ready";
  priority: 1 | 2 | 3 | 4;
  dueAt: string | null;
  slaState: OperationalSlaState;
  requiredRole: ComunOperationalRole;
  title: string;
  publicReason: string;
  nextAction: string;
  humanGate: string | null;
  pautaId: string | null;
  territoryId: string | null;
  sourceUpdatedAt: string;
};

export type OperationalRule = {
  domain: OperationalDomain;
  sourceType: string;
  workCategory: string;
  queue: OperationQueue;
  priority: 1 | 2 | 3 | 4;
  slaHours: number | null;
  requiredRole: ComunOperationalRole;
  title: string;
  publicReason: string;
  nextAction: string;
  humanGate: string | null;
};

export const OPERATIONAL_RULES: readonly OperationalRule[] = [
  rule(
    "communities",
    "community_request",
    "membership_review",
    "entry",
    3,
    48,
    "coordinator",
    "Solicitação comunitária aguarda cuidado",
    "Há uma solicitação de entrada que precisa de revisão moderada.",
    "Revisar a solicitação na comunidade.",
    "community_membership_review",
  ),
  rule(
    "communities",
    "role_review",
    "role_expiration",
    "follow_up",
    2,
    168,
    "operations_admin",
    "Papel comunitário precisa de revisão",
    "Um papel ativo chegou à janela de revisão.",
    "Revisar validade e escopo na comunidade.",
    "community_role_review",
  ),
  rule(
    "pautas",
    "contribution",
    "contribution_triage",
    "triage",
    3,
    48,
    "contribution_reviewer",
    "Contribuição aguarda triagem",
    "Uma contribuição precisa de leitura e encaminhamento humano.",
    "Abrir a contribuição na pauta.",
    "editorial_review",
  ),
  rule(
    "pautas",
    "contribution",
    "privacy_review",
    "safety",
    1,
    24,
    "privacy_reviewer",
    "Contribuição requer cuidado de privacidade",
    "A triagem identificou um risco que deve ser tratado antes de qualquer publicação.",
    "Executar revisão de privacidade na fonte.",
    "privacy_review",
  ),
  rule(
    "pautas",
    "synthesis",
    "synthesis_review",
    "editorial",
    3,
    96,
    "facilitator",
    "Síntese aguarda revisão coletiva",
    "Uma síntese precisa de revisão antes de orientar o processo.",
    "Revisar a versão na pauta.",
    "synthesis_publication",
  ),
  rule(
    "pautas",
    "decision",
    "decision_authorization",
    "editorial",
    2,
    72,
    "coordinator",
    "Decisão aguarda papel autorizado",
    "O processo chegou a uma decisão que não pode ser inferida automaticamente.",
    "Registrar a decisão na pauta.",
    "political_decision",
  ),
  rule(
    "actions",
    "action",
    "action_without_next_step",
    "follow_up",
    2,
    72,
    "coordinator",
    "Ação coletiva sem próxima etapa",
    "Uma ação precisa de responsabilidade ou encaminhamento explícito.",
    "Abrir a ação e definir a próxima etapa.",
    null,
  ),
  rule(
    "actions",
    "task",
    "task_overdue",
    "follow_up",
    2,
    24,
    "coordinator",
    "Tarefa coletiva vencida",
    "Uma tarefa passou do prazo sem encerramento na fonte.",
    "Revisar bloqueio, prazo e responsabilidade.",
    null,
  ),
  rule(
    "actions",
    "result",
    "result_verification",
    "factual",
    2,
    120,
    "result_editor",
    "Resultado aguarda verificação",
    "Atividade concluída não resolve automaticamente o processo.",
    "Verificar evidência e registrar o resultado.",
    "verified_result",
  ),
  rule(
    "protocols",
    "protocol",
    "protocol_due",
    "follow_up",
    2,
    72,
    "protocol_operator",
    "Protocolo precisa de acompanhamento",
    "Um prazo institucional está próximo ou vencido.",
    "Abrir o protocolo e registrar o acompanhamento.",
    null,
  ),
  rule(
    "protocols",
    "response",
    "response_synthesis",
    "factual",
    2,
    72,
    "protocol_operator",
    "Resposta aguarda síntese pública",
    "Uma resposta recebida ainda precisa de análise e resumo sanitizado.",
    "Revisar a resposta na fonte.",
    "response_publication",
  ),
  rule(
    "sidewalks",
    "sidewalk_upload",
    "unconfirmed_upload",
    "entry",
    3,
    24,
    "contribution_reviewer",
    "Envio de Calçadas não foi confirmado",
    "Um upload privado ainda não foi associado a um registro confirmado.",
    "Abrir a operação das Calçadas.",
    null,
  ),
  rule(
    "sidewalks",
    "sidewalk_record",
    "moderation",
    "triage",
    3,
    48,
    "contribution_reviewer",
    "Registro de Calçadas aguarda moderação",
    "Um registro recebido precisa de revisão antes de qualquer projeção pública.",
    "Abrir o registro na operação das Calçadas.",
    "sidewalk_moderation",
  ),
  rule(
    "sidewalks",
    "forwarding",
    "forwarding_follow_up",
    "follow_up",
    2,
    120,
    "protocol_operator",
    "Encaminhamento de Calçadas sem atualização",
    "Um encaminhamento comunitário precisa de continuidade.",
    "Abrir o encaminhamento na pauta.",
    null,
  ),
  rule(
    "archive",
    "archive_submission",
    "archive_triage",
    "entry",
    3,
    96,
    "archive_curator",
    "Contribuição do Acervo aguarda triagem",
    "Uma contribuição cultural precisa de proveniência e revisão.",
    "Abrir a contribuição do Acervo.",
    "archive_editorial_review",
  ),
  rule(
    "archive",
    "archive_asset",
    "missing_accessibility",
    "publication",
    2,
    72,
    "archive_curator",
    "Asset cultural requer acessibilidade",
    "Um asset aprovado ainda não cumpre o contrato público acessível.",
    "Revisar a derivada e o texto alternativo.",
    "cultural_publication",
  ),
  rule(
    "archive",
    "withdrawal",
    "rights_withdrawal",
    "withdrawals",
    1,
    12,
    "rights_reviewer",
    "Pedido de retirada cultural",
    "Um pedido de retirada requer contenção e decisão humana urgente.",
    "Abrir o pedido na frente cultural.",
    "content_withdrawal",
  ),
  rule(
    "radio",
    "radio_item",
    "radio_processing",
    "publication",
    3,
    96,
    "radio_editor",
    "Áudio da Rádio aguarda processamento",
    "Um item de áudio ainda não está pronto para revisão.",
    "Abrir a produção da Rádio.",
    null,
  ),
  rule(
    "radio",
    "radio_item",
    "radio_rights",
    "rights",
    2,
    120,
    "rights_reviewer",
    "Rádio aguarda direitos e consentimentos",
    "Direitos de voz ou música precisam de revisão.",
    "Abrir direitos da Rádio.",
    "rights_decision",
  ),
  rule(
    "art",
    "artwork",
    "artwork_rights",
    "rights",
    2,
    120,
    "art_editor",
    "Obra territorial aguarda direitos",
    "Uma obra não pode avançar sem base de uso exata.",
    "Abrir direitos da obra.",
    "rights_decision",
  ),
  rule(
    "art",
    "artwork",
    "artwork_accessibility",
    "publication",
    2,
    72,
    "art_editor",
    "Obra territorial requer acessibilidade",
    "A versão pública ainda precisa de descrição acessível.",
    "Abrir revisão editorial da obra.",
    "cultural_publication",
  ),
  rule(
    "platform",
    "incident",
    "critical_incident",
    "safety",
    1,
    4,
    "operations_admin",
    "Incidente crítico de plataforma",
    "Uma falha persistente pode afetar segurança ou continuidade.",
    "Abrir o incidente e iniciar contenção.",
    "incident_containment",
  ),
  rule(
    "platform",
    "alert",
    "persistent_finding",
    "follow_up",
    2,
    24,
    "operations_admin",
    "Finding operacional persistente",
    "Uma auditoria repetida requer coordenação técnica.",
    "Abrir a issue agregadora de operação.",
    null,
  ),
] as const;

function rule(
  domain: OperationalDomain,
  sourceType: string,
  workCategory: string,
  queue: OperationQueue,
  priority: 1 | 2 | 3 | 4,
  slaHours: number | null,
  requiredRole: ComunOperationalRole,
  title: string,
  publicReason: string,
  nextAction: string,
  humanGate: string | null,
): OperationalRule {
  return {
    domain,
    sourceType,
    workCategory,
    queue,
    priority,
    slaHours,
    requiredRole,
    title,
    publicReason,
    nextAction,
    humanGate,
  };
}

export function operationalRuleFor(
  source: Pick<
    OperationalSourceSnapshot,
    "domain" | "sourceType" | "workCategory"
  >,
) {
  return (
    OPERATIONAL_RULES.find(
      (candidate) =>
        candidate.domain === source.domain &&
        candidate.sourceType === source.sourceType &&
        candidate.workCategory === source.workCategory,
    ) ?? null
  );
}

export function operationalIdempotencyKey(
  source: Pick<
    OperationalSourceSnapshot,
    "domain" | "sourceType" | "sourceId" | "workCategory" | "cycle"
  >,
) {
  const cycle = source.cycle?.trim() || "current";
  return [
    source.domain,
    source.sourceType,
    source.sourceId,
    source.workCategory,
    cycle,
  ].join(":");
}

export function deriveSlaState(
  dueAt: string | null,
  now = new Date(),
  sourceState?: string,
): OperationalSlaState {
  if (sourceState === "information_requested") return "paused_for_information";
  if (sourceState === "blocked_by_third_party") return "blocked_by_third_party";
  if (!dueAt) return "not_applicable";
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "not_applicable";
  if (due < now.getTime()) return "overdue";
  if (due - now.getTime() <= 72 * 60 * 60 * 1000) return "due_soon";
  return "within_sla";
}

export function deriveOperationalCandidate(
  source: OperationalSourceSnapshot,
  now = new Date(),
): SanitizedOperationalCandidate {
  const matched = operationalRuleFor(source);
  if (!matched)
    throw new Error("COMUN_OPERATIONAL_SOURCE_RULE_NOT_ALLOWLISTED");
  if (!/^[0-9a-f-]{36}$/i.test(source.sourceId))
    throw new Error("COMUN_OPERATIONAL_SOURCE_ID_INVALID");
  const sourceUpdatedAt = new Date(source.updatedAt);
  if (!Number.isFinite(sourceUpdatedAt.getTime()))
    throw new Error("COMUN_OPERATIONAL_SOURCE_VERSION_INVALID");
  const dueAt =
    source.dueAt ??
    (matched.slaHours === null
      ? null
      : new Date(
          sourceUpdatedAt.getTime() + matched.slaHours * 60 * 60 * 1000,
        ).toISOString());
  const priority =
    source.risk === "critical" || source.risk === "high" ? 1 : matched.priority;
  return {
    domain: matched.domain,
    sourceType: matched.sourceType,
    sourceKey: source.sourceId,
    sourceVersion: source.sourceVersion,
    workCategory: matched.workCategory,
    idempotencyKey: operationalIdempotencyKey(source),
    queue: matched.queue,
    state:
      source.sourceState === "information_requested" ||
      source.sourceState === "blocked_by_third_party"
        ? "blocked"
        : "pending",
    priority,
    dueAt,
    slaState: deriveSlaState(dueAt, now, source.sourceState),
    requiredRole: matched.requiredRole,
    title: matched.title,
    publicReason: matched.publicReason,
    nextAction: matched.nextAction,
    humanGate: matched.humanGate,
    pautaId: source.pautaId ?? null,
    territoryId: source.territoryId ?? null,
    sourceUpdatedAt: sourceUpdatedAt.toISOString(),
  };
}

export function assertUniqueOperationalCandidates(
  candidates: readonly SanitizedOperationalCandidate[],
) {
  const keys = new Set<string>();
  for (const candidate of candidates) {
    if (keys.has(candidate.idempotencyKey))
      throw new Error("COMUN_OPERATIONAL_DUPLICATE_CANDIDATE");
    keys.add(candidate.idempotencyKey);
  }
}

export const OPERATIONAL_CANONICAL_MATRIX = [
  [
    "comunidades",
    "comun_community_memberships / comun_community_role_assignments",
    "solicitação e revisão de papel",
    "entry / follow_up",
    "48 h / 7 dias",
    "coordinator / operations_admin",
  ],
  [
    "contribuições",
    "comun_pauta_contributions",
    "triagem, complemento e privacidade",
    "triage / safety",
    "48 h / 24 h",
    "contribution_reviewer / privacy_reviewer",
  ],
  [
    "pautas",
    "comun_pauta_spaces e versões de síntese",
    "síntese e decisão",
    "editorial",
    "72–96 h",
    "facilitator / coordinator",
  ],
  [
    "ações",
    "comun_collective_actions",
    "ação sem próxima etapa e resultado",
    "follow_up / factual",
    "72–120 h",
    "coordinator / result_editor",
  ],
  [
    "tarefas",
    "comun_collective_action_tasks",
    "tarefa vencida",
    "follow_up",
    "24 h após vencimento",
    "coordinator",
  ],
  [
    "protocolos",
    "comun_official_protocols",
    "prazo institucional",
    "follow_up",
    "72 h",
    "protocol_operator",
  ],
  [
    "respostas",
    "comun_official_protocols",
    "resposta sem síntese",
    "factual",
    "72 h",
    "protocol_operator",
  ],
  [
    "resultados",
    "comun_collective_actions",
    "resultado sem verificação",
    "factual",
    "120 h",
    "result_editor",
  ],
  [
    "calçadas",
    "comun_sidewalk_uploads / records / forwardings",
    "upload, moderação e encaminhamento",
    "entry / triage / follow_up",
    "24–120 h",
    "contribution_reviewer / protocol_operator",
  ],
  [
    "Acervo",
    "comun_archive_submissions / assets",
    "triagem e acessibilidade",
    "entry / publication",
    "72–96 h",
    "archive_curator",
  ],
  [
    "Rádio",
    "comun_radio_* / processing_jobs",
    "processamento e direitos",
    "publication / rights",
    "96–120 h",
    "radio_editor / rights_reviewer",
  ],
  [
    "Arte",
    "comun_archive_artworks / rights",
    "direitos e acessibilidade",
    "rights / publication",
    "72–120 h",
    "art_editor",
  ],
  [
    "correções",
    "pedidos canônicos de cada domínio",
    "correção solicitada",
    "corrections",
    "72 h",
    "operations_admin",
  ],
  [
    "retiradas",
    "comun_archive_rights_removal_requests e equivalentes",
    "retirada urgente",
    "withdrawals",
    "12 h",
    "rights_reviewer",
  ],
  [
    "incidentes",
    "comun_admin_alerts / workflows",
    "finding persistente ou crítico",
    "safety / follow_up",
    "4–24 h",
    "operations_admin",
  ],
] as const;
