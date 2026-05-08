import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { AdminReport, PublicReport } from "@/lib/types";

export async function listPublicReports(filters?: { communitySlug?: string; issueSlug?: string }) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [] as PublicReport[];

  let query = supabase
    .from("comun_public_reports")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (filters?.communitySlug) query = query.eq("community_slug", filters.communitySlug);
  if (filters?.issueSlug) query = query.eq("issue_slug", filters.issueSlug);

  const { data } = await query;
  return (data ?? []) as PublicReport[];
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
