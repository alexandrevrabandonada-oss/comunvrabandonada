import { isComunSolidarityEconomyPublicCoreEnabled } from "./comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "./comun-solidarity-organization-governance";

export const COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_FLAG =
  "COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED" as const;

export type SolidarityOrganizationProfileActionState =
  | { state: "idle" }
  | { state: "success"; message: string; href: string }
  | { state: "auth_required"; message: string; loginHref: string }
  | {
      state: "error";
      message: string;
      field?:
        | "presentation_public"
        | "services_public"
        | "service_territory_public"
        | "public_contact_authorized";
    };

export const initialSolidarityOrganizationProfileActionState = {
  state: "idle",
} satisfies SolidarityOrganizationProfileActionState;

export function isComunSolidarityOrganizationProfileSelfEditEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_FLAG] === "enabled" &&
    isComunSolidarityEconomyPublicCoreEnabled(env) &&
    isComunSolidarityOrganizationGovernanceEnabled(env)
  );
}

export function normalizeSolidarityOrganizationPresentation(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (!normalized) return null;
  return normalized.length >= 10 && normalized.length <= 1_200
    ? normalized
    : undefined;
}

export function normalizeSolidarityOrganizationServices(value: unknown) {
  if (typeof value !== "string") return undefined;
  const result: string[] = [];
  const keys = new Set<string>();
  let totalLength = 0;
  for (const line of value.split(/\r?\n/)) {
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("pt-BR");
    if (keys.has(key)) continue;
    if (normalized.length < 2 || normalized.length > 80) return undefined;
    keys.add(key);
    result.push(normalized);
    totalLength += normalized.length;
  }
  return result.length <= 12 && totalLength <= 600 ? result : undefined;
}

export function normalizeSolidarityOrganizationServiceTerritory(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.length <= 300 ? normalized : undefined;
}

const PUBLIC_CONTACT_FORBIDDEN =
  /(?:\b(?:cpf|rg|documento|senha|password|token|secret)\b|chave\s+privada|private\s+key|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|endere[cç]o\s+residencial|rua\s+.+\b(?:casa|apto|apartamento|n[ºo]?\.?\s*\d+)|localhost|127\.0\.0\.1|[?&](?:token|key|secret|password)=|bearer\s+[a-z0-9._~-]+|eyJ[a-zA-Z0-9_-]{12,}\.)/i;

export function normalizeSolidarityOrganizationPublicContact(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > 200 || PUBLIC_CONTACT_FORBIDDEN.test(normalized))
    return undefined;
  return normalized;
}

export function solidarityOrganizationPublicContactNeedsConfirmation(
  currentValue: string | null,
  nextValue: string | null,
) {
  return nextValue !== null && nextValue !== currentValue;
}

export function safeSolidarityOrganizationProfileError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("_CONFLICT"))
    return "Este perfil foi atualizado por outra pessoa. Recarregue as informações antes de salvar novamente.";
  if (message.includes("_RATE_LIMIT"))
    return "Muitas alterações em pouco tempo. Tente novamente mais tarde.";
  if (message.includes("_PUBLIC_CONTACT_CONFIRMATION_REQUIRED"))
    return "Confirme que o novo contato pode ser exibido publicamente.";
  if (message.includes("_PUBLIC_CONTACT_BLOCKED"))
    return "Revise o contato público. Não envie CPF, documento, senha, segredo ou endereço residencial.";
  if (message.includes("_PUBLIC_CONTENT_BLOCKED"))
    return "Revise os campos públicos. Use o campo de contato para telefone ou e-mail e não envie dados pessoais.";
  if (message.includes("_SERVICES_INVALID") || message.includes("_FIELDS_INVALID"))
    return "Revise os limites dos campos antes de salvar.";
  if (message.includes("_ACCESS_FORBIDDEN") || message.includes("_ORGANIZATION_INELIGIBLE"))
    return "Seu acesso não permite editar este perfil neste momento.";
  return "Não foi possível salvar agora. Nenhuma alteração parcial foi feita.";
}
