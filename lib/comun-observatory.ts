export const COMUN_OBSERVATORY_METHODOLOGY_VERSION =
  "comun-observatory-foundation-v1" as const;

export const OBSERVATORY_SOURCE_KINDS = [
  "official_public_data",
  "reviewed_community_projection",
  "editorial_public_data",
] as const;

export type ObservatorySourceKind = (typeof OBSERVATORY_SOURCE_KINDS)[number];
export type ObservatoryFreshness = "current" | "aging" | "stale" | "unknown";
export type ObservatoryQualityState =
  | "verified_source"
  | "reviewed_community"
  | "source_conflict"
  | "partial"
  | "experimental";
export type ObservatoryGeographyLevel =
  | "city"
  | "district"
  | "neighborhood"
  | "approximate_area"
  | "reviewed_public_point";
export type ObservatoryId =
  | "sidewalks"
  | "transport"
  | "environment"
  | "essential_services";
export type ObservatoryStatus = "available" | "preparing";

export type ObservatoryRegistryEntry = {
  id: ObservatoryId;
  slug: string;
  label: string;
  description: string;
  status: ObservatoryStatus;
  publicRoute: string | null;
  sourceKindsAllowed: readonly ObservatorySourceKind[];
  methodologyVersion: string;
  lastReviewedAt: string;
  freshnessPolicy: string;
  geographyMode: readonly ObservatoryGeographyLevel[];
  sensitivityPolicy: "public-origin-only";
  automaticPublicationAllowed: false;
};

export type ObservatorySourceDescriptor = {
  id: string;
  observatoryId: ObservatoryId;
  label: string;
  sourceKind: ObservatorySourceKind;
  publisher: string;
  sourceReference: string;
  sourceUrl: string;
  methodology: string;
  observedPeriod: string | null;
  updatedAt: string | null;
  reviewedAt: string;
  freshness: ObservatoryFreshness;
  geographyLevel: ObservatoryGeographyLevel;
  licenseOrReuseNote: string;
  qualityState: ObservatoryQualityState;
  publicSafe: boolean;
  automaticPublicationAllowed: false;
};

export type PublicObservation = {
  id: string;
  observatoryId: ObservatoryId;
  kind: string;
  label: string;
  value: string | number | null;
  unit: string | null;
  period: { observedAt: string | null; updatedAt: string | null };
  geography: {
    level: ObservatoryGeographyLevel;
    geometry: { type: "Point"; coordinates: [number, number] } | null;
  };
  source: Pick<
    ObservatorySourceDescriptor,
    "id" | "sourceKind" | "sourceReference" | "sourceUrl" | "publisher"
  >;
  quality: ObservatoryQualityState;
  freshness: ObservatoryFreshness;
  methodologyVersion: string;
};

const forbiddenSourceKinds = new Set([
  "private_report_aggregate",
  "private_report",
  "private_location",
  "private_attachment",
  "wallet",
  "forwarding_package",
]);
const publicKinds = new Set<string>(OBSERVATORY_SOURCE_KINDS);

export function canExposeInObservatory(
  source: Pick<
    ObservatorySourceDescriptor,
    | "sourceKind"
    | "publicSafe"
    | "automaticPublicationAllowed"
    | "sourceReference"
    | "sourceUrl"
  >,
) {
  return (
    publicKinds.has(source.sourceKind) &&
    !forbiddenSourceKinds.has(source.sourceKind) &&
    source.publicSafe === true &&
    source.automaticPublicationAllowed === false &&
    source.sourceReference.trim().length > 0 &&
    source.sourceUrl.startsWith("/")
  );
}

export function freshnessForUpdatedAt(
  updatedAt: string | null,
  now = Date.now(),
): ObservatoryFreshness {
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) return "unknown";
  const age = now - Date.parse(updatedAt);
  if (age <= 90 * 24 * 60 * 60 * 1000) return "current";
  if (age <= 365 * 24 * 60 * 60 * 1000) return "aging";
  return "stale";
}

export const COMUN_OBSERVATORY_REGISTRY = [
  {
    id: "sidewalks",
    slug: "calcadas",
    label: "Calçadas",
    description: "Veja condições de circulação e acessibilidade já revisadas.",
    status: "available",
    publicRoute: "/comun/calcadas",
    sourceKindsAllowed: ["reviewed_community_projection"],
    methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
    lastReviewedAt: "2026-08-10T00:00:00.000Z",
    freshnessPolicy: "A data continua visível mesmo quando envelhece.",
    geographyMode: ["approximate_area", "reviewed_public_point"],
    sensitivityPolicy: "public-origin-only",
    automaticPublicationAllowed: false,
  },
  {
    id: "transport",
    slug: "transporte",
    label: "Transporte",
    description: "Informações públicas sobre transporte coletivo.",
    status: "preparing",
    publicRoute: null,
    sourceKindsAllowed: ["official_public_data", "editorial_public_data"],
    methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
    lastReviewedAt: "2026-08-10T00:00:00.000Z",
    freshnessPolicy: "A fonte e o período serão informados antes da publicação.",
    geographyMode: ["city", "district", "neighborhood", "approximate_area"],
    sensitivityPolicy: "public-origin-only",
    automaticPublicationAllowed: false,
  },
  {
    id: "environment",
    slug: "ambiente",
    label: "Ambiente",
    description: "Dados públicos e revisados sobre o ambiente urbano.",
    status: "preparing",
    publicRoute: null,
    sourceKindsAllowed: ["official_public_data", "editorial_public_data"],
    methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
    lastReviewedAt: "2026-08-10T00:00:00.000Z",
    freshnessPolicy: "A fonte e o período serão informados antes da publicação.",
    geographyMode: ["city", "district", "neighborhood", "approximate_area"],
    sensitivityPolicy: "public-origin-only",
    automaticPublicationAllowed: false,
  },
  {
    id: "essential_services",
    slug: "agua-e-servicos",
    label: "Água e serviços",
    description: "Dados públicos sobre serviços essenciais.",
    status: "preparing",
    publicRoute: null,
    sourceKindsAllowed: ["official_public_data", "editorial_public_data"],
    methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
    lastReviewedAt: "2026-08-10T00:00:00.000Z",
    freshnessPolicy: "A fonte e o período serão informados antes da publicação.",
    geographyMode: ["city", "district", "neighborhood", "approximate_area"],
    sensitivityPolicy: "public-origin-only",
    automaticPublicationAllowed: false,
  },
] as const satisfies readonly ObservatoryRegistryEntry[];

export function getPublicObservatoryRegistry(sidewalkAvailable: boolean) {
  return COMUN_OBSERVATORY_REGISTRY.map((entry) =>
    entry.id === "sidewalks" && !sidewalkAvailable
      ? { ...entry, status: "preparing" as const, publicRoute: null }
      : entry,
  );
}
