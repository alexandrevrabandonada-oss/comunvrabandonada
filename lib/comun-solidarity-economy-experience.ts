export const COMUN_48_4_A7_TERMINAL =
  "COMUN_48_4_A7_SOLIDARITY_ECONOMY_INTEGRATED_EXPERIENCE_GREEN_FIRST_CYCLE_CLOSED" as const;

export const COMUN_48_4_FIRST_CYCLE_DECISION =
  "48.4_FIRST_CYCLE_CLOSED" as const;

export const COMUN_48_4_FIRST_CYCLE_DEFERRED = {
  individualProducers:
    "COMUN_48_4_FIRST_CYCLE_INDIVIDUAL_PRODUCERS_DEFERRED",
  payments: "DEFERRED",
  orders: "DEFERRED",
  chat: "DEFERRED",
  ratings: "FORBIDDEN_FIRST_CYCLE",
  search: "DEFERRED_PUBLIC_DTO_ALREADY_CANONICAL",
  organizationIdentityMutation:
    "DEFERRED_PROTECTED_IDENTITY_REQUIRES_SEPARATE_CONTRACT",
} as const;

type RouteAccess =
  | "public_read"
  | "auth_continuation"
  | "request_access"
  | "pending_read_only"
  | "organization_maintenance"
  | "organization_governance"
  | "unavailable";

export type SolidarityEconomyRouteExperienceV1 = {
  route: string;
  public: RouteAccess;
  authenticatedNoLink: RouteAccess;
  pending: RouteAccess;
  editor: RouteAccess;
  facilitator: RouteAccess;
  flagOff: "legacy_compatible" | "unavailable";
  flagOn: "canonical";
  primaryIntent: "participate" | "discover" | "maintain" | "connect";
  primaryAction: string;
  returnPath: string;
};

export const SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1 = [
  ["/comun/participar", "public_read", "public_read", "public_read", "public_read", "public_read", "legacy_compatible", "participate", "Escolher como participar", "/comun"],
  ["/comun/cooperativas", "public_read", "public_read", "public_read", "public_read", "public_read", "legacy_compatible", "discover", "Conhecer o que circula", "/comun/participar"],
  ["/comun/cooperativas/[slug]", "request_access", "request_access", "pending_read_only", "organization_maintenance", "organization_governance", "unavailable", "discover", "Conhecer a organização", "/comun/cooperativas"],
  ["/comun/cooperativas/nova/[onboardingToken]", "unavailable", "auth_continuation", "auth_continuation", "auth_continuation", "auth_continuation", "unavailable", "maintain", "Continuar inclusão", "/comun/minha-participacao?secao=acompanhando"],
  ["/comun/cooperativas/[slug]/ofertas/*", "unavailable", "unavailable", "unavailable", "organization_maintenance", "organization_maintenance", "unavailable", "maintain", "Salvar ou publicar", "/comun/cooperativas/[slug]"],
  ["/comun/cooperativas/[slug]/necessidades/*", "unavailable", "unavailable", "unavailable", "organization_maintenance", "organization_maintenance", "unavailable", "maintain", "Salvar ou publicar", "/comun/cooperativas/[slug]"],
  ["/comun/cooperativas/[slug]/{interesse|ajudar}", "auth_continuation", "auth_continuation", "auth_continuation", "auth_continuation", "auth_continuation", "unavailable", "connect", "Enviar interesse ou ajuda", "/comun/cooperativas/[slug]"],
  ["/comun/minha-participacao?secao=acompanhando", "unavailable", "auth_continuation", "pending_read_only", "organization_maintenance", "organization_governance", "legacy_compatible", "maintain", "Continuar de onde parei", "/comun/participar"],
].map(([route, publicAccess, authenticatedNoLink, pending, editor, facilitator, flagOff, primaryIntent, primaryAction, returnPath]) => ({
  route,
  public: publicAccess,
  authenticatedNoLink,
  pending,
  editor,
  facilitator,
  flagOff,
  flagOn: "canonical",
  primaryIntent,
  primaryAction,
  returnPath,
})) as readonly SolidarityEconomyRouteExperienceV1[];

const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Aguardando revisão",
  published: "Publicada",
  paused: "Pausada",
  expired: "Vencida",
  archived: "Arquivada",
};

const NEED_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  partially_met: "Parcialmente atendida",
  met: "Atendida",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

export function solidarityOfferStatusLabel(status: string, isExpired = false) {
  if (isExpired) return "Vencida";
  return OFFER_STATUS_LABELS[status] ?? "Indisponível para manutenção";
}

export function solidarityNeedStatusLabel(status: string) {
  return NEED_STATUS_LABELS[status] ?? "Indisponível para manutenção";
}
