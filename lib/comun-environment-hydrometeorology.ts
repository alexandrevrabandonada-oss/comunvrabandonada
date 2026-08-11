import inventoryJson from "@/data/comun/environment/hydrometeorology/operational-inventory-v1-20260811.json";
import manifestJson from "@/data/comun/environment/hydrometeorology/source-manifest-v1.json";

export const COMUN_HYDROMET_METHODOLOGY_VERSION =
  "comun-hydrometeorology-inventory-v1" as const;
export const COMUN_HYDROMET_OFFICIAL_DOMAINS = [
  "www.inea.rj.gov.br",
  "alertadecheias.inea.rj.gov.br",
] as const;
export const COMUN_HYDROMET_VARIABLES = [
  "rainfall",
  "river_level",
  "flow",
] as const;
export const COMUN_HYDROMET_STATION_STATUSES = [
  "operational_reported",
  "offline_reported",
  "maintenance_reported",
  "unknown",
] as const;

export type HydrometVariable = (typeof COMUN_HYDROMET_VARIABLES)[number];
export type HydrometStationStatus =
  | "operational_reported"
  | "offline_reported"
  | "maintenance_reported"
  | "unknown";
export type HydrometDataState = "available" | "delayed" | "missing" | "unknown";
export type HydrometSourceType =
  | "operational_station_inventory"
  | "realtime_hydromet_publication"
  | "historical_access_documentation"
  | "daily_hydromet_bulletin";

export type HydrometSource = {
  sourceId: string;
  sourceType: HydrometSourceType;
  originalPublisher: "INEA";
  officialUrl: string;
  rawSha256: string;
  retrievedAt: string;
  reportedAt: string | null;
  parserVersion: string;
  qualityState: "verified_source" | "partial" | "source_gap";
  status: "active" | "superseded" | "unavailable";
};

export type HydrometeorologicalStation = {
  stationId: string;
  officialName: string;
  municipality: string;
  riverOrBasin: string | null;
  hydrographicRegion: string;
  hydrographicRegionCode: string;
  basin: string | null;
  officialCodes: {
    rainfallAna: string;
    riverLevelAna: string | null;
  };
  geography: {
    level: "official_public_point";
    latitude: number | null;
    longitude: number | null;
  };
  reportedStatus: HydrometStationStatus;
  variables: HydrometVariable[];
  officialAlertNetwork: boolean;
  basicNetwork: boolean;
  installedAt: string | null;
  sourceId: string;
};

export type HydrometMeasurement = {
  stationId: string;
  variable: HydrometVariable;
  value: number | null;
  unit: string | null;
  measurementPeriod: string | null;
  observedAt: string | null;
  officialAlertState: string | null;
  dataState: HydrometDataState;
  sourceId: string;
};

export type HydrometInventorySnapshot = {
  snapshotId: string;
  snapshotKind: "operational_station_inventory";
  methodologyVersion: typeof COMUN_HYDROMET_METHODOLOGY_VERSION;
  verifiedAt: string;
  sourceReportedAt: string | null;
  reportedAcquisitionIntervalMinutes: number;
  territorialScope: {
    municipality: "Volta Redonda";
    hydrographicRegion: string;
    hydrographicRegionCode: string;
  };
  voltaRedondaStationCount: number;
  qualityState: "partial";
  readiness: "PARTIAL_D2A";
  sourceId: string;
  stations: HydrometeorologicalStation[];
  measurements: HydrometMeasurement[];
  limitations: string[];
};

export type HydrometInventoryRow = {
  rainfallStationCode: string;
  riverLevelStationCode: string | null;
  officialName: string;
  stationType: "Plu" | "Plu/Flu";
  riverOrBasin: string | null;
  hydrographicRegion: string;
  hydrographicRegionCode: string;
  basin: string | null;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  officialAlertNetwork: boolean;
  basicNetwork: boolean;
  installedAt: string | null;
};

const manifest = manifestJson as {
  manifestVersion: string;
  sources: HydrometSource[];
};
const inventory = inventoryJson as HydrometInventorySnapshot;

export const COMUN_HYDROMET_SOURCE_MANIFEST = manifest;
export const COMUN_HYDROMET_OPERATIONAL_INVENTORY = inventory;

