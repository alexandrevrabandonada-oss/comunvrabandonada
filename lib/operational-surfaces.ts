import type { OperationalSurface } from "./operational-authorization";
import type { ComunOperationalRole } from "./types";

export type OperationalSurfaceKey =
  | "queue"
  | "assignment"
  | "reassignment"
  | "privacy"
  | "media"
  | "art-rights"
  | "radio-rights"
  | "circle"
  | "synthesis"
  | "protocol"
  | "response"
  | "result"
  | "correction"
  | "withdrawal"
  | "incidents"
  | "audit"
  | "error"
  | "empty"
  | "expired";

export type OperationalSurfaceDefinition = {
  key: OperationalSurfaceKey;
  title: string;
  eyebrow: string;
  description: string;
  action: string;
  role: ComunOperationalRole;
  authorization: OperationalSurface;
  state: "ready" | "empty" | "error" | "expired";
};

export const OPERATIONAL_SURFACES: readonly OperationalSurfaceDefinition[] = [
  {
    key: "queue",
    title: "Fila editorial",
    eyebrow: "Triagem",
    description: "Itens priorizados, paginados e sem originais na listagem.",
    action: "Abrir próximo item",
    role: "contribution_reviewer",
    authorization: "central",
    state: "ready",
  },
  {
    key: "assignment",
    title: "Atribuição",
    eyebrow: "Responsabilidade",
    description:
      "Atribuição explícita, com prazo indicativo e confirmação humana.",
    action: "Confirmar atribuição",
    role: "operations_admin",
    authorization: "assignment",
    state: "ready",
  },
  {
    key: "reassignment",
    title: "Reatribuição",
    eyebrow: "Continuidade",
    description: "Troca responsável sem ampliar as permissões do novo titular.",
    action: "Reatribuir item",
    role: "operations_admin",
    authorization: "assignment",
    state: "ready",
  },
  {
    key: "privacy",
    title: "Revisão de privacidade",
    eyebrow: "Proteção",
    description:
      "Metadados mínimos; contato e notas privadas permanecem ocultos.",
    action: "Aprovar relato sem imagem",
    role: "privacy_reviewer",
    authorization: "privacy",
    state: "ready",
  },
  {
    key: "media",
    title: "Revisão de mídia",
    eyebrow: "Imagem",
    description:
      "Original privado e derivada separados; a listagem não carrega o original.",
    action: "Bloquear imagem",
    role: "image_reviewer",
    authorization: "privacy",
    state: "ready",
  },
  {
    key: "art-rights",
    title: "Direitos de Arte",
    eyebrow: "Direitos",
    description:
      "Publicação condicionada à base de uso registrada para a obra.",
    action: "Aprovar direito permitido",
    role: "rights_reviewer",
    authorization: "rights",
    state: "ready",
  },
  {
    key: "radio-rights",
    title: "Direitos e consentimentos da Rádio",
    eyebrow: "Rádio",
    description:
      "Direitos da faixa e consentimento de voz avaliados separadamente.",
    action: "Bloquear publicação",
    role: "rights_reviewer",
    authorization: "rights",
    state: "ready",
  },
  {
    key: "circle",
    title: "Roda",
    eyebrow: "Facilitação",
    description:
      "Conversa organizada com pauta, responsabilidades e próximo passo.",
    action: "Abrir roda na pauta",
    role: "facilitator",
    authorization: "circle",
    state: "ready",
  },
  {
    key: "synthesis",
    title: "Síntese da roda",
    eyebrow: "Memória",
    description:
      "Síntese editável, sem atribuir falas privadas a participantes.",
    action: "Publicar síntese",
    role: "facilitator",
    authorization: "circle",
    state: "ready",
  },
  {
    key: "protocol",
    title: "Protocolo",
    eyebrow: "Encaminhamento",
    description:
      "Pacote sanitizado e confirmação humana antes de qualquer registro institucional.",
    action: "Abrir protocolo na fonte",
    role: "protocol_operator",
    authorization: "protocol",
    state: "ready",
  },
  {
    key: "response",
    title: "Resposta recebida",
    eyebrow: "Retorno",
    description:
      "Resposta vinculada ao protocolo sem expor o documento original.",
    action: "Abrir resposta na fonte",
    role: "protocol_operator",
    authorization: "protocol",
    state: "ready",
  },
  {
    key: "result",
    title: "Resultado",
    eyebrow: "Continuidade",
    description:
      "Resultado, evidência sanitizada e continuidade editorial no mesmo fluxo.",
    action: "Atualizar continuidade",
    role: "result_editor",
    authorization: "result",
    state: "ready",
  },
  {
    key: "correction",
    title: "Correção solicitada",
    eyebrow: "Participação",
    description:
      "Correção preserva histórico, motivo e decisão humana auditável.",
    action: "Revisar correção",
    role: "operations_admin",
    authorization: "withdrawal",
    state: "ready",
  },
  {
    key: "withdrawal",
    title: "Retirada urgente",
    eyebrow: "Contenção",
    description:
      "Contenção permanece disponível no mobile e antecede ações editoriais.",
    action: "Conter publicação",
    role: "operations_admin",
    authorization: "withdrawal",
    state: "ready",
  },
  {
    key: "incidents",
    title: "Incidentes",
    eyebrow: "Segurança",
    description:
      "Ocorrências locais ordenadas por gravidade e prazo de resposta.",
    action: "Assumir incidente",
    role: "operations_admin",
    authorization: "central",
    state: "ready",
  },
  {
    key: "audit",
    title: "Auditoria",
    eyebrow: "Rastreabilidade",
    description:
      "Eventos paginados e sanitizados, sem cookies, tokens ou conteúdo privado.",
    action: "Ver próxima página",
    role: "operations_admin",
    authorization: "audit",
    state: "ready",
  },
  {
    key: "error",
    title: "Falha contida",
    eyebrow: "Estado de erro",
    description:
      "A operação falhou de modo seguro; nenhum dado parcial foi apresentado.",
    action: "Tentar novamente",
    role: "operations_admin",
    authorization: "central",
    state: "error",
  },
  {
    key: "empty",
    title: "Fila vazia",
    eyebrow: "Estado vazio",
    description:
      "Não há itens neste recorte. Os filtros podem ser removidos sem perder contexto.",
    action: "Limpar filtros",
    role: "contribution_reviewer",
    authorization: "central",
    state: "empty",
  },
  {
    key: "expired",
    title: "Sessão expirada",
    eyebrow: "Autenticação",
    description:
      "A sessão terminou e nenhuma informação operacional permanece nesta tela.",
    action: "Entrar novamente",
    role: "operations_admin",
    authorization: "central",
    state: "expired",
  },
] as const;

