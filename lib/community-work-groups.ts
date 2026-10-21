import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function listCommunityWorkGroups(slug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data, error } = await db
    .from("comun_community_work_groups")
    .select(
      "id,name,objective,cycle_label,next_action,result_expected,state,ends_at,memory_url,community:comun_communities!inner(slug),pauta:comun_pauta_spaces!inner(slug,title)",
    )
    .eq("community.slug", slug)
    .in("state", ["active", "completed"])
    .order("ends_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}