export function isOfficialHydrometUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_HYDROMET_OFFICIAL_DOMAINS.includes(
        url.hostname as (typeof COMUN_HYDROMET_OFFICIAL_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

export function normalizeHydrometInventoryRow(
  row: HydrometInventoryRow,
  sourceId: string,
): HydrometeorologicalStation {
  return {
    stationId: `hydromet:plu:${row.rainfallStationCode}`,
    officialName: row.officialName.trim(),
    municipality: row.municipality.trim(),
    riverOrBasin: row.riverOrBasin?.trim() || null,
    hydrographicRegion: row.hydrographicRegion.trim(),
    hydrographicRegionCode: row.hydrographicRegionCode.trim(),
    basin: row.basin?.trim() || null,
    officialCodes: {
      rainfallAna: row.rainfallStationCode,
      riverLevelAna: row.riverLevelStationCode,
    },
    geography: {
      level: "official_public_point",
      latitude: row.latitude,
      longitude: row.longitude,
    },
    reportedStatus: "operational_reported",
    variables:
      row.stationType === "Plu/Flu"
        ? ["rainfall", "river_level"]
        : ["rainfall"],
    officialAlertNetwork: row.officialAlertNetwork,
    basicNetwork: row.basicNetwork,
    installedAt: row.installedAt,
    sourceId,
  };
}

export function normalizeHydrometMeasurement(
  measurement: HydrometMeasurement,
): HydrometMeasurement {
  return {
    ...measurement,
    value: measurement.value,
    dataState: measurement.dataState,
  };
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

export function validateHydrometInventorySnapshot(
  snapshot = COMUN_HYDROMET_OPERATIONAL_INVENTORY,
  sources = COMUN_HYDROMET_SOURCE_MANIFEST.sources,
) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();

  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) errors.push(`duplicate_source:${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (!isOfficialHydrometUrl(source.officialUrl)) errors.push(`non_official_url:${source.sourceId}`);
    if (!/^[a-f0-9]{64}$/.test(source.rawSha256)) errors.push(`invalid_hash:${source.sourceId}`);
  }

  if (!sourceIds.has(snapshot.sourceId)) errors.push("missing_inventory_source");
  if (snapshot.snapshotKind !== "operational_station_inventory") errors.push("invalid_snapshot_kind");
  if (snapshot.methodologyVersion !== COMUN_HYDROMET_METHODOLOGY_VERSION) errors.push("invalid_methodology");
  if (snapshot.voltaRedondaStationCount !== snapshot.stations.filter((station) => station.municipality === "Volta Redonda").length) errors.push("volta_redonda_count_mismatch");

  const stationIds = new Set<string>();
  for (const station of snapshot.stations) {
    if (stationIds.has(station.stationId)) errors.push(`duplicate_station:${station.stationId}`);
    stationIds.add(station.stationId);
    if (!/^hydromet:plu:\d+$/.test(station.stationId)) errors.push(`invalid_station_id:${station.stationId}`);
    if (!sourceIds.has(station.sourceId)) errors.push(`missing_station_source:${station.stationId}`);
    if (!validCoordinate(station.geography.latitude, station.geography.longitude)) errors.push(`invalid_coordinate:${station.stationId}`);
    if (!COMUN_HYDROMET_STATION_STATUSES.includes(station.reportedStatus)) errors.push(`invalid_status:${station.stationId}`);
    if (!station.variables.length || station.variables.some((variable) => !COMUN_HYDROMET_VARIABLES.includes(variable))) errors.push(`invalid_variables:${station.stationId}`);
  }

  const measurementIds = new Set<string>();
  for (const measurement of snapshot.measurements) {
    const key = `${measurement.stationId}:${measurement.variable}:${measurement.observedAt ?? "unknown"}`;
    if (measurementIds.has(key)) errors.push(`duplicate_measurement:${key}`);
    measurementIds.add(key);
    if (!stationIds.has(measurement.stationId)) errors.push(`unknown_measurement_station:${measurement.stationId}`);
    if (!sourceIds.has(measurement.sourceId)) errors.push(`missing_measurement_source:${key}`);
  }

  return { ok: errors.length === 0, errors };
}

export type HydrometInventoryDiff = {
  addedStations: string[];
  removedStations: string[];
  statusChanged: string[];
  municipalityChanged: string[];
  coordinatesChanged: string[];
  variablesChanged: string[];
};

export function diffHydrometInventories(
  previous: readonly HydrometeorologicalStation[],
  candidate: readonly HydrometeorologicalStation[],
): HydrometInventoryDiff {
  const before = new Map(previous.map((station) => [station.stationId, station]));
  const after = new Map(candidate.map((station) => [station.stationId, station]));
  const shared = [...before.keys()].filter((stationId) => after.has(stationId));
  const changed = (predicate: (left: HydrometeorologicalStation, right: HydrometeorologicalStation) => boolean) =>
    shared.filter((stationId) => predicate(before.get(stationId)!, after.get(stationId)!)).sort();

  return {
    addedStations: [...after.keys()].filter((stationId) => !before.has(stationId)).sort(),
    removedStations: [...before.keys()].filter((stationId) => !after.has(stationId)).sort(),
    statusChanged: changed((left, right) => left.reportedStatus !== right.reportedStatus),
    municipalityChanged: changed((left, right) => left.municipality !== right.municipality),
    coordinatesChanged: changed(
      (left, right) =>
        left.geography.latitude !== right.geography.latitude ||
        left.geography.longitude !== right.geography.longitude,
    ),
    variablesChanged: changed(
      (left, right) =>
        JSON.stringify([...left.variables].sort()) !==
        JSON.stringify([...right.variables].sort()),
    ),
  };
}