export function getOperationalSurface(key: string) {
  return OPERATIONAL_SURFACES.find((surface) => surface.key === key) ?? null;
}

const ACTION_HREFS: Partial<Record<OperationalSurfaceKey, string>> = {
  queue: "/comun/admin/operacao",
  assignment: "/comun/admin/operacao?unassigned=1",
  reassignment: "/comun/admin/operacao?sort=next_action",
  privacy: "/comun/admin/relatos",
  media: "/comun/admin/calcadas/operacao",
  "art-rights": "/comun/admin/acervo/arte/direitos",
  "radio-rights": "/comun/admin/radio/direitos",
  circle: "/comun/admin/pautas",
  synthesis: "/comun/admin/pautas",
  protocol: "/comun/admin/protocolos-oficiais",
  response: "/comun/admin/protocolos-oficiais",
  result: "/comun/admin/dossies",
  correction: "/comun/admin/alertas",
  withdrawal: "/comun/admin/alertas",
  incidents: "/comun/admin/operacao?type=incident",
  audit: "/comun/admin/auditoria",
  error: "/comun/admin/operacao",
  empty: "/comun/admin/operacao",
  expired: "/comun/admin/login",
};

export function operationalSurfaceActionHref(key: OperationalSurfaceKey) {
  return ACTION_HREFS[key] ?? "/comun/admin/operacao";
}
