import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSafeGeoJson } from "./sidewalk-pilot-rules";

export type SidewalkRecordInput = {
  pauta_id: string;
  territory_id?: string | null;
  slug: string;
  name: string;
  geometry_geojson: { type: "Point" | "LineString"; coordinates: unknown };
  categories: string[];
  impact_level: string;
  affected_groups: string[];
  status?: string;
  verification_status?: string;
  visibility?: string;
  public_summary: string;
  private_notes?: string;
  methodology_version_id?: string | null;
  source_contribution_id?: string | null;
  source_observation_id?: string | null;
  public_location_level?: string;
  approximate_location?: string;
};

export async function createSidewalkRecord(client: SupabaseClient, input: SidewalkRecordInput) {
  const geo = validateSafeGeoJson(input.geometry_geojson);
  if (!geo.ok) throw new Error(`Geometria inválida: ${geo.error}`);
  const { data, error } = await client.from("comun_sidewalk_records" as never).insert({
    pauta_id: input.pauta_id,
    territory_id: input.territory_id ?? null,
    slug: input.slug,
    name: input.name,
    geometry_geojson: input.geometry_geojson,
    categories: input.categories,
    impact_level: input.impact_level,
    affected_groups: input.affected_groups,
    status: input.status ?? "pending",
    verification_status: input.verification_status ?? "unverified",
    visibility: input.visibility ?? "internal",
    public_summary: input.public_summary,
    private_notes: input.private_notes ?? null,
    methodology_version_id: input.methodology_version_id ?? null,
    source_contribution_id: input.source_contribution_id ?? null,
    source_observation_id: input.source_observation_id ?? null,
    public_location_level: input.public_location_level ?? "approximate",
    approximate_location: input.approximate_location ?? null,
  } as never).select("id, slug").single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

export async function listPublicSidewalkRecords(client: SupabaseClient, pautaId: string, filters?: Record<string, unknown>) {
  let query = client.from("comun_sidewalk_records" as never)
    .select("id, slug, name, geometry_geojson, categories, impact_level, affected_groups, status, verification_status, public_summary, public_location_level, approximate_location, territory_id, resolved_at" as never)
    .eq("pauta_id" as never, pautaId)
    .eq("visibility" as never, "public")
    .in("status" as never, ["verified", "published"]);
  if (filters?.impact_level) query = query.eq("impact_level" as never, filters.impact_level);
  if (filters?.category) query = query.contains("categories" as never, [filters.category]);
  if (filters?.verification_status) query = query.eq("verification_status" as never, filters.verification_status);
  if (filters?.territory_id) query = query.eq("territory_id" as never, filters.territory_id);
  const { data, error } = await query.order("created_at" as never, { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getPublicSidewalkRecord(client: SupabaseClient, pautaId: string, slug: string) {
  const { data, error } = await client.from("comun_sidewalk_records" as never)
    .select("id, slug, name, geometry_geojson, categories, impact_level, affected_groups, status, verification_status, public_summary, public_location_level, approximate_location, territory_id, resolved_at" as never)
    .eq("pauta_id" as never, pautaId)
    .eq("slug" as never, slug)
    .eq("visibility" as never, "public")
    .in("status" as never, ["verified", "published"])
    .single();
  if (error) throw error;
  return data as any;
}

export async function updateSidewalkRecordStatus(
  client: SupabaseClient,
  recordId: string,
  patch: { status?: string; verification_status?: string; visibility?: string; resolved_at?: string; resolved_result_id?: string | null }
) {
  const { error } = await client.from("comun_sidewalk_records" as never).update(patch as never).eq("id" as never, recordId);
  if (error) throw error;
}

export function sanitizeRecordForPublic(record: Record<string, unknown>): Record<string, unknown> {
  const { private_notes, source_contribution_id, source_observation_id, methodology_version_id, ...safe } = record;
  return safe;
}

export function computeSidewalkCoverage(records: any[]): { total: number; verified: number; highImpact: number; resolved: number; territories: number } {
  return {
    total: records.length,
    verified: records.filter((r) => r.verification_status === "verified").length,
    highImpact: records.filter((r) => r.impact_level === "high" || r.impact_level === "critical").length,
    resolved: records.filter((r) => r.status === "resolved" || r.resolved_at).length,
    territories: new Set(records.map((r) => r.territory_id).filter(Boolean)).size,
  };
}
