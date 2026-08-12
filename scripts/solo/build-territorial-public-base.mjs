import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

globalThis.self = globalThis;
const { default: shp } = await import("shpjs");

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
const MUNICIPALITY_CODE = "3306305";
const MUNICIPALITY_NAME = "Volta Redonda";
const SNAPSHOT_ID = "comun-territorial-public-base-v1-20260811";
const SECTOR_SOURCE_ID =
  "ibge-census-2022-rj-sector-geometry-basic-20241113";
const DICTIONARY_SOURCE_ID =
  "ibge-census-2022-aggregate-dictionary-20260520";
const MUNICIPAL_SOURCE_ID = "ibge-census-2022-municipal-basic-20260520";

function parseArguments(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`invalid_argument:${key ?? "missing"}`);
    }
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

function requiredArgument(argumentsMap, name) {
  const value = argumentsMap.get(name);
  if (!value) throw new Error(`missing_argument:${name}`);
  return path.resolve(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeAggregate(value) {
  if (value === null || value === undefined || value === "" || value === ".") {
    return null;
  }
  const normalized =
    typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function parseSemicolonCsv(source) {
  const decodeCell = (value) => {
    const trimmed = value.trim();
    return trimmed.startsWith('"') && trimmed.endsWith('"')
      ? trimmed.slice(1, -1).replace(/""/g, '"')
      : trimmed;
  };
  const rows = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(";").map(decodeCell));
  const headers = rows.shift();
  if (!headers) return [];
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ),
  );
}

function serializeSnapshot(snapshot) {
  const marker = "__COMUN_TERRITORIAL_SECTORS__";
  const formatted = JSON.stringify({ ...snapshot, sectors: marker }, null, 2);
  const sectors =
    "[\n" +
    snapshot.sectors
      .map((sector) => `    ${JSON.stringify(sector)}`)
      .join(",\n") +
    "\n  ]";
  return `${formatted.replace(`"${marker}"`, sectors)}\n`;
}

const argumentsMap = parseArguments(process.argv.slice(2));
const sectorZipPath = requiredArgument(argumentsMap, "sector-zip");
const dictionaryPath = requiredArgument(argumentsMap, "dictionary-xlsx");
const municipalZipPath = requiredArgument(argumentsMap, "municipal-zip");
const municipalCsvPath = requiredArgument(argumentsMap, "municipal-csv");
const outputPath = path.resolve(
  argumentsMap.get("output") ??
    path.join(
      REPOSITORY_ROOT,
      "data/comun/environment/territory/territorial-base-v1-20260811.json",
    ),
);

const manifest = JSON.parse(
  await fs.readFile(
    path.join(
      REPOSITORY_ROOT,
      "data/comun/environment/territory/source-manifest-v1.json",
    ),
    "utf8",
  ),
);
const sourceById = new Map(
  manifest.sources.map((source) => [source.sourceId, source]),
);
const inputs = [
  [SECTOR_SOURCE_ID, sectorZipPath],
  [DICTIONARY_SOURCE_ID, dictionaryPath],
  [MUNICIPAL_SOURCE_ID, municipalZipPath],
];

for (const [sourceId, sourcePath] of inputs) {
  const source = sourceById.get(sourceId);
  if (!source) throw new Error(`missing_manifest_source:${sourceId}`);
  const actualHash = sha256(await fs.readFile(sourcePath));
  if (actualHash !== source.rawSha256) {
    throw new Error(`source_hash_mismatch:${sourceId}`);
  }
}

const parsedShapefile = await shp(await fs.readFile(sectorZipPath));
const collections = Array.isArray(parsedShapefile)
  ? parsedShapefile
  : [parsedShapefile];
const sourceFeatures = collections.flatMap(
  (collection) => collection.features ?? [],
);
const sectors = sourceFeatures
  .filter(
    (feature) => String(feature.properties?.CD_MUN) === MUNICIPALITY_CODE,
  )
  .map((feature) => {
    const properties = feature.properties ?? {};
    const sectorCode = String(properties.CD_SETOR ?? "");
    const sourceGeometry = feature.geometry;
    if (
      sourceGeometry?.type !== "Polygon" &&
      sourceGeometry?.type !== "MultiPolygon"
    ) {
      throw new Error(`unsupported_geometry:${sectorCode}`);
    }
    const geometry = {
      type: sourceGeometry.type,
      coordinates: sourceGeometry.coordinates,
    };
    return {
      canonicalId: `ibge:census-sector:${sectorCode}`,
      sectorCode,
      municipalityCode: MUNICIPALITY_CODE,
      municipalityName: MUNICIPALITY_NAME,
      censusYear: 2022,
      geography: {
        level: "official_public_area",
        geometry,
        normalizedGeometryHash: sha256(JSON.stringify(geometry)),
      },
      aggregates: {
        populationTotal: normalizeAggregate(properties.v0001),
        householdsTotal: normalizeAggregate(properties.v0002),
      },
      sourceId: SECTOR_SOURCE_ID,
    };
  })
  .sort((left, right) => left.sectorCode.localeCompare(right.sectorCode));

