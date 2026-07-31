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
  ]);
  if (documents.error) return empty;
  const oldestDate = oldest.data?.created_at
    ? new Date(oldest.data.created_at).getTime()
    : null;
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
  };
}
