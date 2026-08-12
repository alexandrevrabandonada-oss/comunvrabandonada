import activeSnapshotJson from "@/data/comun/environment/territory/active-snapshot.json";
import aggregateDefinitionsJson from "@/data/comun/environment/territory/aggregate-definitions-v1.json";
import snapshotJson from "@/data/comun/environment/territory/territorial-base-v1-20260811.json";
import sourceManifestJson from "@/data/comun/environment/territory/source-manifest-v1.json";

export const COMUN_TERRITORIAL_BASE_METHODOLOGY_VERSION =
  "comun-territorial-public-base-v1" as const;
export const COMUN_TERRITORIAL_BASE_MUNICIPALITY_CODE = "3306305" as const;
export const COMUN_TERRITORIAL_BASE_MUNICIPALITY_NAME =
  "Volta Redonda" as const;
export const COMUN_TERRITORIAL_BASE_OFFICIAL_DOMAINS = [
  "ftp.ibge.gov.br",
  "www.ibge.gov.br",
  "biblioteca.ibge.gov.br",
] as const;
export const COMUN_TERRITORIAL_AGGREGATE_IDS = [
  "populationTotal",
  "householdsTotal",
] as const;

export type TerritorialAggregateId =
  (typeof COMUN_TERRITORIAL_AGGREGATE_IDS)[number];
export type TerritorialAggregateUnit =
  | "people"
  | "households"
  | "percent"
  | "other";
export type TerritorialPosition = readonly [number, number];
export type TerritorialLinearRing = readonly TerritorialPosition[];
export type TerritorialPolygonCoordinates = readonly TerritorialLinearRing[];
export type TerritorialMultiPolygonCoordinates =
  readonly TerritorialPolygonCoordinates[];

export type TerritorialPolygon = {
  type: "Polygon";
  coordinates: TerritorialPolygonCoordinates;
};

export type TerritorialMultiPolygon = {
  type: "MultiPolygon";
  coordinates: TerritorialMultiPolygonCoordinates;
};

export type TerritorialPublicGeometry =
  | TerritorialPolygon
  | TerritorialMultiPolygon;

export type TerritorialSource = {
  sourceId: string;
  sourceType:
    | "census_sector_geometry"
    | "census_sector_aggregates"
    | "census_aggregate_dictionary"
    | "municipal_boundary";
  originalPublisher: "IBGE";
  officialUrl: string;
  contentType: string;
  retrievedAt: string;
  rawSha256: string;
  datasetYear: 2022;
  geographyVersion: "Censo 2022 - setores definitivos";
  sourceKind: "official_public_data";
  automaticPublicationAllowed: false;
  qualityState: "verified_source" | "partial" | "source_gap";
  status: "active" | "superseded";
};

export type TerritorialAggregateDefinition = {
  variableId: TerritorialAggregateId;
  sourceVariableCode: string;
  label: string;
  description: string;
  unit: TerritorialAggregateUnit;
  universe: string;
  sourceId: string;
};

export type TerritorialAggregateValues = {
  populationTotal: number | null;
  householdsTotal: number | null;
};

export type TerritorialPublicSector = {
  canonicalId: `ibge:census-sector:${string}`;
  sectorCode: string;
  municipalityCode: typeof COMUN_TERRITORIAL_BASE_MUNICIPALITY_CODE;
  municipalityName: typeof COMUN_TERRITORIAL_BASE_MUNICIPALITY_NAME;
  censusYear: 2022;
  geography: {
    level: "official_public_area";
    geometry: TerritorialPublicGeometry;
    normalizedGeometryHash: string;
  };
  aggregates: TerritorialAggregateValues;
  sourceId: string;
};

export type TerritorialPublicSnapshot = {
  snapshotId: string;
  previousSnapshotId: string | null;
  methodologyVersion: typeof COMUN_TERRITORIAL_BASE_METHODOLOGY_VERSION;
  censusYear: 2022;
  verifiedAt: string;
  municipality: {
    code: typeof COMUN_TERRITORIAL_BASE_MUNICIPALITY_CODE;
    name: typeof COMUN_TERRITORIAL_BASE_MUNICIPALITY_NAME;
    stateCode: "33";
    stateName: "Rio de Janeiro";
  };
  sectorCount: number;
  sourceIds: string[];
  aggregateDefinitionIds: TerritorialAggregateId[];
  geometryNormalization: {
    sourceCrs: "SIRGAS 2000";
    sourceEpsg: 4674;
    outputCrs: "WGS84 longitude/latitude (RFC 7946)";
    simplified: false;
    simplificationMethod: null;
    tolerance: null;
    areaDifferenceRatio: null;
  };
  diagnostics: {
    populationTotalFromSectors: number;
    householdsTotalFromSectors: number;
    populationTotalMunicipalReference: number;
    householdsTotalMunicipalReference: number;
    populationMatchesMunicipalReference: boolean;
    householdsMatchMunicipalReference: boolean;
    sectorsWithMissingPopulation: number;
    sectorsWithMissingHouseholds: number;
  };
  sectors: TerritorialPublicSector[];
  qualityState: "verified_official_public_data";
  readiness: "READY_D3B";
  limitations: string[];
};

