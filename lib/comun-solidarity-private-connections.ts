import { isComunSolidarityEconomyPublicCoreEnabled } from "./comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "./comun-solidarity-organization-governance";

export const COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_FLAG =
  "COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED" as const;
export const COMUN_SOLIDARITY_CONTACT_CONSENT_VERSION =
  "comun.solidarity-contact-consent.v1" as const;
export const COMUN_SOLIDARITY_CONTACT_CONSENT_COPY =
  "Autorizo o COMUN a guardar este contato de forma privada e compartilhá-lo com pessoas com acesso ativo a esta organização somente se a organização aceitar esta conexão." as const;

export const SOLIDARITY_CONNECTION_STATES = [
  "pending",
  "contacted",
  "accepted",
  "rejected",
  "withdrawn",
  "archived",
] as const;
export type SolidarityConnectionState =
  (typeof SOLIDARITY_CONNECTION_STATES)[number];
export type SolidarityConnectionKind = "offer_interest" | "need_help";

export type PrivateSolidarityMemberConnectionV1 = {
  interestId: string;
  kind: SolidarityConnectionKind;
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  organizationSlug: string;
  organizationName: string;
  state: SolidarityConnectionState;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  acceptedAt: string | null;
  withdrawnAt: string | null;
};

export type PrivateSolidarityOrganizationConnectionV1 = {
  interestId: string;
  kind: SolidarityConnectionKind;
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  memberLabel: string;
  messagePrivate: string;
  contactPrivate: string | null;
  state: "pending" | "contacted" | "accepted";
  subjectIsPublic: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export type SolidarityConnectionActionState =
  | { state: "idle" }
  | { state: "error"; message: string; field?: "message" | "contact" | "consent" }
  | { state: "auth_required"; message: string; loginHref: string }
  | { state: "success"; href: string };

export const initialSolidarityConnectionActionState: SolidarityConnectionActionState = {
  state: "idle",
};

export function isComunSolidarityPrivateConnectionsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_FLAG] === "enabled" &&
    isComunSolidarityEconomyPublicCoreEnabled(env) &&
    isComunSolidarityOrganizationGovernanceEnabled(env)
  );
}

const MESSAGE_CONTACT_BYPASS = /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|(?:^|\s)@[a-z0-9_.-]{2,})/i;
const CONTACT_FORBIDDEN = /(?:\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|cpf|\brg\b|documento|senha|password|token|secret|chave privada|private key|endereço residencial|rua\s+.+\b(?:casa|apto|apartamento|n[ºo]?\.?\s*\d+))/i;

export function normalizeSolidarityConnectionMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (
    normalized.length < 10 ||
    normalized.length > 600 ||
    MESSAGE_CONTACT_BYPASS.test(normalized)
  )
    return null;
  return normalized;
}

export function normalizeSolidarityProtectedContact(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < 3 ||
    normalized.length > 200 ||
    CONTACT_FORBIDDEN.test(normalized)
  )
    return null;
  return normalized;
}

export function solidarityConnectionStateLabel(state: SolidarityConnectionState) {
  return {
    pending: "Aguardando resposta",
    contacted: "Contato iniciado anteriormente",
    accepted: "Conexão aceita",
    rejected: "A organização não seguiu com esta conexão",
    withdrawn: "Você retirou esta conexão",
    archived: "Conexão arquivada",
  }[state];
}

export function safeSolidarityConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("_MESSAGE_INVALID"))
    return "Escreva entre 10 e 600 caracteres. Coloque seu contato no campo protegido abaixo.";
  if (message.includes("_CONSENT_INVALID"))
    return "Informe um contato protegido e confirme a autorização para esta conexão.";
  if (message.includes("_COOLDOWN"))
    return "Aguarde 24 horas antes de tentar uma nova conexão com este item.";
  if (message.includes("_PENDING_LIMIT") || message.includes("_DAILY_LIMIT"))
    return "Você atingiu o limite temporário de conexões. Tente novamente mais tarde.";
  if (message.includes("_SUBJECT_UNAVAILABLE") || message.includes("_SUBJECT_ARCHIVED"))
    return "Este item não está disponível para uma nova conexão agora.";
  if (message.includes("_ORGANIZATION_INELIGIBLE"))
    return "Esta organização não está disponível para conexões agora.";
  if (message.includes("_FORBIDDEN") || message.includes("_MISMATCH"))
    return "Seu acesso não permite esta ação.";
  return "Não foi possível concluir esta ação agora. Nenhuma alteração parcial foi feita.";
}