const municipalCsv = new TextDecoder("windows-1252").decode(
  await fs.readFile(municipalCsvPath),
);
const municipalReference = parseSemicolonCsv(municipalCsv).find(
  (row) => row.CD_MUN === MUNICIPALITY_CODE,
);
if (!municipalReference) throw new Error("municipal_reference_missing");

const populationTotalFromSectors = sectors.reduce(
  (sum, sector) => sum + (sector.aggregates.populationTotal ?? 0),
  0,
);
const householdsTotalFromSectors = sectors.reduce(
  (sum, sector) => sum + (sector.aggregates.householdsTotal ?? 0),
  0,
);
const populationTotalMunicipalReference = normalizeAggregate(
  municipalReference.v0001,
);
const householdsTotalMunicipalReference = normalizeAggregate(
  municipalReference.v0002,
);
if (
  populationTotalMunicipalReference === null ||
  householdsTotalMunicipalReference === null
) {
  throw new Error("municipal_reference_aggregate_missing");
}

const snapshot = {
  snapshotId: SNAPSHOT_ID,
  previousSnapshotId: null,
  methodologyVersion: "comun-territorial-public-base-v1",
  censusYear: 2022,
  verifiedAt: "2026-08-12T00:13:25.766Z",
  municipality: {
    code: MUNICIPALITY_CODE,
    name: MUNICIPALITY_NAME,
    stateCode: "33",
    stateName: "Rio de Janeiro",
  },
  sectorCount: sectors.length,
  sourceIds: [SECTOR_SOURCE_ID, DICTIONARY_SOURCE_ID, MUNICIPAL_SOURCE_ID],
  aggregateDefinitionIds: ["populationTotal", "householdsTotal"],
  geometryNormalization: {
    sourceCrs: "SIRGAS 2000",
    sourceEpsg: 4674,
    outputCrs: "WGS84 longitude/latitude (RFC 7946)",
    simplified: false,
    simplificationMethod: null,
    tolerance: null,
    areaDifferenceRatio: null,
  },
  diagnostics: {
    populationTotalFromSectors,
    householdsTotalFromSectors,
    populationTotalMunicipalReference,
    householdsTotalMunicipalReference,
    populationMatchesMunicipalReference:
      populationTotalFromSectors === populationTotalMunicipalReference,
    householdsMatchMunicipalReference:
      householdsTotalFromSectors === householdsTotalMunicipalReference,
    sectorsWithMissingPopulation: sectors.filter(
      (sector) => sector.aggregates.populationTotal === null,
    ).length,
    sectorsWithMissingHouseholds: sectors.filter(
      (sector) => sector.aggregates.householdsTotal === null,
    ).length,
  },
  sectors,
  qualityState: "verified_official_public_data",
  readiness: "READY_D3B",
  limitations: [
    "A base representa setores censitários e não bairros.",
    "Somente os agregados básicos V0001 e V0002 foram incluídos; outras variáveis exigem contrato próprio.",
    "A geometria foi normalizada para GeoJSON sem simplificação, fusão ou eliminação de setores.",
    "Nenhum índice social, densidade, risco ou exposição ambiental foi calculado.",
    "A base não contém Relata, Carteira, localização privada, anexos, conta ou forwarding.",
    "COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER",
  ],
};

if (!snapshot.diagnostics.populationMatchesMunicipalReference) {
  throw new Error("population_total_does_not_match_municipal_reference");
}
if (!snapshot.diagnostics.householdsMatchMunicipalReference) {
  throw new Error("households_total_does_not_match_municipal_reference");
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, serializeSnapshot(snapshot), "utf8");
console.log(
  JSON.stringify({
    outputPath,
    snapshotId: snapshot.snapshotId,
    sectorCount: snapshot.sectorCount,
    populationTotalFromSectors,
    householdsTotalFromSectors,
    sourceHashVerification: "green",
  }),
);
