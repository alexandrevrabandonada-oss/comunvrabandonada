import activeSnapshotJson from "@/data/comun/environment/water/surface/active-snapshot.json";
import parameterDefinitionsJson from "@/data/comun/environment/water/surface/parameter-definitions-v1.json";
import snapshotJson from "@/data/comun/environment/water/surface/surface-water-v1-2025.json";
import sourceManifestJson from "@/data/comun/environment/water/surface/source-manifest-v1.json";

export const COMUN_SURFACE_WATER_METHODOLOGY_VERSION =
  "comun-surface-water-rh-iii-v1" as const;
export const COMUN_SURFACE_WATER_OFFICIAL_DOMAINS = [
  "www.inea.rj.gov.br",
] as const;

export type SurfaceWaterParameterDefinition = {
  canonicalId: string;
  officialLabel: string;
  officialUnit: string | null;
  sourceColumn: string;
};

export type SurfaceWaterStation = {
  stationId: string;
  officialCode: string;
  officialName: string | null;
  waterBody: string | null;
  municipality: string | null;
  geography: {
    level: "official_public_point";
    latitude: number | null;
    longitude: number | null;
  };
  sourceIds: string[];
};

export type SurfaceWaterMeasurement = {
  stationId: string;
  sampledAt: string | null;
  parameter: string;
  officialParameterLabel: string;
  value: number | null;
  qualifier: string | null;
  unit: string | null;
  sourceId: string;
};

export type OfficialSurfaceWaterIndex = {
  stationId: string;
  sampledAt: string | null;
  value: number | null;
  qualifier: string | null;
  classification: string | null;
  indexMethod: "IQA_NSF";
  sourceId: string;
};

type Source = {
  sourceId: string;
  officialUrl: string;
  rawSha256: string;
  reportedYear: number;
};

type SurfaceWaterSourceManifest = {
  sources: Source[];
  drift2024To2025: {
    stationAdded: string[];
    stationRemoved: string[];
    parametersAdded: string[];
    parametersRemoved: string[];
    columnDrift: string;
  };
};

type Snapshot = {
  snapshotId: string;
  snapshotKind: "official_surface_water_raw_measurements";
  referenceYear: number;
  sourceId: string;
  parserVersion: string;
  automaticPublicationAllowed: false;
  stations: SurfaceWaterStation[];
  rowSchema: string[];
  rows: Array<Array<string | number | null>>;
  limitations: string[];
};

const manifest = sourceManifestJson as SurfaceWaterSourceManifest;
const definitions = parameterDefinitionsJson as {
  parameters: SurfaceWaterParameterDefinition[];
};

export const COMUN_SURFACE_WATER_ACTIVE_SNAPSHOT = activeSnapshotJson as {
  activeSnapshotId: string;
  referenceYear: number;
  automaticPublicationAllowed: false;
};
export const COMUN_SURFACE_WATER_SOURCE_MANIFEST = manifest;
export const COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS = definitions.parameters;
export const COMUN_SURFACE_WATER_SNAPSHOT = snapshotJson as Snapshot;

const RAW_VALUE = /^([<>]|ND|NQ)?(\d+(?:\.\d+)?)$/;

function parseRawValue(raw: string | number | null) {
  if (raw === null) return { value: null, qualifier: null };
  if (typeof raw === "number") return { value: raw, qualifier: null };
  if (raw === "ND" || raw === "NQ") return { value: null, qualifier: raw };
  const match = raw.match(RAW_VALUE);
  if (!match) return { value: null, qualifier: null };
  return { value: Number(match[2]), qualifier: match[1] ?? null };
}

export function isOfficialSurfaceWaterUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_SURFACE_WATER_OFFICIAL_DOMAINS.includes(
        url.hostname as (typeof COMUN_SURFACE_WATER_OFFICIAL_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

export function normalizeSurfaceWaterMeasurements(
  snapshot = COMUN_SURFACE_WATER_SNAPSHOT,
  parameterDefinitions = COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS,
) {
  const definitionById = new Map(
    parameterDefinitions.map((definition) => [definition.canonicalId, definition]),
  );
  const source = manifest.sources.find((candidate) => candidate.sourceId === snapshot.sourceId);
  if (!source) return [] as SurfaceWaterMeasurement[];

  return snapshot.rows.flatMap((row) => {
    const stationCode = String(row[0]);
    const sampledAt = typeof row[1] === "string" ? row[1] : null;
    return snapshot.rowSchema.slice(3).flatMap((parameter, index) => {
      const definition = definitionById.get(parameter);
      if (!definition) return [];
      const { value, qualifier } = parseRawValue(row[index + 3] ?? null);
      return [{
        stationId: `surface-water:inea:${stationCode}`,
        sampledAt,
        parameter,
        officialParameterLabel: definition.officialLabel,
        value,
        qualifier,
        unit: definition.officialUnit,
        sourceId: source.sourceId,
      }];
    });
  });
}

export function normalizeOfficialSurfaceWaterIndexes(
  snapshot = COMUN_SURFACE_WATER_SNAPSHOT,
) {
  return snapshot.rows.map((row) => {
    const parsed = parseRawValue(row[2] ?? null);
    return {
      stationId: `surface-water:inea:${String(row[0])}`,
      sampledAt: typeof row[1] === "string" ? row[1] : null,
      value: parsed.value,
      qualifier: parsed.qualifier,
      classification: null,
      indexMethod: "IQA_NSF" as const,
      sourceId: snapshot.sourceId,
    };
  });
}

function isIsoDate(value: string | null) {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateSurfaceWaterSnapshot(
  snapshot = COMUN_SURFACE_WATER_SNAPSHOT,
  sources = COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources,
  parameterDefinitions = COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS,
) {
  const errors: string[] = [];
  const source = sources.find((candidate) => candidate.sourceId === snapshot.sourceId);
  if (!source) errors.push("missing_snapshot_source");
  if (source && (!isOfficialSurfaceWaterUrl(source.officialUrl) || !/^[a-f0-9]{64}$/.test(source.rawSha256))) {
    errors.push("invalid_source_provenance");
  }
  if (snapshot.snapshotKind !== "official_surface_water_raw_measurements") errors.push("wrong_snapshot_kind");
  if (snapshot.referenceYear !== 2025) errors.push("wrong_reference_year");
  if (snapshot.automaticPublicationAllowed) errors.push("automatic_publication_forbidden");
  const stationCodes = new Set<string>();
  for (const station of snapshot.stations) {
    if (stationCodes.has(station.officialCode)) errors.push(`duplicate_station:${station.officialCode}`);
    stationCodes.add(station.officialCode);
    if (station.stationId !== `surface-water:inea:${station.officialCode}`) errors.push(`invalid_station_id:${station.officialCode}`);
    if (station.municipality !== "Volta Redonda") errors.push(`unexpected_municipality:${station.officialCode}`);
    if (station.geography.latitude !== null || station.geography.longitude !== null) errors.push(`invented_coordinate:${station.officialCode}`);
  }
  if (!stationCodes.has("PS0419")) errors.push("missing_ps0419");
  const parameterIds = new Set(parameterDefinitions.map((definition) => definition.canonicalId));
  if (snapshot.rowSchema.length !== 13 || snapshot.rowSchema[0] !== "stationCode" || snapshot.rowSchema[1] !== "sampledAt" || snapshot.rowSchema[2] !== "iqaNsf") {
    errors.push("invalid_row_schema");
  }
  const sampleKeys = new Set<string>();
  for (const row of snapshot.rows) {
    if (row.length !== snapshot.rowSchema.length) {
      errors.push("invalid_row_length");
      continue;
    }
    const stationCode = String(row[0]);
    const sampledAt = typeof row[1] === "string" ? row[1] : null;
    if (!stationCodes.has(stationCode)) errors.push(`unknown_row_station:${stationCode}`);
    if (!isIsoDate(sampledAt)) errors.push(`invalid_sample_date:${stationCode}`);
    const key = `${stationCode}:${sampledAt}`;
    if (sampleKeys.has(key)) errors.push(`duplicate_sample:${key}`);
    sampleKeys.add(key);
    for (let index = 3; index < snapshot.rowSchema.length; index += 1) {
      if (!parameterIds.has(snapshot.rowSchema[index])) errors.push(`unmappedOfficialParameter:${snapshot.rowSchema[index]}`);
      const parsed = parseRawValue(row[index]);
      if (row[index] !== null && parsed.value === null) errors.push(`invalid_value:${stationCode}:${snapshot.rowSchema[index]}`);
    }
  }
  const measurements = normalizeSurfaceWaterMeasurements(snapshot, parameterDefinitions);
  if (measurements.length !== snapshot.rows.length * parameterDefinitions.length) errors.push("measurement_count_mismatch");
  return { ok: errors.length === 0, errors };
}
