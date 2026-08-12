import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { locateOfficialPointInTerritorialSector } from "../../lib/comun-public-equipment-sector-locator.mjs";

const CNES_URL = "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos";
const TYPES_URL = "https://apidadosabertos.saude.gov.br/cnes/tipounidades";
const LEGAL_NATURE_URL =
  "https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021";
const MUNICIPALITY = {
  ibgeCode: "3306305",
  cnesCode: "330630",
  name: "Volta Redonda",
  stateCode: "33",
};
const LEGAL_NATURES = {
  "1023": "Órgão Público do Poder Executivo Estadual ou do Distrito Federal",
  "1031": "Órgão Público do Poder Executivo Municipal",
  "1120": "Autarquia Municipal",
};
const PAGE_SIZE = 20;

function argument(name) {
  const entry = process.argv.slice(2).find((value) => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) ?? null;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedText(value) {
  if (value === null || value === undefined) return null;
  const result = String(value).replace(/\s+/g, " ").trim();
  return result || null;
}

function validCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function localDateStamp(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "COMUN-D3B1-controlled-source-capture/1" },
  });
  if (!response.ok) throw new Error(`official_source_http_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchCnesPages() {
  const buffers = [];
  const rows = [];
  for (let offset = 0; offset <= 10_000; offset += PAGE_SIZE) {
    const url = new URL(CNES_URL);
    url.search = new URLSearchParams({
      codigo_uf: MUNICIPALITY.stateCode,
      codigo_municipio: MUNICIPALITY.cnesCode,
      status: "1",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    }).toString();
    const buffer = await fetchBytes(url);
    buffers.push(buffer);
    const page = JSON.parse(buffer.toString("utf8")).estabelecimentos ?? [];
    if (!Array.isArray(page)) throw new Error("invalid_cnes_page_contract");
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return { buffers, rows };
}

function addressFromRow(row) {
  const address = {
    street: normalizedText(row.endereco_estabelecimento),
    number: normalizedText(row.numero_estabelecimento),
    complement: null,
    neighborhoodLabel: normalizedText(row.bairro_estabelecimento),
    postalCode: normalizedText(row.codigo_cep_estabelecimento),
  };
  return Object.values(address).every((value) => value === null) ? null : address;
}

function assertCaptureContract(rows) {
  if (rows.length === 0) throw new Error("empty_cnes_capture");
  for (const row of rows) {
    if (String(row.codigo_uf) !== MUNICIPALITY.stateCode) {
      throw new Error("cnes_uf_filter_drift");
    }
    if (String(row.codigo_municipio) !== MUNICIPALITY.cnesCode) {
      throw new Error("cnes_municipality_filter_drift");
    }
    if (row.codigo_motivo_desabilitacao_estabelecimento !== null) {
      throw new Error("cnes_active_status_contract_drift");
    }
  }
}

const outputDirArgument = argument("--output-dir");
if (!outputDirArgument) throw new Error("missing_--output-dir");
const promote = process.argv.includes("--promote");
const outputDir = resolve(outputDirArgument);
const capturedAt = new Date();
const dateStamp = localDateStamp(capturedAt);
const snapshotId = `comun-public-health-equipment-v1-${dateStamp}`;
const establishmentSourceId = `ms-cnes-establishments-vr-active-${dateStamp}`;
const typesSourceId = `ms-cnes-unit-types-${dateStamp}`;
const legalNatureSourceId = `ibge-concla-legal-nature-2021-${dateStamp}`;

const [{ buffers: pageBuffers, rows }, typesBuffer, legalNatureBuffer, territory] =
  await Promise.all([
    fetchCnesPages(),
    fetchBytes(TYPES_URL),
    fetchBytes(LEGAL_NATURE_URL),
    readFile(
      resolve("data/comun/environment/territory/territorial-base-v1-20260811.json"),
      "utf8",
    ).then(JSON.parse),
  ]);

assertCaptureContract(rows);
const typeRows = JSON.parse(typesBuffer.toString("utf8")).tipos_unidade ?? [];
const typeByCode = new Map(
  typeRows.map((type) => [
    String(type.codigo_tipo_unidade),
    normalizedText(type.descricao_tipo_unidade),
  ]),
);
const publicRows = rows.filter((row) =>
  Object.hasOwn(LEGAL_NATURES, String(row.descricao_natureza_juridica_estabelecimento)),
);

const records = publicRows
  .map((row) => {
    const cnesCode = String(row.codigo_cnes);
    const legalNatureCode = String(row.descricao_natureza_juridica_estabelecimento);
    const cnesUnitTypeCode =
      row.codigo_tipo_unidade === null ? null : String(row.codigo_tipo_unidade);
    if (cnesUnitTypeCode && !typeByCode.has(cnesUnitTypeCode)) {
      throw new Error(`missing_cnes_unit_type:${cnesUnitTypeCode}`);
    }
    const latitude = optionalNumber(row.latitude_estabelecimento_decimo_grau);
    const longitude = optionalNumber(row.longitude_estabelecimento_decimo_grau);
    const hasOfficialPoint = validCoordinate(latitude, longitude);
    const geography = hasOfficialPoint
      ? {
          level: "official_public_point",
          latitude,
          longitude,
          source: "official_source",
        }
      : {
          level: "address_only",
          latitude: null,
          longitude: null,
          source: "official_source",
        };
    const located = hasOfficialPoint
      ? locateOfficialPointInTerritorialSector(
          { latitude, longitude },
          territory.sectors,
        )
      : { state: "not_applicable_address_only" };
    const territorialBinding =
      located.state === "matched"
        ? { state: located.state, sectorCode: located.sectorCode }
        : { state: located.state, sectorCode: null };
    const officialName =
      normalizedText(row.nome_fantasia) ?? normalizedText(row.nome_razao_social);
    if (!officialName) throw new Error(`missing_official_name:${cnesCode}`);
    return {
      equipmentId: `health:cnes:${cnesCode}`,
      cnesCode,
      officialName,
      cnesUnitTypeCode,
      cnesUnitTypeLabel: cnesUnitTypeCode
        ? (typeByCode.get(cnesUnitTypeCode) ?? null)
        : null,
      legalNatureCode,
      legalNatureLabel: LEGAL_NATURES[legalNatureCode],
      managementSphere: normalizedText(row.descricao_esfera_administrativa),
      susRelation: normalizedText(
        row.estabelecimento_faz_atendimento_ambulatorial_sus,
      ),
      municipalityCode: MUNICIPALITY.ibgeCode,
      municipalityName: MUNICIPALITY.name,
      address: addressFromRow(row),
      geography,
      territorialBinding,
      status: "active_reported",
      sourceId: establishmentSourceId,
    };
  })
  .sort((a, b) => a.cnesCode.localeCompare(b.cnesCode));

const officialPointCount = records.filter(
  (record) => record.geography.level === "official_public_point",
).length;
const addressOnlyCount = records.length - officialPointCount;
const sectorMatchedCount = records.filter(
  (record) => record.territorialBinding.state === "matched",
).length;
const boundaryAmbiguousCount = records.filter(
  (record) => record.territorialBinding.state === "boundary_ambiguous",
).length;
const outsideOrGeometryGapCount = records.filter(
  (record) => record.territorialBinding.state === "outside_or_geometry_gap",
).length;
const uniqueCnes = new Set(records.map((record) => record.cnesCode));
if (uniqueCnes.size !== records.length) throw new Error("duplicate_cnes_code");
if (records.length !== officialPointCount + addressOnlyCount) {
  throw new Error("equipment_geography_count_mismatch");
}
if (
  officialPointCount !==
  sectorMatchedCount + boundaryAmbiguousCount + outsideOrGeometryGapCount
) {
  throw new Error("territorial_binding_count_mismatch");
}

const rawCapture = Buffer.concat(
  pageBuffers.flatMap((buffer, index) =>
    index === pageBuffers.length - 1 ? [buffer] : [buffer, Buffer.from("\n")],
  ),
);
const semanticRows = records.map((record) => ({
  cnesCode: record.cnesCode,
  officialName: record.officialName,
  cnesUnitTypeCode: record.cnesUnitTypeCode,
  cnesUnitTypeLabel: record.cnesUnitTypeLabel,
  legalNatureCode: record.legalNatureCode,
  status: record.status,
  address: record.address,
  latitude:
    record.geography.level === "official_public_point"
      ? record.geography.latitude
      : null,
  longitude:
    record.geography.level === "official_public_point"
      ? record.geography.longitude
      : null,
}));
const typeSemanticRows = [...typeByCode.entries()]
  .map(([code, label]) => ({ code, label }))
  .sort((a, b) => a.code.localeCompare(b.code));
const retrievedAt = capturedAt.toISOString();
const sourceManifest = {
  manifestVersion: "comun-public-health-equipment-source-manifest-v1",
  sources: [
    {
      sourceId: establishmentSourceId,
      sourceType: "cnes_active_establishments",
      originalPublisher: "Ministério da Saúde / DATASUS",
      officialUrl: CNES_URL,
      queryContract: {
        codigo_uf: MUNICIPALITY.stateCode,
        codigo_municipio: MUNICIPALITY.cnesCode,
        status: "1",
        pageSize: PAGE_SIZE,
      },
      rawSha256: hash(rawCapture),
      semanticSha256: hash(JSON.stringify(semanticRows)),
      retrievedAt,
      sourceReportedFrom: rows.map((row) => row.data_atualizacao).sort()[0],
      sourceReportedThrough: rows
        .map((row) => row.data_atualizacao)
        .sort()
        .at(-1),
      datasetVersion: "CNES API active establishments",
      parserVersion: "comun-public-health-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
    {
      sourceId: typesSourceId,
      sourceType: "cnes_unit_type_dictionary",
      originalPublisher: "Ministério da Saúde / DATASUS",
      officialUrl: TYPES_URL,
      rawSha256: hash(typesBuffer),
      semanticSha256: hash(JSON.stringify(typeSemanticRows)),
      retrievedAt,
      datasetVersion: "CNES unit type dictionary",
      parserVersion: "comun-public-health-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
    {
      sourceId: legalNatureSourceId,
      sourceType: "legal_nature_dictionary",
      originalPublisher: "IBGE / CONCLA",
      officialUrl: LEGAL_NATURE_URL,
      rawSha256: hash(legalNatureBuffer),
      semanticSha256: hash(JSON.stringify(LEGAL_NATURES)),
      retrievedAt,
      datasetVersion: "Tabela de Natureza Jurídica 2021",
      parserVersion: "comun-public-health-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
  ],
  legalNatureDefinitions: Object.entries(LEGAL_NATURES).map(([code, label]) => ({
    code,
    label,
    sourceId: legalNatureSourceId,
  })),
  unitTypeDefinitions: typeSemanticRows.map(({ code, label }) => ({
    code,
    label,
    sourceId: typesSourceId,
  })),
  automaticPublicationAllowed: false,
};

const diagnostics = {
  recordsFetched: rows.length,
  recordsMunicipality: rows.length,
  recordsActive: rows.length,
  recordsPublicLegalNature: records.length,
  recordsRejectedPrivateNature: rows.length - records.length,
  recordsWithOfficialPoint: officialPointCount,
  recordsAddressOnly: addressOnlyCount,
  recordsMatchedToSector: sectorMatchedCount,
  recordsBoundaryAmbiguous: boundaryAmbiguousCount,
  recordsOutsideGeometry: outsideOrGeometryGapCount,
};
const snapshot = {
  snapshotId,
  previousSnapshotId: null,
  methodologyVersion: "comun-public-health-equipment-snapshot-v1",
  verifiedAt: retrievedAt,
  municipality: MUNICIPALITY,
  sourceIds: sourceManifest.sources.map((source) => source.sourceId),
  territorialSnapshotId: territory.snapshotId,
  equipmentCount: records.length,
  officialPointCount,
  addressOnlyCount,
  sectorMatchedCount,
  boundaryAmbiguousCount,
  outsideOrGeometryGapCount,
  diagnostics,
  records,
  qualityState: "verified_official_public_data",
  readiness: "READY_D3C_HEALTH",
  limitations: [
    "A camada contém somente estabelecimentos ativos cuja natureza jurídica está na allowlist pública D3B0.",
    "Prestadores privados, filantrópicos ou conveniados não entram apenas por atenderem ao SUS.",
    "Coordenadas são preservadas da fonte CNES; nenhuma geocodificação ou correção manual é aplicada.",
    "Vínculo territorial usa apenas ponto oficial e setor censitário D3A; endereço não atribui setor.",
    "Presença territorial não mede cobertura, capacidade, distância, déficit ou exposição ambiental.",
  ],
};
const activeSnapshot = {
  activeSnapshotId: snapshotId,
  activeSnapshotFile: `health-equipment-v1-${dateStamp}.json`,
  promotedAt: retrievedAt,
};

await mkdir(outputDir, { recursive: true });
await writeFile(
  resolve(outputDir, `health-equipment-v1-${dateStamp}.json`),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
await writeFile(
  resolve(outputDir, "source-manifest-v1.json"),
  `${JSON.stringify(sourceManifest, null, 2)}\n`,
);
if (promote) {
  await writeFile(
    resolve(outputDir, "active-snapshot.json"),
    `${JSON.stringify(activeSnapshot, null, 2)}\n`,
  );
}

console.log(
  JSON.stringify(
    {
      snapshotId,
      promoted: promote,
      rawSha256: sourceManifest.sources[0].rawSha256,
      semanticSha256: sourceManifest.sources[0].semanticSha256,
      ...diagnostics,
    },
    null,
    2,
  ),
);
