import { createServiceSupabaseClient } from "./supabase/server";
import { sanitizeRecordForPublic, computeSidewalkCoverage } from "./sidewalk-records";

export async function listPublicSidewalkSurface(pautaId: string) {
  const db = createServiceSupabaseClient();
  if (!db) return { records: [], count: 0, coverage: { total: 0, verified: 0, highImpact: 0, resolved: 0, territories: 0 }, warning: null };
  const { data, error } = await db.from("comun_sidewalk_records" as never)
    .select("id, slug, name, geometry_geojson, categories, impact_level, affected_groups, status, verification_status, public_summary, public_location_level, approximate_location, territory_id, resolved_at" as never)
    .eq("pauta_id" as never, pautaId)
    .eq("visibility" as never, "public")
    .in("status" as never, ["verified", "published"]);
  if (error) throw error;
  const records = ((data ?? []) as any[]).map((r: any) => sanitizeRecordForPublic(r));
  const coverage = computeSidewalkCoverage(records);
  const warning = coverage.total < 3 ? `Cobertura insuficiente: ${coverage.total} de 3 registros.` : null;
  return { records, count: records.length, coverage, warning };
}

export async function listPublicSidewalkMemories(pautaId: string) {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data, error } = await db.from("comun_sidewalk_cycle_memories" as never)
    .select("id, slug, title, public_summary" as never)
    .eq("pauta_id" as never, pautaId)
    .eq("status" as never, "published")
    .eq("visibility" as never, "public")
    .order("published_at" as never, { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getPublicSidewalkMemoryDetail(pautaSlug: string, memorySlug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: space, error: spaceError } = await db.from("comun_pauta_spaces" as never).select("id" as never).eq("slug" as never, pautaSlug).eq("visibility" as never, "public").single();
  if (spaceError || !space) return null;
  const { data, error } = await db.from("comun_sidewalk_cycle_memories" as never)
    .select("id, slug, title, public_summary, methodology_snapshot" as never)
    .eq("pauta_id" as never, (space as any).id)
    .eq("slug" as never, memorySlug)
    .eq("status" as never, "published")
    .eq("visibility" as never, "public")
    .single();
  if (error || !data) return null;
  return data as any;
}

export async function getPublicSidewalkRecordDetail(pautaSlug: string, recordSlug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: space, error: spaceError } = await db.from("comun_pauta_spaces" as never).select("id" as never).eq("slug" as never, pautaSlug).eq("visibility" as never, "public").single();
  if (spaceError || !space) return null;
  const pautaId = (space as any).id;
  const { data, error } = await db.from("comun_sidewalk_records" as never)
    .select("id, slug, name, geometry_geojson, categories, impact_level, affected_groups, status, verification_status, public_summary, public_location_level, approximate_location, territory_id, resolved_at, methodology_version_id" as never)
    .eq("pauta_id" as never, pautaId)
    .eq("slug" as never, recordSlug)
    .eq("visibility" as never, "public")
    .in("status" as never, ["verified", "published"])
    .single();
  if (error || !data) return null;
  const record = sanitizeRecordForPublic(data as any) as any;
  const { data: photos } = await db.from("comun_sidewalk_record_photos" as never)
    .select("id, is_public, public_alt_text, derivative_asset_id, archive_item_id" as never)
    .eq("record_id" as never, record.id)
    .eq("is_public" as never, true)
    .eq("review_status" as never, "approved");
  const photoIds = ((photos ?? []) as any[]).map((p) => p.derivative_asset_id).filter(Boolean);
  let publicPhotoUrl: string | null = null;
  if (photoIds.length) {
    const { data: asset } = await db.from("comun_archive_assets" as never).select("public_url" as never).eq("id" as never, photoIds[0]).single();
    publicPhotoUrl = (asset as any)?.public_url ?? null;
  }
  const { data: actions } = await db.from("comun_mobilization_actions" as never)
    .select("id, slug, title, status, objective_public" as never)
    .eq("sidewalk_record_id" as never, record.id)
    .eq("visibility" as never, "public")
    .in("status" as never, ["confirmed", "in_progress", "completed"]);
  const { data: results } = await db.from("comun_hub_results" as never)
    .select("id, slug, title, result_type, public_summary, verification_status" as never)
    .eq("sidewalk_record_id" as never, record.id)
    .eq("visibility" as never, "public");
  return { record, publicPhotoUrl, actions: (actions ?? []) as any[], results: (results ?? []) as any[] };
}
