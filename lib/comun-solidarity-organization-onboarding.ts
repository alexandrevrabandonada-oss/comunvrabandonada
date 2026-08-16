import { isComunSolidarityEconomyPublicCoreEnabled } from "@/lib/comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "@/lib/comun-solidarity-organization-governance";

export const COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_FLAG =
  "COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED" as const;

export const SOLIDARITY_ONBOARDING_STATES = [
  "draft",
  "submitted",
  "needs_changes",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export const SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES = [
  "cooperative",
  "association",
  "collective",
  "informal_group",
  "solidarity_enterprise",
  "network",
  "other",
] as const;

export type SolidarityOrganizationOnboardingState =
  (typeof SOLIDARITY_ONBOARDING_STATES)[number];
export type SolidarityOnboardingOrganizationType =
  (typeof SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES)[number];

export type PrivateSolidarityOrganizationOnboardingSummaryV1 = {
  onboardingId: string;
  continuationToken: string;
  organizationName: string;
  state: SolidarityOrganizationOnboardingState;
  reviewMessagePrivate: string | null;
  approvedTerritoryId: string | null;
  updatedAt: string;
};

export type PrivateSolidarityOrganizationOnboardingV1 =
  PrivateSolidarityOrganizationOnboardingSummaryV1 & {
    organizationType: SolidarityOnboardingOrganizationType | null;
    presentation: string | null;
    serviceTerritory: string | null;
    publicContactCandidate: string | null;
    publicContactPublicationAuthorized: boolean;
    publicSourceUrlCandidate: string | null;
    participationNotePrivate: string | null;
    createdAt: string;
  };

export type PrivateSolidarityOrganizationOnboardingReviewV1 = {
  onboardingId: string;
  organizationName: string;
  organizationType: SolidarityOnboardingOrganizationType;
  presentation: string;
  serviceTerritory: string | null;
  publicContactCandidate: string | null;
  publicContactPublicationAuthorized: boolean;
  publicSourceUrlCandidate: string | null;
  participationNotePrivate: string;
  state: "submitted";
  submittedAt: string;
  updatedAt: string;
};

export type SolidarityOnboardingActionState =
  | { state: "idle" }
  | { state: "auth_required"; message: string; loginHref: string }
  | { state: "error"; message: string }
  | { state: "existing_organization"; message: string; href: string }
  | { state: "success"; message: string; href: string };

export const initialSolidarityOnboardingActionState = {
  state: "idle",
} satisfies SolidarityOnboardingActionState;

export function isComunSolidarityOrganizationOnboardingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_FLAG] === "enabled" &&
    isComunSolidarityEconomyPublicCoreEnabled(env) &&
    isComunSolidarityOrganizationGovernanceEnabled(env)
  );
}

export function normalizeSolidarityOnboardingName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 3 && normalized.length <= 160
    ? normalized
    : null;
}

export function normalizeSolidarityOnboardingText(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minimum && normalized.length <= maximum
    ? normalized
    : null;
}

export function normalizeOptionalSolidarityOnboardingText(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "string" || !value.trim()) return null;
  return normalizeSolidarityOnboardingText(value, minimum, maximum);
}

export function parseSolidarityOnboardingOrganizationType(value: unknown) {
  return typeof value === "string" &&
    SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES.includes(
      value as SolidarityOnboardingOrganizationType,
    )
    ? (value as SolidarityOnboardingOrganizationType)
    : null;
}

export function solidarityOnboardingStateLabel(
  state: SolidarityOrganizationOnboardingState,
) {
  return {
    draft: "Rascunho salvo",
    submitted: "Aguardando verificação",
    needs_changes: "Ajustes pedidos",
    approved: "Organização incluída",
    rejected: "Pedido não aprovado",
    withdrawn: "Pedido retirado",
  }[state];
}

export function safeSolidarityOnboardingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("_NAME_INVALID"))
    return "Informe o nome da organização usando entre 3 e 160 caracteres.";
  if (message.includes("_DETAILS_INVALID") || message.includes("_INCOMPLETE"))
    return "Revise os campos obrigatórios e tente novamente.";
  if (message.includes("_ACTIVE_LIMIT") || message.includes("_RATE_LIMIT"))
    return "Você atingiu o limite temporário de pedidos. Retome um rascunho ou tente novamente mais tarde.";
  if (message.includes("_EXISTING_ORGANIZATION"))
    return "Esta organização já está no COMUN. Use a ficha existente para pedir um vínculo.";
  if (message.includes("_NOT_EDITABLE") || message.includes("_NOT_SUBMITTABLE"))
    return "Este pedido não pode ser alterado neste estado.";
  if (message.includes("_CONTENT_BLOCKED"))
    return "Revise o texto antes de continuar. Não inclua dados pessoais ou conteúdo de alto risco.";
  return "Não foi possível concluir esta ação agora. Nenhuma alteração parcial foi feita.";
}

export const COMUN_SOLIDARITY_ONBOARDING_RESOLVED =
  "COMUN_48_4_A4_ORGANIZATION_ONBOARDING_IMPLEMENTED" as const;

export const COMUN_SOLIDARITY_ONBOARDING_DEFERRED = {
  individualProducers:
    "COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE",
  privateConnection: "COMUN_48_4_A5_PRIVATE_CONNECTION_DEFERRED",
  legacyTerritorialContribution: "LEGACY_KEEP_COMPAT",
} as const;
