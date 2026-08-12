import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const CADSUAS_SEARCH_URL =
  "https://aplicacoes.mds.gov.br/cadsuas/pesquisarConsultaExterna.html";
const SMAS_DIRECTORY_URL =
  "https://smas.voltaredonda.rj.gov.br/a-secretaria/telefones-das-unidades";
const CRAS_ACTIVITY_URL =
  "https://www.voltaredonda.rj.gov.br/comunicacao/noticias/15-smac/12021-prefeitura-de-volta-redonda-promove-temporada-de-festas-juninas-e-julinas-nos-cras-e-centros-de-conviv%C3%AAncia/";
const CREAS_ACTIVITY_URL =
  "https://www.voltaredonda.rj.gov.br/comunicacao/noticias/15-smac/11943-creas-de-volta-redonda-j%C3%A1-realizou-mais-de-mil-atendimentos-em-2026-e-fortalece-prote%C3%A7%C3%A3o-social-no-munic%C3%ADpio/";
const MUNICIPALITY = { ibgeCode: "3306305", name: "Volta Redonda" };
const USER_AGENT = "COMUN-D3B2-controlled-source-capture/1";

function argument(name) {
  const entry = process.argv.slice(2).find((value) => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) ?? null;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => ({
      amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    })[entity.toLowerCase()]);
}

