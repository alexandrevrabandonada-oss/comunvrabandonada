import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sanitizeRecordForPublic } from "@/lib/sidewalk-records";
import type { PublicSidewalkRecord } from "@/lib/sidewalk-map-config";

const publicFields = "id,slug,name,public_geometry_geojson,categories,condition,forwarding_status,verification_status,public_summary,approximate_location,neighborhood,last_observed_at,resolved_at,status,visibility";

export async function getSidewalkMiniapp() {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: pauta } = await db.from("comun_pauta_spaces")
    .select("id,slug,title,summary,territory_id,community,public_status,next_step")
    .eq("slug", "calcadas-em-circulacao").eq("visibility", "public").maybeSingle();
  if (!pauta) return null;
  const [records, priorities, actions, results, memories, config] = await Promise.all([
    db.from("comun_sidewalk_records").select(publicFields).eq("pauta_id", pauta.id).eq("visibility", "public").in("status", ["verified", "published"]).order("last_observed_at", { ascending: false }).limit(100),
    db.from("comun_sidewalk_priorities").select("id,decision_public,criteria_public,evidence_summary_public,limitations_public,status,record_id,created_at").eq("pauta_id", pauta.id).eq("status", "approved").order("decided_at", { ascending: false }).limit(20),
    db.from("comun_mobilization_actions").select("id,slug,title,status,objective_public,starts_at").eq("pauta_id", pauta.id).eq("visibility", "public").limit(20),
    db.from("comun_hub_results").select("id,slug,title,result_type,public_summary,verification_status,occurred_at").eq("pauta_id", pauta.id).eq("visibility", "public").limit(20),
    db.from("comun_sidewalk_cycle_memories").select("id,slug,title,public_summary,published_at").eq("pauta_id", pauta.id).eq("status", "published").eq("visibility", "public").limit(20),
    db.from("comun_sidewalk_municipal_configs").select("slug,name,center_longitude,center_latitude,default_zoom,neighborhoods,methodology_public,coverage_status").eq("slug", "volta-redonda").eq("is_active", true).maybeSingle(),
  ]);
  const ids=(records.data??[]).map((row:any)=>row.id);const {data:photos}=ids.length?await db.from("comun_sidewalk_record_photos").select("record_id,comun_archive_assets!comun_sidewalk_record_photos_derivative_asset_id_fkey(public_url)").in("record_id",ids).eq("is_public",true).eq("review_status","approved"):{data:[]};const urls=new Map((photos??[]).map((photo:any)=>[photo.record_id,(Array.isArray(photo.comun_archive_assets)?photo.comun_archive_assets[0]:photo.comun_archive_assets)?.public_url??null]));
  const safeRecords = ((records.data ?? []) as any[]).map((row) => ({...sanitizeRecordForPublic(row),public_photo_url:urls.get(row.id)??null}) as PublicSidewalkRecord);
  return { pauta, records: safeRecords, priorities: priorities.data ?? [], actions: actions.data ?? [], results: results.data ?? [], memories: memories.data ?? [], config: config.data };
}

export async function getSidewalkMiniappRecord(slug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: record } = await db.from("comun_sidewalk_records").select(publicFields).eq("slug", slug).eq("visibility", "public").in("status", ["verified", "published"]).maybeSingle();
  if (!record) return null;
  const [links, observations] = await Promise.all([
    db.from("comun_sidewalk_record_links").select("target_type,target_id,public_note,created_at").eq("record_id", record.id),
    db.from("comun_sidewalk_observations").select("observation_type,created_at").eq("record_id", record.id).eq("status", "approved").order("created_at"),
  ]);
  return { record: sanitizeRecordForPublic(record) as PublicSidewalkRecord, links: links.data ?? [], observations: observations.data ?? [] };
}
