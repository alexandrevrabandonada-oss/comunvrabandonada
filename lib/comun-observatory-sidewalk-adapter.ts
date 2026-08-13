import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  SIDEWALK_CONDITIONS,
  SIDEWALK_PROBLEMS,
  type SidewalkCondition,
  type SidewalkProblem,
} from "./comun-sidewalk-p4-contract";
import {
  COMUN_OBSERVATORY_METHODOLOGY_VERSION,
  canExposeInObservatory,
  freshnessForUpdatedAt,
  type ObservatorySourceDescriptor,
  type PublicObservation,
} from "./comun-observatory";
import {
  SIDEWALK_CONDITION_LABELS,
  type SidewalkCoverageState,
} from "./comun-sidewalk-observatory";

export const SIDEWALK_OBSERVATORY_PAGE_SIZE = 250;
export const SIDEWALK_OBSERVATORY_SAFETY_CAP = 5000;

type PublicSidewalkProjectionRow = {
  slug: string;
  public_geometry_geojson: unknown;
  categories: unknown;
  condition: string | null;
  last_observed_at: string | null;
  updated_at: string | null;
  visibility?: string | null;
  status?: string | null;
  verification_status?: string | null;
  public_location_level?: string | null;
  location_precision?: string | null;
  location_source?: string | null;
};

export type SidewalkProjectionQualityDiagnostic = {
  code:
    | "unknown_condition_ignored"
    | "unknown_problem_ignored"
    | "invalid_observed_at_ignored"
    | "invalid_updated_at_ignored";
  count: number;
};

export type ProjectionResult = {
  source: ObservatorySourceDescriptor;
  observations: PublicObservation[];
  available: boolean;
  coverageState: SidewalkCoverageState;
  qualityDiagnostics: SidewalkProjectionQualityDiagnostic[];
};

type PageFetcher = (
  from: number,
  to: number,
) => Promise<{ data: readonly PublicSidewalkProjectionRow[] | null; error: unknown }>;

function safePoint(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const geometry = value as { type?: unknown; coordinates?: unknown; properties?: unknown };
  if (geometry.type !== "Point" || geometry.properties !== undefined) return null;
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2)
    return null;
  const [longitude, latitude] = geometry.coordinates;
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 90
  )
    return null;
  return { type: "Point" as const, coordinates: [longitude, latitude] as [number, number] };
}

function safeDate(value: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function optionalGateAllows(row: PublicSidewalkProjectionRow) {
  const expected: Array<[keyof PublicSidewalkProjectionRow, string]> = [
    ["visibility", "public"],
    ["status", "published"],
    ["verification_status", "verified"],
    ["public_location_level", "approximate"],
    ["location_precision", "approximate"],
    ["location_source", "editorial"],
  ];
  return expected.every(([key, value]) => row[key] === undefined || row[key] === value);
}

function safeCondition(value: string | null): SidewalkCondition | "unknown" {
  return SIDEWALK_CONDITIONS.includes(value as SidewalkCondition)
    ? (value as SidewalkCondition)
    : "unknown";
}

function safeProblems(value: unknown) {
  if (!Array.isArray(value)) return { problems: [] as SidewalkProblem[], unknownCount: 0 };
  const unique = new Set<SidewalkProblem>();
  let unknownCount = 0;
  for (const item of value) {
    if (
      typeof item === "string" &&
      SIDEWALK_PROBLEMS.includes(item as SidewalkProblem)
    ) {
      unique.add(item as SidewalkProblem);
    } else if (typeof item === "string") {
      unknownCount += 1;
    }
  }
  return { problems: [...unique], unknownCount };
}

function diagnosticsFromCounts(counts: Record<SidewalkProjectionQualityDiagnostic["code"], number>) {
  return (Object.entries(counts) as Array<[
    SidewalkProjectionQualityDiagnostic["code"],
    number,
  ]>)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ code, count }));
}

export function sidewalkReviewedProjectionSource(
  updatedAt: string | null,
  coverageState: SidewalkCoverageState = "complete_for_public_projection",
): ObservatorySourceDescriptor {
  return {
    id: "sidewalk-reviewed-projection-v1",
    observatoryId: "sidewalks",
    label: "Projeção pública revisada do Mapa das Calçadas",
    sourceKind: "reviewed_community_projection",
    publisher: "COMUN · revisão editorial de Calçadas",
    sourceReference: "P4 reviewed-public-projection",
    sourceUrl: "/comun/calcadas",
    methodology:
      "Somente contribuições revisadas, verificadas e publicadas com geometria aproximada entram nesta leitura.",
    observedPeriod: null,
    updatedAt,
    reviewedAt: "2026-08-10T00:00:00.000Z",
    freshness: freshnessForUpdatedAt(updatedAt),
    geographyLevel: "reviewed_public_point",
    licenseOrReuseNote: "Uso público condicionado à metodologia e às limitações indicadas.",
    qualityState:
      coverageState === "partial_due_to_safety_cap"
        ? "partial"
        : "reviewed_community",
    publicSafe: true,
    automaticPublicationAllowed: false,
  };
}

