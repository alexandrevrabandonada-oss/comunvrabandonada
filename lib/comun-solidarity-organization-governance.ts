export const COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_FLAG =
  "COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED" as const;

export const SOLIDARITY_ORGANIZATION_ACCESS_ROLES = [
  "facilitator",
  "editor",
] as const;
export const SOLIDARITY_ORGANIZATION_ACCESS_STATES = [
  "pending",
  "active",
  "rejected",
  "withdrawn",
  "revoked",
  "left",
] as const;
export const SOLIDARITY_ORGANIZATION_REVIEW_SCOPES = [
  "platform",
  "organization",
] as const;

export type SolidarityOrganizationAccessRole =
  (typeof SOLIDARITY_ORGANIZATION_ACCESS_ROLES)[number];
export type SolidarityOrganizationAccessState =
  (typeof SOLIDARITY_ORGANIZATION_ACCESS_STATES)[number];
export type SolidarityOrganizationReviewScope =
  (typeof SOLIDARITY_ORGANIZATION_REVIEW_SCOPES)[number];

export type PrivateSolidarityOrganizationAccessV1 = {
  accessId: string;
  organizationTerritoryId: string;
  organizationSlug: string;
  organizationName: string;
  requestedRole: SolidarityOrganizationAccessRole;
  role: SolidarityOrganizationAccessRole | null;
  state: SolidarityOrganizationAccessState;
  reviewScope: SolidarityOrganizationReviewScope;
  requestedAt: string;
  reviewedAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
  leftAt: string | null;
};

export type PrivateSolidarityOrganizationGovernanceRecordV1 = {
  accessId: string;
  memberLabel: string;
  requestNotePrivate: string;
  requestedRole: SolidarityOrganizationAccessRole;
  role: SolidarityOrganizationAccessRole | null;
  state: "pending" | "active";
  reviewScope: SolidarityOrganizationReviewScope;
  requestedAt: string;
  activatedAt: string | null;
};

export const SOLIDARITY_ORGANIZATION_GOVERNANCE_DEFERRED = {
  economicContentWrites:
    "COMUN_48_4_A3_AUTHORIZED_ORGANIZATION_WRITES_AVAILABLE",
  newOrganizationOnboarding:
    "COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED",
} as const;

export function isComunSolidarityOrganizationGovernanceEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_FLAG] === "enabled";
}

export function validateSolidarityOrganizationAccessNote(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 10 && normalized.length <= 600
    ? normalized
    : null;
}

export function solidarityOrganizationAccessStateLabel(
  state: SolidarityOrganizationAccessState,
) {
  return {
    pending: "Aguardando análise",
    active: "Acesso ativo",
    rejected: "Pedido não aprovado",
    withdrawn: "Pedido retirado",
    revoked: "Acesso revogado",
    left: "Você saiu da organização",
  }[state];
}

export function solidarityOrganizationAccessRoleLabel(
  role: SolidarityOrganizationAccessRole,
) {
  return role === "facilitator" ? "Facilitação" : "Edição";
}

export function safeSolidarityOrganizationAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("_COOLDOWN"))
    return "Aguarde um pouco antes de fazer um novo pedido para esta organização.";
  if (message.includes("_PENDING_LIMIT") || message.includes("_DAILY_LIMIT"))
    return "Você atingiu o limite temporário de pedidos. Tente novamente mais tarde.";
  if (message.includes("_ORGANIZATION_INELIGIBLE"))
    return "Esta organização não está disponível para pedido de acesso neste momento.";
  if (message.includes("_NOTE_INVALID"))
    return "Conte como você participa usando entre 10 e 600 caracteres.";
  return "Não foi possível concluir esta ação agora. Nenhuma alteração parcial foi feita.";
}
