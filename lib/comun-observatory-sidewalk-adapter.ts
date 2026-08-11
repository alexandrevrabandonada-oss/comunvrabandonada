import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  COMUN_OBSERVATORY_METHODOLOGY_VERSION,
  canExposeInObservatory,
  freshnessForUpdatedAt,
  type ObservatorySourceDescriptor,
  type PublicObservation,
} from "./comun-observatory";

type PublicSidewalkProjectionRow = {
  slug: string;
  public_geometry_geojson: unknown;
  categories: unknown;
  condition: string | null;
  last_observed_at: string | null;
  updated_at: string | null;
};

const conditionLabels: Record<string, string> = {
  good: "Boa condição",
  regular: "Condição regular",
  bad: "Condição ruim",
  terrible: "Condição muito ruim",
};

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

function safeCategories(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 6);
}

export function sidewalkReviewedProjectionSource(
  updatedAt: string | null,
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
    qualityState: "reviewed_community",
    publicSafe: true,
    automaticPublicationAllowed: false,
  };
}

export function adaptSidewalkReviewedProjection(
  rows: readonly PublicSidewalkProjectionRow[],
): {
  source: ObservatorySourceDescriptor;
  observations: PublicObservation[];
  available: true;
} {
  const updatedAt = rows.reduce<string | null>((latest, row) => {
    if (!row.updated_at || (latest && latest >= row.updated_at)) return latest;
    return row.updated_at;
  }, null);
  const source = sidewalkReviewedProjectionSource(updatedAt);
  if (!canExposeInObservatory(source)) {
    return { source, observations: [], available: true };
  }

  const observations = rows.flatMap((row) => {
    const geometry = safePoint(row.public_geometry_geojson);
    if (!geometry || !row.slug) return [];
    return [
      {
        id: `sidewalk:${row.slug}`,
        observatoryId: "sidewalks" as const,
        kind: "sidewalk_condition",
        label: conditionLabels[row.condition ?? ""] ?? "Condição revisada",
        value: safeCategories(row.categories).length || null,
        unit: "problemas estruturados",
        period: { observedAt: row.last_observed_at, updatedAt: row.updated_at },
        geography: { level: "reviewed_public_point" as const, geometry },
        source: {
          id: source.id,
          sourceKind: source.sourceKind,
          sourceReference: source.sourceReference,
          sourceUrl: source.sourceUrl,
          publisher: source.publisher,
        },
        quality: source.qualityState,
        freshness: freshnessForUpdatedAt(row.updated_at),
        methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
      },
    ];
  });
  return { source, observations, available: true };
}

export async function getSidewalkReviewedProjectionForObservatory() {
  const db = createServiceSupabaseClient();
  if (!db) {
    return {
      source: sidewalkReviewedProjectionSource(null),
      observations: [],
      available: false,
    };
  }

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
    .limit(250);

  if (error) {
    return {
      source: sidewalkReviewedProjectionSource(null),
      observations: [],
      available: false,
    };
  }

  return adaptSidewalkReviewedProjection(
    (data ?? []) as PublicSidewalkProjectionRow[],
  );
}
