import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type ProtocolLookupResultType =
  | "invalid_format"
  | "not_found"
  | "found_received"
  | "found_under_review"
  | "found_published"
  | "found_archived"
  | "rate_limited";

type RateLimitInput = {
  protocol: string;
  route: string;
  resultType?: ProtocolLookupResultType;
  metadata?: Record<string, unknown>;
};

type RateLimitDecision = {
  allowed: boolean;
  ip_hash: string | null;
  user_agent_hash: string | null;
  protocol_hash: string | null;
  reason: "ok" | "route" | "protocol" | "invalid_format";
};

const WINDOW_MINUTES = 10;

function getLimits() {
  if (process.env.COMUN_LOOKUP_LIMIT_TEST_MODE === "1") {
    return {
      route: 50,
      protocolByIp: 3,
      invalidByIp: 2,
    };
  }

  return {
    route: 20,
    protocolByIp: 5,
    invalidByIp: 10,
  };
}

function hashSalt() {
  return (
    process.env.COMUN_LOOKUP_HASH_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "comun-local-lookup-salt"
  );
}

export function hashLookupValue(value: string | null | undefined) {
  const cleanValue = value?.trim();
  if (!cleanValue) return null;

  return createHash("sha256").update(`${hashSalt()}:${cleanValue}`).digest("hex");
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

export async function getClientFingerprint() {
  const headerStore = await headers();
  const ip =
    firstForwardedIp(headerStore.get("x-forwarded-for")) ||
    headerStore.get("x-real-ip") ||
    headerStore.get("cf-connecting-ip") ||
    "unknown";
  const userAgent = headerStore.get("user-agent") || "unknown";

  return {
    ip_hash: hashLookupValue(ip),
    user_agent_hash: hashLookupValue(userAgent),
  };
}

function windowStartIso() {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

async function countEvents(filters: {
  ip_hash?: string | null;
  protocol_hash?: string | null;
  route?: string;
  result_type?: ProtocolLookupResultType;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return 0;

  let query = supabase
    .from("comun_public_lookup_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", windowStartIso());

  if (filters.ip_hash) query = query.eq("ip_hash", filters.ip_hash);
  if (filters.protocol_hash) query = query.eq("protocol_hash", filters.protocol_hash);
  if (filters.route) query = query.eq("route", filters.route);
  if (filters.result_type) query = query.eq("result_type", filters.result_type);

  const { count } = await query;
  return count ?? 0;
}

export async function logProtocolLookupEvent(input: RateLimitInput) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  const fingerprint = await getClientFingerprint();
  const normalizedProtocol = input.protocol.trim().toUpperCase();

  await supabase.from("comun_public_lookup_events").insert({
    lookup_type: "protocol",
    protocol_hash: hashLookupValue(normalizedProtocol),
    normalized_protocol: normalizedProtocol || null,
    result_type: input.resultType ?? "not_found",
    ip_hash: fingerprint.ip_hash,
    user_agent_hash: fingerprint.user_agent_hash,
    route: input.route,
    metadata: sanitizeLookupMetadata(input.metadata),
  });
}

export async function checkProtocolLookupRateLimit(input: RateLimitInput): Promise<RateLimitDecision> {
  const limits = getLimits();
  const fingerprint = await getClientFingerprint();
  const protocolHash = hashLookupValue(input.protocol.trim().toUpperCase());

  if (!fingerprint.ip_hash) {
    return { allowed: true, ...fingerprint, protocol_hash: protocolHash, reason: "ok" };
  }

  const routeCount = await countEvents({ ip_hash: fingerprint.ip_hash, route: input.route });
  if (routeCount >= limits.route) {
    await logProtocolLookupEvent({ ...input, resultType: "rate_limited", metadata: { reason: "route" } });
    return { allowed: false, ...fingerprint, protocol_hash: protocolHash, reason: "route" };
  }

  if (input.resultType === "invalid_format") {
    const invalidCount = await countEvents({ ip_hash: fingerprint.ip_hash, result_type: "invalid_format" });
    if (invalidCount >= limits.invalidByIp) {
      await logProtocolLookupEvent({ ...input, resultType: "rate_limited", metadata: { reason: "invalid_format" } });
      return { allowed: false, ...fingerprint, protocol_hash: protocolHash, reason: "invalid_format" };
    }
  }

  if (protocolHash) {
    const protocolCount = await countEvents({
      ip_hash: fingerprint.ip_hash,
      protocol_hash: protocolHash,
      route: input.route,
    });
    if (protocolCount >= limits.protocolByIp) {
      await logProtocolLookupEvent({ ...input, resultType: "rate_limited", metadata: { reason: "protocol" } });
      return { allowed: false, ...fingerprint, protocol_hash: protocolHash, reason: "protocol" };
    }
  }

  return { allowed: true, ...fingerprint, protocol_hash: protocolHash, reason: "ok" };
}

function sanitizeLookupMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return {};

  const allowedKeys = new Set(["reason", "status", "smoke_id"]);
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => allowedKeys.has(key)));
}

export type PublicLookupEvent = {
  id: string;
  normalized_protocol: string | null;
  result_type: ProtocolLookupResultType;
  route: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getProtocolLookupObservability() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return {
      totals: { total: 0, invalid: 0, notFound: 0, found: 0, rateLimited: 0 },
      events: [] as PublicLookupEvent[],
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("comun_public_lookup_events")
    .select("id, normalized_protocol, result_type, route, metadata, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (data ?? []) as PublicLookupEvent[];
  const totals = {
    total: events.length,
    invalid: events.filter((event) => event.result_type === "invalid_format").length,
    notFound: events.filter((event) => event.result_type === "not_found").length,
    found: events.filter((event) => event.result_type.startsWith("found_")).length,
    rateLimited: events.filter((event) => event.result_type === "rate_limited").length,
  };

  return { totals, events };
}
