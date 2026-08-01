import { safeCommunityReturn } from "@/lib/community-return";

export const COMUN_JOURNEY_INTENTS = [
  "contribute_pauta",
  "register_sidewalk",
  "send_report",
  "institutional_response",
  "join_community",
  "take_task",
  "join_action",
  "follow_pauta",
  "send_archive_item",
  "send_radio_audio",
  "send_artwork",
  "request_correction",
  "request_withdrawal",
  "privacy_report",
] as const;

export const COMUN_JOURNEY_STAGES = [
  "discover",
  "understand",
  "participate",
  "confirm",
  "track",
  "response",
  "result",
  "memory",
] as const;

export type ComunJourneyIntent = (typeof COMUN_JOURNEY_INTENTS)[number];
export type ComunJourneyStage = (typeof COMUN_JOURNEY_STAGES)[number];

export type ComunJourneyContext = {
  intent?: ComunJourneyIntent;
  sourceRoute?: string;
  returnTo?: string;
  pautaSlug?: string;
  communitySlug?: string;
  territorySlug?: string;
  currentStage?: ComunJourneyStage;
  trackingRoute?: string;
  expiresAt?: number;
};

type JourneySearch =
  URLSearchParams | Record<string, string | string[] | null | undefined>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 96;
const DEFAULT_TTL_SECONDS = 2 * 60 * 60;
const MAX_TTL_SECONDS = 24 * 60 * 60;
const JOURNEY_QUERY_KEYS = [
  "intencao",
  "origem",
  "returnTo",
  "pauta",
  "comunidade",
  "territorio",
  "etapa",
  "acompanhar",
  "contextoAte",
] as const;

function first(search: JourneySearch, key: string): string | undefined {
  if (search instanceof URLSearchParams) return search.get(key) ?? undefined;
  const value = search[key];
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

function safeRoute(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const safe = safeCommunityReturn(value, "");
  return safe || undefined;
}

function safeSlug(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const slug = value.trim().toLowerCase();
  return slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug)
    ? slug
    : undefined;
}

export function parseComunJourneyContext(
  search: JourneySearch,
  now = Date.now(),
): ComunJourneyContext {
  const expiresAt = Number(first(search, "contextoAte"));
  if (
    Number.isFinite(expiresAt) &&
    (expiresAt < Math.floor(now / 1000) ||
      expiresAt > Math.floor(now / 1000) + MAX_TTL_SECONDS)
  )
    return {};

  const intentCandidate = first(search, "intencao");
  const stageCandidate = first(search, "etapa");
  const intent = COMUN_JOURNEY_INTENTS.includes(
    intentCandidate as ComunJourneyIntent,
  )
    ? (intentCandidate as ComunJourneyIntent)
    : undefined;
  const currentStage = COMUN_JOURNEY_STAGES.includes(
    stageCandidate as ComunJourneyStage,
  )
    ? (stageCandidate as ComunJourneyStage)
    : undefined;

  return {
    intent,
    sourceRoute: safeRoute(first(search, "origem")),
    returnTo: safeRoute(first(search, "returnTo")),
    pautaSlug: safeSlug(first(search, "pauta")),
    communitySlug: safeSlug(first(search, "comunidade")),
    territorySlug: safeSlug(first(search, "territorio")),
    currentStage,
    trackingRoute: safeRoute(first(search, "acompanhar")),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
  };
}

export function withComunJourneyContext(
  href: string,
  context: ComunJourneyContext,
  now = Date.now(),
): string {
  const safeHref = safeRoute(href);
  if (!safeHref) return "/comun";
  const url = new URL(safeHref, "http://comun.local");
  for (const key of JOURNEY_QUERY_KEYS) url.searchParams.delete(key);
  const safeContext = parseComunJourneyContext(
    new URLSearchParams({
      ...(context.intent ? { intencao: context.intent } : {}),
      ...(context.sourceRoute ? { origem: context.sourceRoute } : {}),
      ...(context.returnTo ? { returnTo: context.returnTo } : {}),
      ...(context.pautaSlug ? { pauta: context.pautaSlug } : {}),
      ...(context.communitySlug ? { comunidade: context.communitySlug } : {}),
      ...(context.territorySlug ? { territorio: context.territorySlug } : {}),
      ...(context.currentStage ? { etapa: context.currentStage } : {}),
      ...(context.trackingRoute ? { acompanhar: context.trackingRoute } : {}),
      contextoAte: String(
        context.expiresAt ?? Math.floor(now / 1000) + DEFAULT_TTL_SECONDS,
      ),
    }),
    now,
  );

  const values: Array<[string, string | number | undefined]> = [
    ["intencao", safeContext.intent],
    ["origem", safeContext.sourceRoute],
    ["returnTo", safeContext.returnTo],
    ["pauta", safeContext.pautaSlug],
    ["comunidade", safeContext.communitySlug],
    ["territorio", safeContext.territorySlug],
    ["etapa", safeContext.currentStage],
    ["acompanhar", safeContext.trackingRoute],
    ["contextoAte", safeContext.expiresAt],
  ];
  for (const [key, value] of values) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveComunJourneyReturn(
  context: ComunJourneyContext,
  canonicalEntityRoute: string,
  rootFallback = "/comun/explorar",
): string {
  return (
    safeRoute(context.sourceRoute) ??
    safeRoute(context.returnTo) ??
    safeRoute(canonicalEntityRoute) ??
    safeRoute(rootFallback) ??
    "/comun/explorar"
  );
}
