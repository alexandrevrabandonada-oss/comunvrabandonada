import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSidewalkObservatory(db: SupabaseClient) {
  const { data, error } = await db.from("comun_observatories" as never)
    .select("id, methodology_version_id" as never)
    .eq("slug" as never, "calcadas-em-circulacao")
    .single();
  if (error) throw error;
  return data as unknown as { id: string; methodology_version_id: string };
}

export async function getSidewalkMetricDefinitions(db: SupabaseClient, observatoryId: string) {
  const { data, error } = await db.from("comun_metric_definitions" as never)
    .select("id, slug" as never)
    .eq("observatory_id" as never, observatoryId);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; slug: string }[]);
}

export function computeSidewalkMetrics(records: any[], metricSlugMap: Record<string, string>) {
  const total = records.length;
  const verified = records.filter((r) => r.verification_status === "verified").length;
  const highImpact = records.filter((r) => r.impact_level === "high" || r.impact_level === "critical").length;
  const barriers = records.filter((r) =>
    Array.isArray(r.categories) && r.categories.some((c: string) => ["ausencia_rampa", "rampa_inadequada", "piso_liso", "obstaculo", "passeio_interrompido"].includes(c))
  ).length;
  const territories = new Set(records.map((r) => r.territory_id).filter(Boolean)).size;
  const resolved = records.filter((r) => r.status === "resolved" || r.resolved_at).length;
  return {
    [metricSlugMap["total-publicado"]]: { numeric: total, sample: total },
    [metricSlugMap["total-verificado"]]: { numeric: verified, sample: total },
    [metricSlugMap["impacto-alto"]]: { numeric: highImpact, sample: total },
    [metricSlugMap["barreiras-acessibilidade"]]: { numeric: barriers, sample: total },
    [metricSlugMap["territorios-cobertos"]]: { numeric: territories, sample: total },
    [metricSlugMap["resolvidos"]]: { numeric: resolved, sample: total },
  };
}

export async function upsertSidewalkSnapshot(
  db: SupabaseClient,
  inputs: {
    observatoryId: string;
    methodologyVersionId: string;
    periodStart: string;
    periodEnd: string;
    territoryId?: string | null;
    metricResults: Record<string, { numeric: number; sample: number }>;
    limitationsPublic?: string;
  }
) {
  const results: { metricDefinitionId: string; snapshotId: string | null }[] = [];
  for (const [metricDefinitionId, { numeric, sample }] of Object.entries(inputs.metricResults)) {
    const { data, error } = await db.from("comun_metric_snapshots" as never).insert({
      metric_definition_id: metricDefinitionId,
      period_start: inputs.periodStart,
      period_end: inputs.periodEnd,
      territory_id: inputs.territoryId ?? null,
      value_numeric: numeric,
      sample_size: sample,
      coverage_summary: `Snapshot calculado sobre ${sample} registros de calçada.`,
      limitations_public: inputs.limitationsPublic ?? "Os dados representam contribuições recebidas e verificadas pelo projeto e não constituem levantamento completo do território.",
      methodology_version_id: inputs.methodologyVersionId,
      publication_status: "approved_public",
    } as never).select("id").single();
    if (error && (error as any).code !== "23505") throw error;
    results.push({ metricDefinitionId, snapshotId: data ? (data as any).id : null });
  }
  return results;
}

export async function getLatestSidewalkSnapshot(db: SupabaseClient, observatoryId: string) {
  const { data, error } = await db.from("comun_metric_snapshots" as never)
    .select("id, period_start, period_end, value_numeric, sample_size, limitations_public, generated_at" as never)
    .eq("publication_status" as never, "approved_public")
    .in("metric_definition_id" as never, (await getSidewalkMetricDefinitions(db, observatoryId)).map((m) => m.id))
    .order("generated_at" as never, { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as any;
}
