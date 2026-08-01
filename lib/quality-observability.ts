import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  metricBucketValue,
  metricValueBucket,
  type ComunDeviceClass,
  type ComunRouteClass,
  type ComunWebVitalName,
  type ComunWebVitalRating,
} from "@/lib/quality-performance";

type QualityMetricInput = {
  name: ComunWebVitalName;
  value: number;
  rating: ComunWebVitalRating;
  routeClass: ComunRouteClass;
  deviceClass: ComunDeviceClass;
  appVersion: string;
};

export async function recordQualityMetric(input: QualityMetricInput) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;
  await supabase.rpc("comun_record_quality_metric", {
    p_metric_name: input.name,
    p_route_class: input.routeClass,
    p_device_class: input.deviceClass,
    p_app_version: input.appVersion,
    p_value_bucket: metricValueBucket(input.name, input.value),
    p_rating: input.rating,
  });
}

type MetricRow = {
  metric_name: ComunWebVitalName;
  device_class: ComunDeviceClass;
  value_bucket: number;
  rating: ComunWebVitalRating;
  total: number;
  bucket: string;
  route_class: ComunRouteClass;
};

export type QualityObservability = {
  available: boolean;
  sampleCount: number;
  lastSampleAt: string | null;
  routesCovered: number;
  p75: Partial<Record<`${ComunWebVitalName}_${ComunDeviceClass}`, number>>;
  goodSamples: number;
  poorSamples: number;
  fieldEvidenceReady: boolean;
  privacy: "aggregate_only";
};

function weightedP75(
  rows: MetricRow[],
  name: ComunWebVitalName,
  device: ComunDeviceClass,
) {
  const selected = rows
    .filter((row) => row.metric_name === name && row.device_class === device)
    .sort((left, right) => left.value_bucket - right.value_bucket);
  const total = selected.reduce((sum, row) => sum + Number(row.total), 0);
  if (!total) return null;
  const target = Math.ceil(total * 0.75);
  let seen = 0;
  for (const row of selected) {
    seen += Number(row.total);
    if (seen >= target) return metricBucketValue(name, row.value_bucket);
  }
  return null;
}

export async function getQualityObservability(): Promise<QualityObservability> {
  const empty: QualityObservability = {
    available: false,
    sampleCount: 0,
    lastSampleAt: null,
    routesCovered: 0,
    p75: {},
    goodSamples: 0,
    poorSamples: 0,
    fieldEvidenceReady: false,
    privacy: "aggregate_only",
  };
  const supabase = createServiceSupabaseClient();
  if (!supabase) return empty;
  const since = new Date(Date.now() - 28 * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("comun_quality_metrics_hourly")
    .select(
      "metric_name,device_class,value_bucket,rating,total,bucket,route_class",
    )
    .gte("bucket", since)
    .order("bucket", { ascending: false })
    .limit(10_000);
  if (error) return empty;
  const rows = (data ?? []) as MetricRow[];
  const sampleCount = rows.reduce((sum, row) => sum + Number(row.total), 0);
  const p75: QualityObservability["p75"] = {};
  for (const metric of ["LCP", "INP", "CLS"] as const)
    for (const device of ["mobile", "desktop"] as const) {
      const value = weightedP75(rows, metric, device);
      if (value !== null) p75[`${metric}_${device}`] = value;
    }
  const coreSampleCounts = ["LCP", "INP", "CLS"].flatMap((metric) =>
    ["mobile", "desktop"].map((device) =>
      rows
        .filter(
          (row) => row.metric_name === metric && row.device_class === device,
        )
        .reduce((sum, row) => sum + Number(row.total), 0),
    ),
  );
  return {
    available: true,
    sampleCount,
    lastSampleAt: rows[0]?.bucket ?? null,
    routesCovered: new Set(rows.map((row) => row.route_class)).size,
    p75,
    goodSamples: rows
      .filter((row) => row.rating === "good")
      .reduce((sum, row) => sum + Number(row.total), 0),
    poorSamples: rows
      .filter((row) => row.rating === "poor")
      .reduce((sum, row) => sum + Number(row.total), 0),
    fieldEvidenceReady: coreSampleCounts.every((count) => count >= 75),
    privacy: "aggregate_only",
  };
}