function text(value) {
  const normalized = decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

function canonical(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function localDateStamp(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function stripPhones(value) {
  return value
    .replace(/\(?\d{2}\)?\s*\d{4,5}-\d{4}(?:\s*ramal\s*\d+)?/gi, " ")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+-\s+-/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function addressFromMunicipalDirectory(details) {
  const withoutPhones = stripPhones(details);
  const addressMatch = withoutPhones.match(
    /((?:rua|avenida|av\.?|estrada|travessa|rodovia)\b.+)$/i,
  );
  const published = text(addressMatch?.[1] ?? "");
  if (!published) return null;
  const parts = published.match(
    /^(?<street>.*?)(?:,\s*|\s+)(?:n[ºo°\.]?\s*)?(?<number>s\/?n[ºo°\.]?|\d+)(?:\s*[,–-]\s*(?<neighborhood>.+))?$/i,
  );
  return {
    street: text(parts?.groups?.street ?? published),
    number: text(parts?.groups?.number ?? ""),
    complement: null,
    neighborhoodLabel: text(parts?.groups?.neighborhood ?? ""),
    postalCode: null,
  };
}

function extractCadsuasRows(html) {
  return [...html.matchAll(
    /visualizarEntidadeConsultaExterna\.html\?aba=dados_cadastrais&codigo=(?<code>\d+)"[^>]*>\s*(?<name>[^<]+)/g,
  )].map((match) => ({
    cadsuasCode: match.groups.code,
    officialName: text(match.groups.name),
  })).filter((row) => row.officialName !== null);
}

function extractMunicipalDirectory(html) {
  const pattern = /font-weight:\s*700;">(?<name>.*?)<\/span><span[^>]*>(?<details>.*?)<\/span>/gs;
  return [...html.matchAll(pattern)].map((match) => ({
    officialName: text(match.groups.name),
    address: addressFromMunicipalDirectory(text(match.groups.details) ?? ""),
  })).filter((row) => row.officialName !== null);
}

function currentCrasNames(crasActivity) {
  const match = crasActivity.match(/acontecem nos\s+Cras\s+(.+?),\s+além dos/i);
  if (!match) return new Set();
  return new Set(
    match[1]
      .split(/,|\se\s/i)
      .map((name) => canonical(`CRAS ${name}`))
      .filter(Boolean),
  );
}

function activeSourceFor(record, activeCras, creasActivity) {
  if (record.equipmentType === "cras") {
    return activeCras.has(canonical(record.officialName))
      ? "pmvr-smas-cras-activity-2026-06-10"
      : null;
  }
  if (record.equipmentType === "creas") {
    return canonical(creasActivity).includes("creas")
      ? "pmvr-smas-creas-activity-2026-05-25"
      : null;
  }
  return null;
}

function typeFromName(name) {
  const value = canonical(name);
  if (value.startsWith("cras")) return "cras";
  if (value.startsWith("creas")) return "creas";
  return null;
}

function semanticDirectoryRows(rows) {
  return rows
    .map((row) => ({
      cadsuasCode: row.cadsuasCode,
      officialName: row.officialName,
    }))
    .sort((a, b) => a.cadsuasCode.localeCompare(b.cadsuasCode));
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "user-agent": USER_AGENT, ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`official_source_http_${response.status}`);
  return {
    text: await response.text(),
    cookies: response.headers.getSetCookie?.().map((value) => value.split(";", 1)[0]) ?? [],
  };
}

async function fetchRemoteInputs() {
  const form = await fetchText(CADSUAS_SEARCH_URL);
  const cookie = form.cookies.join("; ");
  const body = new URLSearchParams({
    "consultaExternaHelper.tipoBusca": "ent",
    "consultaExternaHelper.endereco.municipio.uf.sigla": "RJ",
    "consultaExternaHelper.endereco.municipio.id": "5484",
    "consultaExternaHelper.cpfcnpj": "",
    "consultaExternaHelper.nomeEntidade": "",
    "consultaExternaHelper.tipoEntidade.id": "",
    "consultaExternaHelper.possuiCeas": "0",
  });
  await fetchText(CADSUAS_SEARCH_URL, {
    method: "POST",
    body,
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
  });
  const query = new URLSearchParams({
    "consultaExternaHelper.endereco.municipio.id": "5484",
    "consultaExternaHelper.cpfcnpj": "",
    "consultaExternaHelper.nomeEntidade": "",
    "consultaExternaHelper.endereco.municipio.uf.sigla": "RJ",
    "consultaExternaHelper.tipoBusca": "ent",
    "consultaExternaHelper.tipoEntidade.id": "",
    "consultaExternaHelper.possuiCeas": "0",
  });
  const cadsuasPages = await Promise.all(
    Array.from({ length: 5 }, async (_, index) => {
      const pageQuery = new URLSearchParams(query);
      if (index > 0) pageQuery.set("d-5461696-p", String(index + 1));
      return (await fetchText(`${CADSUAS_SEARCH_URL}?${pageQuery}`, { headers: { cookie } })).text;
    }),
  );
  const [smasDirectory, crasActivity, creasActivity] = await Promise.all([
    fetchText(SMAS_DIRECTORY_URL).then((response) => response.text),
    fetchText(CRAS_ACTIVITY_URL).then((response) => response.text),
    fetchText(CREAS_ACTIVITY_URL).then((response) => response.text),
  ]);
  return { cadsuasPages, smasDirectory, crasActivity, creasActivity };
}

async function readInputs(inputDir) {
  if (!inputDir) return fetchRemoteInputs();
  const directory = resolve(inputDir);
  return {
    cadsuasPages: await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        readFile(resolve(directory, `cadsuas-page-${index + 1}.html`), "utf8"),
      ),
    ),
    smasDirectory: await readFile(resolve(directory, "smas.html"), "utf8"),
    crasActivity: await readFile(resolve(directory, "cras-status.html"), "utf8"),
    creasActivity: await readFile(resolve(directory, "creas-status.html"), "utf8"),
  };
}

const outputDirArgument = argument("--output-dir");
if (!outputDirArgument) throw new Error("missing_--output-dir");
const promote = process.argv.includes("--promote");
const outputDir = resolve(outputDirArgument);
const capturedAt = new Date();
const dateStamp = localDateStamp(capturedAt);
const inputs = await readInputs(argument("--input-dir"));
const cadsuasRows = inputs.cadsuasPages.flatMap(extractCadsuasRows);
if (cadsuasRows.length !== 89 || new Set(cadsuasRows.map((row) => row.cadsuasCode)).size !== 89) {
  throw new Error("cadsuas_public_directory_contract_drift");
}
const municipalRows = extractMunicipalDirectory(inputs.smasDirectory);
const municipalByName = new Map(municipalRows.map((row) => [canonical(row.officialName), row]));
const crasActivity = text(inputs.crasActivity) ?? "";
const creasActivity = text(inputs.creasActivity) ?? "";
const activeCras = currentCrasNames(crasActivity);
const cadsuasSourceId = `mds-cadsuas-vr-public-directory-${dateStamp}`;
const directorySourceId = `pmvr-smas-units-directory-${dateStamp}`;

const records = cadsuasRows
  .map((row) => {
    const equipmentType = typeFromName(row.officialName);
    const municipal = municipalByName.get(canonical(row.officialName));
    if (!equipmentType || !municipal?.address) return null;
    const record = {
      equipmentId: `social-assistance:cadsuas:${row.cadsuasCode}`,
      cadsuasCode: row.cadsuasCode,
      officialName: row.officialName,
      equipmentType,
      management: "public_municipal",
      municipalityCode: MUNICIPALITY.ibgeCode,
      municipalityName: MUNICIPALITY.name,
      address: municipal.address,
      addressPublication: "public",
      geography: {
        level: "address_only",
        latitude: null,
        longitude: null,
        source: "official_source",
      },
      territorialBinding: {
        state: "not_applicable_address_only",
        sectorCode: null,
      },
      status: "active_reported",
      sourceId: cadsuasSourceId,
    };
    return activeSourceFor(record, activeCras, creasActivity) ? record : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.cadsuasCode.localeCompare(b.cadsuasCode));

if (records.length === 0) throw new Error("no_corrobated_public_social_equipment");
if (new Set(records.map((record) => record.cadsuasCode)).size !== records.length) {
  throw new Error("duplicate_cadsuas_code");
}
const rawCadsuas = Buffer.from(inputs.cadsuasPages.join("\n"));
const retrievedAt = capturedAt.toISOString();
const manifest = {
  manifestVersion: "comun-public-social-assistance-equipment-source-manifest-v1",
  sources: [
    {
      sourceId: cadsuasSourceId,
      sourceType: "cadsuas_public_directory",
      originalPublisher: "Ministério do Desenvolvimento e Assistência Social, Família e Combate à Fome",
      officialUrl: CADSUAS_SEARCH_URL,
      rawSha256: sha256(rawCadsuas),
      semanticSha256: sha256(JSON.stringify(semanticDirectoryRows(cadsuasRows))),
      retrievedAt,
      datasetVersion: "CadSUAS consulta externa — Volta Redonda/RJ",
      parserVersion: "comun-public-social-assistance-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
    {
      sourceId: directorySourceId,
      sourceType: "municipal_units_directory",
      originalPublisher: "Secretaria Municipal de Assistência Social de Volta Redonda",
      officialUrl: SMAS_DIRECTORY_URL,
      rawSha256: sha256(inputs.smasDirectory),
      semanticSha256: sha256(JSON.stringify(municipalRows.map((row) => ({ officialName: row.officialName, address: row.address })))),
      retrievedAt,
      datasetVersion: "Diretório público de unidades SMAS",
      parserVersion: "comun-public-social-assistance-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
    {
      sourceId: "pmvr-smas-cras-activity-2026-06-10",
      sourceType: "municipal_current_activity_publication",
      originalPublisher: "Prefeitura Municipal de Volta Redonda / SMAS",
      officialUrl: CRAS_ACTIVITY_URL,
      rawSha256: sha256(inputs.crasActivity),
      semanticSha256: sha256(canonical(text(inputs.crasActivity) ?? "")),
      retrievedAt,
      datasetVersion: "Publicação municipal de atividade CRAS em 2026",
      parserVersion: "comun-public-social-assistance-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
    {
      sourceId: "pmvr-smas-creas-activity-2026-05-25",
      sourceType: "municipal_current_activity_publication",
      originalPublisher: "Prefeitura Municipal de Volta Redonda / SMAS",
      officialUrl: CREAS_ACTIVITY_URL,
      rawSha256: sha256(inputs.creasActivity),
      semanticSha256: sha256(canonical(text(inputs.creasActivity) ?? "")),
      retrievedAt,
      datasetVersion: "Publicação municipal de atividade CREAS em 2026",
      parserVersion: "comun-public-social-assistance-equipment-capture-v1",
      status: "verified",
      previousSourceId: null,
    },
  ],
  automaticPublicationAllowed: false,
};
const snapshotId = `comun-public-social-assistance-equipment-v1-${dateStamp}`;
const snapshot = {
  snapshotId,
  previousSnapshotId: null,
  methodologyVersion: "comun-public-social-assistance-equipment-snapshot-v1",
  verifiedAt: retrievedAt,
  municipality: MUNICIPALITY,
  sourceIds: manifest.sources.map((source) => source.sourceId),
  equipmentCount: records.length,
  addressOnlyCount: records.length,
  officialPointCount: 0,
  sectorMatchedCount: 0,
  boundaryAmbiguousCount: 0,
  outsideOrGeometryGapCount: 0,
  diagnostics: {
    cadsuasRows: cadsuasRows.length,
    municipalDirectoryRows: municipalRows.length,
    recordsWithCadsuasId: cadsuasRows.length,
    recordsMatchedMunicipalDirectory: records.length,
    recordsActiveReported: records.length,
    recordsPublicManagement: records.length,
    recordsAddressPublic: records.length,
    recordsAddressRestricted: 0,
    recordsAddressUnknown: 0,
    recordsAddressOnly: records.length,
    recordsWithOfficialPoint: 0,
    recordsWithoutSectorBinding: records.length,
    excludedNoMunicipalCorroboration: cadsuasRows.length - records.length,
    sourceConflicts: 1,
  },
  records,
  qualityState: "verified_official_public_data",
  readiness: "READY_D3C_SOCIAL_ASSISTANCE",
  limitations: [
    "Somente unidades com identidade CadSUAS, diretório municipal e evidência municipal recente de atividade entram nesta versão.",
    "Não há coordenadas oficiais: todos os registros são address_only e não recebem setor censitário.",
    "Centro POP foi excluído por conflito de endereço entre fontes oficiais até revisão específica.",
    "Endereços restritos por fonte não são reconstruídos nem inferidos.",
  ],
};

if (snapshot.equipmentCount !== snapshot.addressOnlyCount || snapshot.officialPointCount !== 0) {
  throw new Error("address_only_invariant_failed");
}

if (promote) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, `social-assistance-equipment-v1-${dateStamp}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(resolve(outputDir, "source-manifest-v1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(resolve(outputDir, "active-snapshot.json"), `${JSON.stringify({ activeSnapshotId: snapshotId, activeSnapshotFile: `social-assistance-equipment-v1-${dateStamp}.json`, promotedAt: retrievedAt }, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify({ snapshotId, records: records.length, promote }, null, 2)}\n`);
