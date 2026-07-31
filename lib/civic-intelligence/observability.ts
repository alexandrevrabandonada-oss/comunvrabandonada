import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type CivicSearchObservability = {
  available: boolean;
  documents: number;
  sections: number;
  readySections: number;
  pendingJobs: number;
  failedJobs: number;
  oldestPendingMinutes: number | null;
  lastSyncAt: string | null;
  model: string;
  queryPrivacy: "aggregate_only";
  staleSections: number;
  coverageByDomain: Record<string, number>;
  searches24h: number;
  zeroResults24h: number;
  fallbacks24h: number;
  timeouts24h: number;
};

export async function getCivicSearchObservability(): Promise<CivicSearchObservability> {
  const empty: CivicSearchObservability = {
    available: false,
    documents: 0,
    sections: 0,
    readySections: 0,
    pendingJobs: 0,
    failedJobs: 0,
    oldestPendingMinutes: null,
    lastSyncAt: null,
    model: "not_verified",
    queryPrivacy: "aggregate_only",
    staleSections: 0,
    coverageByDomain: {},
    searches24h: 0,
    zeroResults24h: 0,
    fallbacks24h: 0,
    timeouts24h: 0,
  };
  const supabase = createServiceSupabaseClient();
  if (!supabase) return empty;
  const [
    documents,
    sections,
    readySections,
    pendingJobs,
    failedJobs,
    oldest,
    model,
    coverage,
    metrics,
  ] = await Promise.all([
    supabase
      .from("comun_search_documents")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("comun_search_sections")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("comun_search_sections")
      .select("id", { count: "exact", head: true })
      .eq("indexing_state", "ready"),
    supabase
      .from("comun_search_embedding_jobs")
      .select("id", { count: "exact", head: true })
      .in("state", ["pending", "processing"]),
    supabase
      .from("comun_search_embedding_jobs")
      .select("id", { count: "exact", head: true })
      .eq("state", "failed"),
    supabase
      .from("comun_search_embedding_jobs")
      .select("created_at")
      .in("state", ["pending", "processing"])
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("comun_search_documents")
      .select("last_synced_at,embedding_model")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("comun_search_documents")
      .select("domain,indexing_state")
      .limit(2000),
    supabase
      .from("comun_search_metrics_hourly")
      .select("outcome,total")
      .gte("bucket", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (documents.error) return empty;
  const oldestDate = oldest.data?.created_at
    ? new Date(oldest.data.created_at).getTime()
    : null;
  const coverageByDomain = (coverage.data ?? []).reduce<Record<string, number>>(
    (result, row) => {
      const domain = String(row.domain);
      result[domain] = (result[domain] ?? 0) + 1;
      return result;
    },
    {},
  );
  const metricTotal = (outcome: string) =>
    (metrics.data ?? [])
      .filter((row) => row.outcome === outcome)
      .reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  return {
    available: true,
    documents: documents.count ?? 0,
    sections: sections.count ?? 0,
    readySections: readySections.count ?? 0,
    pendingJobs: pendingJobs.count ?? 0,
    failedJobs: failedJobs.count ?? 0,
    oldestPendingMinutes: oldestDate
      ? Math.max(0, Math.round((Date.now() - oldestDate) / 60_000))
      : null,
    lastSyncAt: model.data?.last_synced_at ?? null,
    model: model.data?.embedding_model ?? "lexical_only",
    queryPrivacy: "aggregate_only",
    staleSections: (coverage.data ?? []).filter(
      (row) => row.indexing_state === "stale",
    ).length,
    coverageByDomain,
    searches24h: (metrics.data ?? []).reduce(
      (sum, row) => sum + Number(row.total ?? 0),
      0,
    ),
    zeroResults24h: metricTotal("zero_results"),
    fallbacks24h: metricTotal("fallback"),
    timeouts24h: metricTotal("timeout"),
  };
}

export async function recordCivicSearchMetric(input: {
  searchKind: "lexical" | "hybrid" | "intent";
  outcome: "results" | "zero_results" | "fallback" | "timeout" | "error";
  queryLength: number;
  durationMs: number;
  confidenceBand?: "none" | "low" | "medium" | "high";
  modelVersion?: string;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;
  const querySizeBand =
    input.queryLength <= 20
      ? "short"
      : input.queryLength <= 60
        ? "medium"
        : "long";
  const latencyBand =
    input.durationMs < 100
      ? "under_100ms"
      : input.durationMs < 300
        ? "100_300ms"
        : input.durationMs < 1000
          ? "300_1000ms"
          : "over_1000ms";
  await supabase.rpc("comun_record_search_metric", {
    p_search_kind: input.searchKind,
    p_outcome: input.outcome,
    p_query_size_band: querySizeBand,
    p_latency_band: latencyBand,
    p_confidence_band: input.confidenceBand ?? "none",
    p_model_version: (input.modelVersion ?? "lexical").slice(0, 80),
  });
}