const activeSnapshot = activeSnapshotJson as {
  activeSnapshotId: string;
  activeSnapshotFile: string;
  promotedAt: string;
};
const aggregateDefinitions =
  aggregateDefinitionsJson as TerritorialAggregateDefinition[];
const snapshot = snapshotJson as unknown as TerritorialPublicSnapshot;
const sourceManifest = sourceManifestJson as {
  manifestVersion: string;
  sources: TerritorialSource[];
};

export const COMUN_TERRITORIAL_ACTIVE_SNAPSHOT = activeSnapshot;
export const COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS = aggregateDefinitions;
export const COMUN_TERRITORIAL_PUBLIC_BASE = snapshot;
export const COMUN_TERRITORIAL_SOURCE_MANIFEST = sourceManifest;

export function isOfficialTerritorialSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_TERRITORIAL_BASE_OFFICIAL_DOMAINS.includes(
        url.hostname as (typeof COMUN_TERRITORIAL_BASE_OFFICIAL_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

export function normalizeTerritorialAggregate(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "" || value === ".") {
    return null;
  }
  const normalized =
    typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function positionsFromGeometry(geometry: TerritorialPublicGeometry) {
  return geometry.type === "Polygon"
    ? geometry.coordinates.flat(1)
    : geometry.coordinates.flat(2);
}

function ringsFromGeometry(geometry: TerritorialPublicGeometry) {
  return geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates.flat(1);
}

export function validateTerritorialGeometry(
  geometry: TerritorialPublicGeometry,
) {
  const errors: string[] = [];
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return { ok: false, errors: ["unsupported_geometry_type"] };
  }

  const rings = ringsFromGeometry(geometry);
  if (rings.length === 0) errors.push("empty_geometry");

  for (const [ringIndex, ring] of rings.entries()) {
    if (ring.length < 4) errors.push(`ring_too_short:${ringIndex}`);
    for (const [positionIndex, position] of ring.entries()) {
      if (
        position.length < 2 ||
        !Number.isFinite(position[0]) ||
        !Number.isFinite(position[1]) ||
        position[0] < -180 ||
        position[0] > 180 ||
        position[1] < -90 ||
        position[1] > 90
      ) {
        errors.push(`invalid_coordinate:${ringIndex}:${positionIndex}`);
      }
    }
    if (
      ring.length >= 2 &&
      (ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1])
    ) {
      errors.push(`open_ring:${ringIndex}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function validAggregate(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 0);
}

export function validateTerritorialPublicBase(
  candidate = COMUN_TERRITORIAL_PUBLIC_BASE,
  sources = COMUN_TERRITORIAL_SOURCE_MANIFEST.sources,
  definitions = COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS,
) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();

  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) {
      errors.push(`duplicate_source:${source.sourceId}`);
    }
    sourceIds.add(source.sourceId);
    if (!isOfficialTerritorialSourceUrl(source.officialUrl)) {
      errors.push(`non_official_url:${source.sourceId}`);
    }
    if (!/^[a-f0-9]{64}$/.test(source.rawSha256)) {
      errors.push(`invalid_hash:${source.sourceId}`);
    }
    if (source.sourceKind !== "official_public_data") {
      errors.push(`invalid_source_kind:${source.sourceId}`);
    }
    if (source.automaticPublicationAllowed !== false) {
      errors.push(`automatic_publication_not_disabled:${source.sourceId}`);
    }
  }

  const definitionIds = new Set<TerritorialAggregateId>();
  for (const definition of definitions) {
    if (definitionIds.has(definition.variableId)) {
      errors.push(`duplicate_definition:${definition.variableId}`);
    }
    definitionIds.add(definition.variableId);
    if (!COMUN_TERRITORIAL_AGGREGATE_IDS.includes(definition.variableId)) {
      errors.push(`unsupported_definition:${definition.variableId}`);
    }
    if (!sourceIds.has(definition.sourceId)) {
      errors.push(`missing_definition_source:${definition.variableId}`);
    }
  }

  if (candidate.snapshotId !== COMUN_TERRITORIAL_ACTIVE_SNAPSHOT.activeSnapshotId) {
    errors.push("active_snapshot_mismatch");
  }
  if (candidate.methodologyVersion !== COMUN_TERRITORIAL_BASE_METHODOLOGY_VERSION) {
    errors.push("invalid_methodology");
  }
  if (
    candidate.municipality.code !== COMUN_TERRITORIAL_BASE_MUNICIPALITY_CODE ||
    candidate.municipality.name !== COMUN_TERRITORIAL_BASE_MUNICIPALITY_NAME
  ) {
    errors.push("invalid_municipality");
  }
  if (candidate.sectorCount !== candidate.sectors.length) {
    errors.push("sector_count_mismatch");
  }
  if (candidate.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
    errors.push("missing_snapshot_source");
  }
  if (
    candidate.aggregateDefinitionIds.some(
      (definitionId) => !definitionIds.has(definitionId),
    )
  ) {
    errors.push("missing_snapshot_definition");
  }

  const sectorCodes = new Set<string>();
  let populationTotal = 0;
  let householdsTotal = 0;
  let missingPopulation = 0;
  let missingHouseholds = 0;

  for (const sector of candidate.sectors) {
    if (sectorCodes.has(sector.sectorCode)) {
      errors.push(`duplicate_sector:${sector.sectorCode}`);
    }
    sectorCodes.add(sector.sectorCode);
    if (!/^3306305\d{8}$/.test(sector.sectorCode)) {
      errors.push(`invalid_sector_code:${sector.sectorCode}`);
    }
    if (sector.canonicalId !== `ibge:census-sector:${sector.sectorCode}`) {
      errors.push(`invalid_canonical_id:${sector.sectorCode}`);
    }
    if (
      sector.municipalityCode !== COMUN_TERRITORIAL_BASE_MUNICIPALITY_CODE ||
      sector.municipalityName !== COMUN_TERRITORIAL_BASE_MUNICIPALITY_NAME
    ) {
      errors.push(`sector_outside_municipality:${sector.sectorCode}`);
    }
    if (sector.geography.level !== "official_public_area") {
      errors.push(`invalid_geography_level:${sector.sectorCode}`);
    }
    const geometry = validateTerritorialGeometry(sector.geography.geometry);
    if (!geometry.ok) {
      errors.push(
        ...geometry.errors.map((error) => `${error}:${sector.sectorCode}`),
      );
    }
    if (!/^[a-f0-9]{64}$/.test(sector.geography.normalizedGeometryHash)) {
      errors.push(`invalid_geometry_hash:${sector.sectorCode}`);
    }
    if (!validAggregate(sector.aggregates.populationTotal)) {
      errors.push(`invalid_population:${sector.sectorCode}`);
    }
    if (!validAggregate(sector.aggregates.householdsTotal)) {
      errors.push(`invalid_households:${sector.sectorCode}`);
    }
    if (!sourceIds.has(sector.sourceId)) {
      errors.push(`missing_sector_source:${sector.sectorCode}`);
    }

    if (sector.aggregates.populationTotal === null) missingPopulation += 1;
    else populationTotal += sector.aggregates.populationTotal;
    if (sector.aggregates.householdsTotal === null) missingHouseholds += 1;
    else householdsTotal += sector.aggregates.householdsTotal;
  }

  if (populationTotal !== candidate.diagnostics.populationTotalFromSectors) {
    errors.push("population_diagnostic_mismatch");
  }
  if (householdsTotal !== candidate.diagnostics.householdsTotalFromSectors) {
    errors.push("households_diagnostic_mismatch");
  }
  if (
    missingPopulation !== candidate.diagnostics.sectorsWithMissingPopulation ||
    missingHouseholds !== candidate.diagnostics.sectorsWithMissingHouseholds
  ) {
    errors.push("missing_aggregate_diagnostic_mismatch");
  }
  if (
    candidate.diagnostics.populationMatchesMunicipalReference !==
    (populationTotal ===
      candidate.diagnostics.populationTotalMunicipalReference)
  ) {
    errors.push("population_reference_flag_mismatch");
  }
  if (
    candidate.diagnostics.householdsMatchMunicipalReference !==
    (householdsTotal ===
      candidate.diagnostics.householdsTotalMunicipalReference)
  ) {
    errors.push("households_reference_flag_mismatch");
  }

  return { ok: errors.length === 0, errors };
}

export type TerritorialSemanticDiff = {
  sectorAdded: string[];
  sectorRemoved: string[];
  sectorCodeChanged: string[];
  geometryChanged: string[];
  aggregateChanged: string[];
  definitionChanged: string[];
};

export type TerritorialSourceDiff = {
  sourceAdded: string[];
  sourceRemoved: string[];
  rawHashChanged: string[];
};

export function diffTerritorialSources(
  previousSources: readonly TerritorialSource[],
  candidateSources: readonly TerritorialSource[],
): TerritorialSourceDiff {
  const previousById = new Map(
    previousSources.map((source) => [source.sourceId, source]),
  );
  const candidateById = new Map(
    candidateSources.map((source) => [source.sourceId, source]),
  );
  const sharedSourceIds = [...previousById.keys()].filter((sourceId) =>
    candidateById.has(sourceId),
  );

  return {
    sourceAdded: [...candidateById.keys()]
      .filter((sourceId) => !previousById.has(sourceId))
      .sort(),
    sourceRemoved: [...previousById.keys()]
      .filter((sourceId) => !candidateById.has(sourceId))
      .sort(),
    rawHashChanged: sharedSourceIds
      .filter(
        (sourceId) =>
          previousById.get(sourceId)!.rawSha256 !==
          candidateById.get(sourceId)!.rawSha256,
      )
      .sort(),
  };
}

export function diffTerritorialPublicBases(
  previousSectors: readonly TerritorialPublicSector[],
  candidateSectors: readonly TerritorialPublicSector[],
  previousDefinitions: readonly TerritorialAggregateDefinition[],
  candidateDefinitions: readonly TerritorialAggregateDefinition[],
): TerritorialSemanticDiff {
  const previousById = new Map(
    previousSectors.map((sector) => [sector.canonicalId, sector]),
  );
  const candidateById = new Map(
    candidateSectors.map((sector) => [sector.canonicalId, sector]),
  );
  const sharedSectorIds = [...previousById.keys()].filter((id) =>
    candidateById.has(id),
  );
  const changedSectors = (
    predicate: (
      previous: TerritorialPublicSector,
      candidate: TerritorialPublicSector,
    ) => boolean,
  ) =>
    sharedSectorIds
      .filter((id) =>
        predicate(previousById.get(id)!, candidateById.get(id)!),
      )
      .sort();

  const previousDefinitionById = new Map(
    previousDefinitions.map((definition) => [definition.variableId, definition]),
  );
  const candidateDefinitionById = new Map(
    candidateDefinitions.map((definition) => [definition.variableId, definition]),
  );
  const sharedDefinitionIds = [...previousDefinitionById.keys()].filter((id) =>
    candidateDefinitionById.has(id),
  );

  return {
    sectorAdded: [...candidateById.keys()]
      .filter((id) => !previousById.has(id))
      .sort(),
    sectorRemoved: [...previousById.keys()]
      .filter((id) => !candidateById.has(id))
      .sort(),
    sectorCodeChanged: changedSectors(
      (previous, candidate) => previous.sectorCode !== candidate.sectorCode,
    ),
    geometryChanged: changedSectors(
      (previous, candidate) =>
        previous.geography.normalizedGeometryHash !==
        candidate.geography.normalizedGeometryHash,
    ),
    aggregateChanged: changedSectors(
      (previous, candidate) =>
        JSON.stringify(previous.aggregates) !==
        JSON.stringify(candidate.aggregates),
    ),
    definitionChanged: sharedDefinitionIds
      .filter(
        (id) =>
          JSON.stringify(previousDefinitionById.get(id)) !==
          JSON.stringify(candidateDefinitionById.get(id)),
      )
      .sort(),
  };
}

export function territorialGeometryBounds(
  geometry: TerritorialPublicGeometry,
) {
  const positions = positionsFromGeometry(geometry);
  return {
    minLongitude: Math.min(...positions.map(([longitude]) => longitude)),
    maxLongitude: Math.max(...positions.map(([longitude]) => longitude)),
    minLatitude: Math.min(...positions.map(([, latitude]) => latitude)),
    maxLatitude: Math.max(...positions.map(([, latitude]) => latitude)),
  };
}
