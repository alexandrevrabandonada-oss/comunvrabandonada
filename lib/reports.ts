import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AdminReport, PublicReport } from "@/lib/types";

async function fetchPublicReports(
  client: ReturnType<typeof createPublicSupabaseClient> | ReturnType<typeof createServiceSupabaseClient>,
  filters?: { communitySlug?: string; issueSlug?: string },
) {
  if (!client) return null;

  let query = client
    .from("comun_public_reports")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (filters?.communitySlug) query = query.eq("community_slug", filters.communitySlug);
  if (filters?.issueSlug) query = query.eq("issue_slug", filters.issueSlug);

  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as PublicReport[];
}

export async function listPublicReports(filters?: { communitySlug?: string; issueSlug?: string }) {
  const publicReports = await fetchPublicReports(createPublicSupabaseClient(), filters);
  if (publicReports) return publicReports;

  const serviceReports = await fetchPublicReports(createServiceSupabaseClient(), filters);
  return serviceReports ?? ([] as PublicReport[]);
}

export async function listAdminReports() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as AdminReport[];

  const { data } = await supabase
    .from("comun_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as AdminReport[];
}

export async function getAdminReport(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.from("comun_reports").select("*").eq("id", id).single();
  return data as AdminReport | null;
}
