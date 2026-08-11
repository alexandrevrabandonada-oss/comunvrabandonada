import snapshotJson from "@/data/comun/transport/system-metrics-v1.json";
import sourcesJson from "@/data/comun/transport/system-metrics-sources-v1.json";

export const COMUN_TRANSPORT_SYSTEM_METRICS_METHODOLOGY_VERSION =
  "comun-transport-system-metrics-v1" as const;
export const COMUN_TRANSPORT_SYSTEM_METRICS_OFFICIAL_DOMAINS = [
  "mobilidadeurbana.voltaredonda.rj.gov.br",
  "www.voltaredonda.rj.gov.br",
] as const;

export type SystemMetricsSourceType = "system_metrics_pdf" | "tariff_decree";
export type SystemMetricsQualityState = "verified_source" | "partial" | "source_conflict";
export type SystemMetricsSource = {
  sourceId: string;
  sourceType: SystemMetricsSourceType;
  publisher: string;
  officialUrl: string;
  sha256: string;
  retrievedAt: string;
  documentYear: number;
  methodology: string;
  qualityState: SystemMetricsQualityState;
  sourceStatus: "active" | "superseded" | "conflicting";
};
export type OfficialMetric = {
  metricId: string;
  label: string;
  value: number;
  unit: string;
  sourceId: string;
  sourcePage: number;
  sourceSection: string;
  sourceReportedPeriod: string;
  periodStart: string | null;
  periodEnd: string | null;
  qualityState: SystemMetricsQualityState;
  notes: string;
};
export type DerivedMetric = {
  metricId: string;
  label: string;
  value: number;
  unit: "percentual";
  derived: true;
  denominatorMetricId: string;
  sourceId: string;
  sourcePage: number;
};
export type FleetAgeRange = {
  range: string;
  lightVehicles: number;
  heavyVehicles: number;
};
export type CostComponent = {
  metricId: string;
  label: string;
  monthlyValue: number;
  percentageOfTotal: number;
};

const sourceManifest = sourcesJson as {
  manifestVersion: string;
  sources: SystemMetricsSource[];
};
export const COMUN_TRANSPORT_SYSTEM_METRICS_SOURCE_MANIFEST = sourceManifest;
export const COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT = snapshotJson as typeof snapshotJson & {
  sources: string[];
  metrics: typeof snapshotJson.metrics & {
    passengers: { items: OfficialMetric[]; derivedComposition: DerivedMetric[] };
    kilometers: { items: OfficialMetric[] };
    fleet: {
      total: OfficialMetric;
      operating: OfficialMetric;
      reserve: OfficialMetric;
      byAgeRange: FleetAgeRange[];
    };
    costs: {
      variableMonthly: OfficialMetric;
      fixedMonthly: OfficialMetric;
      totalMonthly: OfficialMetric;
      perKilometer: OfficialMetric;
      perKilometerWithTaxes: OfficialMetric;
      components: CostComponent[];
    };
    technicalFare: OfficialMetric;
    publicFare: {
      value: number;
      effectiveFrom: string;
      decreeNumber: string;
      sourceId: string;
      sourcePage: number;
      sourceSection: string;
      qualityState: SystemMetricsQualityState;
    };
  };
};

function isOfficialUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_TRANSPORT_SYSTEM_METRICS_OFFICIAL_DOMAINS.includes(
        url.hostname as (typeof COMUN_TRANSPORT_SYSTEM_METRICS_OFFICIAL_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

function metricReferencesValid(metric: OfficialMetric, sourceIds: Set<string>) {
  return (
    sourceIds.has(metric.sourceId) &&
    Number.isFinite(metric.value) &&
    metric.sourcePage > 0 &&
    Boolean(metric.sourceSection) &&
    Boolean(metric.sourceReportedPeriod) &&
    metric.periodStart === null &&
    metric.periodEnd === null
  );
}

export function getSystemMetricSource(sourceId: string) {
  return (
    COMUN_TRANSPORT_SYSTEM_METRICS_SOURCE_MANIFEST.sources.find(
      (source) => source.sourceId === sourceId,
    ) ?? null
  );
}

export function validateTransportSystemMetrics(
  snapshot = COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT,
  sources = COMUN_TRANSPORT_SYSTEM_METRICS_SOURCE_MANIFEST.sources,
) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) errors.push("duplicate_source_id");
    sourceIds.add(source.sourceId);
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) errors.push(`invalid_hash:${source.sourceId}`);
    if (!isOfficialUrl(source.officialUrl)) errors.push(`non_official_url:${source.sourceId}`);
  }
  if (snapshot.snapshotId !== "comun-transport-system-metrics-v1-20260811") {
    errors.push("snapshot_id_mismatch");
  }
  if (snapshot.methodologyVersion !== COMUN_TRANSPORT_SYSTEM_METRICS_METHODOLOGY_VERSION) {
    errors.push("methodology_version_mismatch");
  }
  if (snapshot.previousSnapshotId !== null) errors.push("unexpected_previous_snapshot");
  if (snapshot.sources.length !== 2 || snapshot.sources.some((sourceId) => !sourceIds.has(sourceId))) {
    errors.push("snapshot_source_reference_invalid");
  }

  const { passengers, kilometers, fleet, costs, technicalFare, publicFare } = snapshot.metrics;
  const officialMetrics = [
    ...passengers.items,
    ...kilometers.items,
    fleet.total,
    fleet.operating,
    fleet.reserve,
    costs.variableMonthly,
    costs.fixedMonthly,
    costs.totalMonthly,
    costs.perKilometer,
    costs.perKilometerWithTaxes,
    technicalFare,
  ];
  if (officialMetrics.some((metric) => !metricReferencesValid(metric, sourceIds))) {
    errors.push("metric_provenance_invalid");
  }
  if (passengers.items[0]?.value + passengers.items[1]?.value + passengers.items[2]?.value !== passengers.items[3]?.value) {
    errors.push("passenger_total_mismatch");
  }
  if (passengers.items[4]?.metricId !== "equivalent_passengers") {
    errors.push("equivalent_passengers_distinction_missing");
  }
  if (
    passengers.derivedComposition.some(
      (metric) =>
        !metric.derived ||
        metric.denominatorMetricId !== "total_transported_passengers" ||
        !sourceIds.has(metric.sourceId),
    )
  ) {
    errors.push("derived_composition_invalid");
  }
  if (fleet.total.value !== fleet.operating.value + fleet.reserve.value) errors.push("fleet_total_mismatch");
  const fleetByAge = fleet.byAgeRange.reduce(
    (sum, range) => sum + range.lightVehicles + range.heavyVehicles,
    0,
  );
  if (fleetByAge !== fleet.total.value) errors.push("fleet_age_total_mismatch");
  if (Math.abs(costs.variableMonthly.value + costs.fixedMonthly.value - costs.totalMonthly.value) > 0.01) {
    errors.push("cost_total_mismatch");
  }
  if (costs.components.some((component) => component.monthlyValue < 0 || component.percentageOfTotal < 0)) {
    errors.push("cost_component_invalid");
  }
  if (technicalFare.value !== 5.9354 || technicalFare.label !== "Tarifa técnica calculada no estudo") {
    errors.push("technical_fare_invalid");
  }
  if (
    publicFare.value !== 5.9 ||
    publicFare.effectiveFrom !== "2026-02-01" ||
    publicFare.decreeNumber !== "19.858/2026" ||
    !sourceIds.has(publicFare.sourceId)
  ) {
    errors.push("public_fare_invalid");
  }
  if (!snapshot.limitations.includes("COMUN_48_2_C2_PMM_DEFERRED_SOURCE_FORMAT_AMBIGUITY")) {
    errors.push("pmm_deferment_missing");
  }
  return { ok: errors.length === 0, errors };
}

export function getTransportSystemMetricsPublicResponse() {
  const snapshot = COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT;
  return {
    snapshotId: snapshot.snapshotId,
    snapshotDate: snapshot.snapshotDate,
    verifiedAt: snapshot.verifiedAt,
    methodologyVersion: snapshot.methodologyVersion,
    metrics: snapshot.metrics,
    limitations: snapshot.limitations,
    provenance: snapshot.sources.map((sourceId) => {
      const source = getSystemMetricSource(sourceId);
      return source
        ? {
            sourceId: source.sourceId,
            publisher: source.publisher,
            officialUrl: source.officialUrl,
            sha256: source.sha256,
            retrievedAt: source.retrievedAt,
            documentYear: source.documentYear,
            methodology: source.methodology,
            qualityState: source.qualityState,
            sourceStatus: source.sourceStatus,
          }
        : null;
    }).filter(Boolean),
    methodology: {
      officialStudyNotRealtime: true,
      privateOrCommunityDataExcluded: true,
      publicFareSeparateFromTechnicalFare: true,
    },
  };
}