export function adaptSidewalkReviewedProjection(
  rows: readonly PublicSidewalkProjectionRow[],
  coverageState: SidewalkCoverageState = "complete_for_public_projection",
): ProjectionResult {
  const diagnosticCounts: Record<
    SidewalkProjectionQualityDiagnostic["code"],
    number
  > = {
    unknown_condition_ignored: 0,
    unknown_problem_ignored: 0,
    invalid_observed_at_ignored: 0,
    invalid_updated_at_ignored: 0,
  };
  const updatedAt = rows.reduce<string | null>((latest, row) => {
    const candidate = safeDate(row.updated_at);
    if (row.updated_at && !candidate) diagnosticCounts.invalid_updated_at_ignored += 1;
    if (!candidate || (latest && latest >= candidate)) return latest;
    return candidate;
  }, null);
  const source = sidewalkReviewedProjectionSource(updatedAt, coverageState);
  if (!canExposeInObservatory(source)) {
    return {
      source,
      observations: [],
      available: true,
      coverageState,
      qualityDiagnostics: [],
    };
  }

  const observations = rows.flatMap((row) => {
    if (!optionalGateAllows(row)) return [];
    const geometry = safePoint(row.public_geometry_geojson);
    const slug = row.slug?.trim();
    if (!geometry || !slug) return [];
    const condition = safeCondition(row.condition);
    if (condition === "unknown" && row.condition) {
      diagnosticCounts.unknown_condition_ignored += 1;
    }
    const { problems, unknownCount } = safeProblems(row.categories);
    diagnosticCounts.unknown_problem_ignored += unknownCount;
    const observedAt = safeDate(row.last_observed_at);
    const recordUpdatedAt = safeDate(row.updated_at);
    if (row.last_observed_at && !observedAt) {
      diagnosticCounts.invalid_observed_at_ignored += 1;
    }
    return [
      {
        id: `sidewalk:${slug}`,
        observatoryId: "sidewalks" as const,
        kind: "sidewalk_condition" as const,
        label: SIDEWALK_CONDITION_LABELS[condition],
        value: problems.length || null,
        unit: "problemas estruturados",
        attributes: { condition, problems },
        period: { observedAt, updatedAt: recordUpdatedAt },
        geography: { level: "reviewed_public_point" as const, geometry },
        source: {
          id: source.id,
          sourceKind: source.sourceKind,
          sourceReference: source.sourceReference,
          sourceUrl: source.sourceUrl,
          publisher: source.publisher,
        },
        quality: source.qualityState,
        freshness: freshnessForUpdatedAt(recordUpdatedAt),
        methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
      },
    ];
  });

  observations.sort((left, right) => {
    const leftTime = left.period.observedAt ? Date.parse(left.period.observedAt) : -1;
    const rightTime = right.period.observedAt ? Date.parse(right.period.observedAt) : -1;
    return rightTime - leftTime;
  });

  return {
    source,
    observations,
    available: true,
    coverageState,
    qualityDiagnostics: diagnosticsFromCounts(diagnosticCounts),
  };
}

export async function loadSidewalkReviewedProjectionPages(
  fetchPage: PageFetcher,
): Promise<ProjectionResult> {
  const rows: PublicSidewalkProjectionRow[] = [];
  for (
    let offset = 0;
    offset < SIDEWALK_OBSERVATORY_SAFETY_CAP;
    offset += SIDEWALK_OBSERVATORY_PAGE_SIZE
  ) {
    const remaining = SIDEWALK_OBSERVATORY_SAFETY_CAP - offset;
    const requested = Math.min(SIDEWALK_OBSERVATORY_PAGE_SIZE, remaining);
    const result = await fetchPage(offset, offset + requested - 1);
    if (result.error) {
      return {
        source: sidewalkReviewedProjectionSource(null),
        observations: [],
        available: false,
        coverageState: "complete_for_public_projection",
        qualityDiagnostics: [],
      };
    }
    const page = [...(result.data ?? [])].slice(0, requested);
    rows.push(...page);
    if (page.length < requested) {
      return adaptSidewalkReviewedProjection(
        rows,
        "complete_for_public_projection",
      );
    }
  }
  return adaptSidewalkReviewedProjection(rows, "partial_due_to_safety_cap");
}

export async function getSidewalkReviewedProjectionForObservatory() {
  const db = createServiceSupabaseClient();
  if (!db) {
    return {
      source: sidewalkReviewedProjectionSource(null),
      observations: [],
      available: false,
      coverageState: "complete_for_public_projection" as const,
      qualityDiagnostics: [],
    };
  }

  return loadSidewalkReviewedProjectionPages(async (from, to) => {
    const { data, error } = await db
      .from("comun_sidewalk_records")
      .select(
        "slug,public_geometry_geojson,categories,condition,last_observed_at,updated_at",
      )
      .eq("visibility", "public")
      .eq("status", "published")
      .eq("verification_status", "verified")
      .eq("public_location_level", "approximate")
      .eq("location_precision", "approximate")
      .eq("location_source", "editorial")
      .not("public_geometry_geojson", "is", null)
      .order("updated_at", { ascending: false })
      .order("slug", { ascending: true })
      .range(from, to);
    return {
      data: (data ?? []) as PublicSidewalkProjectionRow[],
      error,
    };
  });
}
