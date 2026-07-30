import { performance } from "node:perf_hooks";
import { isPublicContentDeliverable } from "@/lib/public-content-readiness";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function getCentralExperience() {
  const started = performance.now();
  const db = createServiceSupabaseClient();
  if (!db)
    return {
      rounds: [],
      artworks: [],
      episodes: [],
      memory: [],
      durationMs: 0,
    };

  const [
    { data: rounds },
    { data: artworks },
    { data: episodes },
    { data: memory },
  ] = await Promise.all([
    db
      .from("comun_construction_circles")
      .select(
        "id,title,public_question,status,pauta:comun_pauta_spaces(slug,title,visibility)",
      )
      .in("status", ["open", "synthesizing"])
      .limit(4),
    db
      .from("comun_archive_artworks")
      .select(
        "archive_item_id,title_public,description_public,territory_id,archive:comun_archive_items(slug,title,summary,description,status,visibility,published_at),credits:comun_archive_artwork_credits(public_credit,credit_role)",
      )
      .eq("publication_status", "published")
      .limit(12),
    db
      .from("comun_radio_episodes")
      .select(
        "archive_item_id,title_public,slug_public,summary_public,published_at",
      )
      .eq("publication_status", "published")
      .order("published_at", { ascending: false })
      .limit(12),
    db
      .from("comun_archive_items")
      .select(
        "id,slug,title,summary,description,item_type,status,visibility,published_at,updated_at",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  return {
    rounds: (rounds ?? []).filter(
      (item: any) => item.pauta?.visibility === "public",
    ),
    artworks: (artworks ?? [])
      .filter((item: any) => {
        const archive = Array.isArray(item.archive)
          ? item.archive[0]
          : item.archive;
        return (
          archive?.visibility === "public" &&
          isPublicContentDeliverable({
            ...archive,
            title: item.title_public ?? archive.title,
            summary: item.description_public ?? archive.summary,
          })
        );
      })
      .slice(0, 3),
    episodes: (episodes ?? [])
      .filter((item: any) =>
        isPublicContentDeliverable({
          slug: item.slug_public,
          title: item.title_public,
          summary: item.summary_public,
          published_at: item.published_at,
        }),
      )
      .slice(0, 3),
    memory: (memory ?? []).filter(isPublicContentDeliverable).slice(0, 4),
    durationMs: Math.round(performance.now() - started),
  };
}

export async function getPautaContinuity(pautaId: string) {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data } = await db
    .from("comun_pauta_timeline_events")
    .select(
      "id,event_type,title,public_summary,occurred_at,evidence_id,action_id,protocol_id,result_id",
    )
    .eq("pauta_id", pautaId)
    .eq("visibility", "public")
    .order("occurred_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getTerritoryExperience(territoryId: string) {
  const db = createServiceSupabaseClient();
  if (!db)
    return {
      observatories: [],
      artworks: [],
      episodes: [],
      results: [],
      memory: [],
    };

  const [
    { data: observatories },
    { data: artworks },
    { data: episodes },
    { data: results },
    { data: memory },
  ] = await Promise.all([
    db
      .from("comun_observatories")
      .select("slug,title,public_summary,status")
      .eq("territory_id", territoryId)
      .eq("visibility", "public")
      .limit(4),
    db
      .from("comun_archive_artworks")
      .select(
        "title_public,description_public,archive:comun_archive_items!inner(slug,title,summary,description,status,visibility,published_at)",
      )
      .eq("territory_id", territoryId)
      .eq("publication_status", "published")
      .limit(12),
    db
      .from("comun_radio_episodes")
      .select("slug_public,title_public,summary_public,published_at")
      .eq("territory_id", territoryId)
      .eq("publication_status", "published")
      .limit(12),
    db
      .from("comun_hub_results")
      .select("slug,title,public_summary,result_type")
      .eq("territory_id", territoryId)
      .eq("visibility", "public")
      .limit(4),
    db
      .from("comun_hub_archive_links")
      .select(
        "relation_type,public_note,archive:comun_archive_items(slug,title,summary,description,status,visibility,published_at)",
      )
      .eq("territory_id", territoryId)
      .limit(20),
  ]);

  return {
    observatories: observatories ?? [],
    artworks: (artworks ?? [])
      .filter((item: any) => {
        const archive = Array.isArray(item.archive)
          ? item.archive[0]
          : item.archive;
        return (
          archive?.visibility === "public" &&
          isPublicContentDeliverable({
            ...archive,
            title: item.title_public ?? archive.title,
            summary: item.description_public ?? archive.summary,
          })
        );
      })
      .slice(0, 4),
    episodes: (episodes ?? [])
      .filter((item: any) =>
        isPublicContentDeliverable({
          slug: item.slug_public,
          title: item.title_public,
          summary: item.summary_public,
          published_at: item.published_at,
        }),
      )
      .slice(0, 4),
    results: results ?? [],
    memory: (memory ?? [])
      .filter((item: any) => {
        const archive = Array.isArray(item.archive)
          ? item.archive[0]
          : item.archive;
        return (
          archive?.visibility === "public" &&
          isPublicContentDeliverable(archive)
        );
      })
      .slice(0, 6),
  };
}
