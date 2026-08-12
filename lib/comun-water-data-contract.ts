import drinkingManifestJson from "@/data/comun/environment/water/drinking-water-quality-candidate-manifest-v1-20260812.json";
import surfaceManifestJson from "@/data/comun/environment/water/surface-water-quality-candidate-manifest-v1-20260812.json";

export const COMUN_WATER_DATA_CONTRACT_VERSION =
  "comun-water-data-contract-v1" as const;
export const COMUN_WATER_DATA_DOMAINS = [
  "surface_water_quality",
  "drinking_water_quality",
] as const;
export const COMUN_WATER_OFFICIAL_SOURCE_DOMAINS = [
  "www.inea.rj.gov.br",
  "qualidadedaagua.ana.gov.br",
  "dadosabertos.saude.gov.br",
  "www.gov.br",
] as const;

export type WaterDataDomain = (typeof COMUN_WATER_DATA_DOMAINS)[number];
export type WaterDataReadiness = "READY_D4B" | "PARTIAL_D4" | "BLOCKED_D4";
export type WaterDataSource = {
  sourceId: string;
  originalPublisher: string;
  sourceKind: string;
  sourceUrl: string;
  rawSha256: string;
  semanticSha256: string | null;
  period: string;
  qualityState: "verified_source" | "partial" | "source_conflict";
  publicSafe: boolean | "requires_field_audit";
};

export type SurfaceWaterSample = {
  stationId: string;
  sampledAt: string | null;
  parameter: string;
  value: number | null;
  qualifier: string | null;
  unit: string | null;
  sourceId: string;
};

export type OfficialWaterQualityIndex = {
  stationId: string;
  value: number | null;
  classification: string | null;
  indexMethod: string;
  period: string;
  sourceId: string;
};

export type DrinkingWaterMeasurement = {
  supplySystemId: string;
  municipalityCode: string;
  controlKind: "control" | "surveillance";
  parameter: string;
  result: number | string | null;
  unit: string | null;
  sampledAt: string | null;
  reportedPeriod: string;
  sourceId: string;
};

export type SurfaceWaterStationDescriptor = {
  stationId: string;
  officialCode: string;
  officialName: string | null;
  waterBody: string | null;
  municipality: string | null;
  latitude: number | null;
  longitude: number | null;
  hydrographicRegion: string | null;
  firstVerifiedSampleAt: string | null;
  lastVerifiedSampleAt: string | null;
  sourceIds: string[];
};

export type SurfaceWaterQualityDatasetDescriptor = {
  manifestVersion: string;
  domain: "surface_water_quality";
  decision: WaterDataReadiness;
  automaticPublicationAllowed: false;
  activeSnapshot: false;
  retrievedAt: string;
  sources: WaterDataSource[];
  verifiedStations: SurfaceWaterStationDescriptor[];
  limitations: string[];
};

export type DrinkingWaterSupplySystemIdentity = {
  municipalityCode: string;
  municipalityName: string;
  saaeVrSystemId: string | null;
  status: "verified" | "not_verified";
  reason: string;
};

export type DrinkingWaterQualityDatasetDescriptor = {
  manifestVersion: string;
  domain: "drinking_water_quality";
  decision: WaterDataReadiness;
  automaticPublicationAllowed: false;
  activeSnapshot: false;
  retrievedAt: string;
  sources: WaterDataSource[];
  controlKinds: Array<"control" | "surveillance">;
  supplySystemIdentity: DrinkingWaterSupplySystemIdentity;
  limitations: string[];
};

export const COMUN_SURFACE_WATER_QUALITY_CANDIDATE =
  surfaceManifestJson as SurfaceWaterQualityDatasetDescriptor;
export const COMUN_DRINKING_WATER_QUALITY_CANDIDATE =
  drinkingManifestJson as DrinkingWaterQualityDatasetDescriptor;

export function isOfficialWaterSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_WATER_OFFICIAL_SOURCE_DOMAINS.includes(
        url.hostname as (typeof COMUN_WATER_OFFICIAL_SOURCE_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

function validCoordinate(latitude: number | null, longitude: number | null) {
  if (latitude === null && longitude === null) return true;
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validateSources(sources: readonly WaterDataSource[]) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) errors.push(`duplicate_source:${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (!isOfficialWaterSourceUrl(source.sourceUrl)) {
      errors.push(`non_official_source:${source.sourceId}`);
    }
    if (!isSha256(source.rawSha256)) errors.push(`invalid_source_hash:${source.sourceId}`);
  }
  return { errors, sourceIds };
}

export function validateSurfaceWaterQualityCandidate(
  descriptor = COMUN_SURFACE_WATER_QUALITY_CANDIDATE,
) {
  const { errors, sourceIds } = validateSources(descriptor.sources);
  if (descriptor.domain !== "surface_water_quality") errors.push("wrong_surface_domain");
  if (descriptor.activeSnapshot) errors.push("surface_snapshot_forbidden_in_d4a");
  if (descriptor.automaticPublicationAllowed) errors.push("surface_auto_publication_forbidden");
  const stationIds = new Set<string>();
  for (const station of descriptor.verifiedStations) {
    if (!station.stationId || !station.officialCode) errors.push("missing_station_identity");
    if (stationIds.has(station.stationId)) errors.push(`duplicate_station:${station.stationId}`);
    stationIds.add(station.stationId);
    if (!validCoordinate(station.latitude, station.longitude)) {
      errors.push(`invalid_station_coordinate:${station.stationId}`);
    }
    for (const sourceId of station.sourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`unknown_station_source:${station.stationId}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateDrinkingWaterQualityCandidate(
  descriptor = COMUN_DRINKING_WATER_QUALITY_CANDIDATE,
) {
  const { errors } = validateSources(descriptor.sources);
  if (descriptor.domain !== "drinking_water_quality") errors.push("wrong_drinking_domain");
  if (descriptor.activeSnapshot) errors.push("drinking_snapshot_forbidden_in_d4a");
  if (descriptor.automaticPublicationAllowed) errors.push("drinking_auto_publication_forbidden");
  if (
    descriptor.controlKinds.length !== 2 ||
    !descriptor.controlKinds.includes("control") ||
    !descriptor.controlKinds.includes("surveillance")
  ) {
    errors.push("control_and_surveillance_must_be_separate");
  }
  if (!descriptor.supplySystemIdentity.municipalityCode) {
    errors.push("missing_supply_system_municipality");
  }
  if (
    descriptor.supplySystemIdentity.status === "verified" &&
    !descriptor.supplySystemIdentity.saaeVrSystemId
  ) {
    errors.push("verified_supply_system_requires_official_id");
  }
  return { ok: errors.length === 0, errors };
}

export function validateWaterDataContract() {
  const surface = validateSurfaceWaterQualityCandidate();
  const drinking = validateDrinkingWaterQualityCandidate();
  return {
    ok: surface.ok && drinking.ok,
    errors: [...surface.errors, ...drinking.errors],
  };
}
