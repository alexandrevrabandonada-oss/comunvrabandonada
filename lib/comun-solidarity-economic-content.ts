import {
  isComunSolidarityEconomyPublicCoreEnabled,
  SOLIDARITY_NEED_TYPES,
  SOLIDARITY_OFFER_KINDS,
  SOLIDARITY_OFFER_MODALITIES,
} from "./comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "./comun-solidarity-organization-governance";

export const COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_FLAG =
  "COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED" as const;

export const SOLIDARITY_OFFER_OPERATIONS = [
  "edit",
  "pause",
  "resume",
  "renew",
  "archive",
] as const;
export const SOLIDARITY_NEED_OPERATIONS = [
  "edit",
  "partially_met",
  "met",
  "cancel",
  "reopen",
] as const;

export type SolidarityOfferOperation =
  (typeof SOLIDARITY_OFFER_OPERATIONS)[number];
export type SolidarityNeedOperation =
  (typeof SOLIDARITY_NEED_OPERATIONS)[number];

export function isComunSolidarityEconomicContentWritesEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_FLAG] === "enabled" &&
    isComunSolidarityEconomyPublicCoreEnabled(env) &&
    isComunSolidarityOrganizationGovernanceEnabled(env)
  );
}

export function deriveSolidarityEconomicSlug(value: string, fallback: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : fallback;
}

export function normalizeEconomicTitle(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 3 && normalized.length <= maximum
    ? normalized
    : null;
}

export function normalizeEconomicSummary(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\r\n/g, "\n");
  return normalized.length >= 10 && normalized.length <= 1_200
    ? normalized
    : null;
}

export function normalizeOptionalEconomicText(
  value: unknown,
  maximum: number,
) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

export function parseBRLAmountToCents(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : Number.NaN;
}

export function parseValidityDays(value: unknown, fallback = 30) {
  if (value == null || value === "") return fallback;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 180 ? days : null;
}

export function parseFutureDueAt(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(`${value.trim()}T23:59:59-03:00`);
  return Number.isFinite(timestamp) && timestamp > now.getTime()
    ? new Date(timestamp).toISOString()
    : undefined;
}

export function parseOfferModalities(formData: FormData) {
  return [...new Set(formData.getAll("modalities").map(String))].filter(
    (item): item is (typeof SOLIDARITY_OFFER_MODALITIES)[number] =>
      SOLIDARITY_OFFER_MODALITIES.includes(
        item as (typeof SOLIDARITY_OFFER_MODALITIES)[number],
      ),
  );
}

export function parseOfferKind(value: unknown) {
  return typeof value === "string" &&
    SOLIDARITY_OFFER_KINDS.includes(
      value as (typeof SOLIDARITY_OFFER_KINDS)[number],
    )
    ? (value as (typeof SOLIDARITY_OFFER_KINDS)[number])
    : "other";
}

export function parseNeedType(value: unknown) {
  return typeof value === "string" &&
    SOLIDARITY_NEED_TYPES.includes(
      value as (typeof SOLIDARITY_NEED_TYPES)[number],
    )
    ? (value as (typeof SOLIDARITY_NEED_TYPES)[number])
    : "other";
}

export type SolidarityEconomicActionState =
  | { state: "idle" }
  | { state: "error"; message: string; field?: string }
  | { state: "auth_required"; message: string; loginHref: string }
  | { state: "success"; href: string };

export const initialSolidarityEconomicActionState: SolidarityEconomicActionState =
  { state: "idle" };

export function safeSolidarityEconomicContentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("_RATE_LIMIT"))
    return "Muitas alterações foram feitas recentemente. Aguarde um pouco e tente de novo.";
  if (message.includes("_CONTENT_BLOCKED"))
    return "Este conteúdo não pode ser publicado aqui. Retire dados pessoais ou conteúdo restrito e tente novamente.";
  if (message.includes("_ACCESS_FORBIDDEN"))
    return "Seu acesso a esta organização não permite mais esta alteração.";
  if (message.includes("_ORGANIZATION_INELIGIBLE"))
    return "Esta organização não está elegível para publicar conteúdo agora.";
  if (message.includes("_NOT_FOUND"))
    return "Este conteúdo não está disponível para alteração nesta organização.";
  if (message.includes("_TRANSITION_INVALID"))
    return "Esta mudança de estado não está disponível agora.";
  return "Não foi possível salvar agora. Nenhuma alteração parcial foi feita.";
}
