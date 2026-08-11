import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import {
  catalogSemanticHash,
  compareNormalizedCatalogs,
  parseOfficialCatalogHtml,
  snapshotLinesAsCatalogRecords,
} from "./transport-catalog-normalizer.mjs";

if (!process.argv.includes("--write-reviewed-v2")) {
  throw new Error("COMUN_48_2_C1_R1_EXPLICIT_REVIEW_ARGUMENT_REQUIRED");
}

const catalogUrl = "https://www.voltaredonda.rj.gov.br/horario-de-onibus/";
const root = new URL("../../data/comun/transport/", import.meta.url);
const v1 = JSON.parse(await readFile(new URL("programmed-network-v1.json", root)));
const manifestV1 = JSON.parse(await readFile(new URL("source-manifest-v1.json", root)));
const previous = snapshotLinesAsCatalogRecords(v1.lines);
if (!previous.ok) throw new Error("COMUN_48_2_C1_R1_SNAPSHOT_CATALOG_INVALID");

let html;
try {
  html = execFileSync("curl", ["--fail", "--silent", "--show-error", "--max-redirs", "0", "--proto", "=https", "--user-agent", "COMUN-source-audit/1.0", catalogUrl], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  throw new Error("COMUN_48_2_C1_R1_SOURCE_HTTP_FAILURE:pmvr-bus-catalog");
}
const current = parseOfficialCatalogHtml(html, catalogUrl);
if (!current.ok) throw new Error(`COMUN_48_2_C1_R1_CATALOG_PARSE_CONFLICT:${current.errors.join(",")}`);
const diff = compareNormalizedCatalogs(previous.records, current.records);
if (!diff.semanticDiffEmpty) throw new Error("COMUN_48_2_C1_R1_CATALOG_SEMANTIC_CHANGE_REVIEW_REQUIRED");

const retrievedAt = new Date().toISOString();
const rawSha256 = createHash("sha256").update(html).digest("hex");
const semanticSha256 = catalogSemanticHash(current.records);
const sourceId = "pmvr-bus-catalog-20260811-r1";
const changeSummary = {
  addedLines: 0,
  removedLines: 0,
  changedOperators: 0,
  changedLabels: 0,
  changedTimetables: 0,
  changedItineraries: 0,
  urlComparison: "unavailable_for_v1_catalog_capture",
  semanticDiffEmpty: true,
};
const oldCatalog = manifestV1.sources.find((source) => source.sourceId === v1.catalogSourceId);
const manifestV2 = {
  manifestVersion: "comun-transport-source-manifest-v2",
  previousManifestVersion: manifestV1.manifestVersion,
  sources: manifestV1.sources.map((source) => source.sourceId === oldCatalog.sourceId ? { ...source, status: "superseded" } : source).concat({
    ...oldCatalog,
    sourceId,
    sha256: rawSha256,
    semanticSha256,
    normalizationVersion: "transport-catalog-normalizer-v1",
    retrievedAt,
    status: "active",
    qualityState: "verified_source",
  }),
};
const catalogV2 = {
  catalogId: sourceId,
  previousCatalogId: oldCatalog.sourceId,
  retrievedAt,
  rawSha256,
  semanticSha256,
  normalizationVersion: "transport-catalog-normalizer-v1",
  changeSummary,
  records: current.records,
};
const snapshotV2 = {
  ...v1,
  snapshotId: "comun-transport-programmed-network-v2-20260811",
  previousSnapshotId: v1.snapshotId,
  snapshotDate: retrievedAt.slice(0, 10),
  verifiedAt: retrievedAt,
  catalogSourceId: sourceId,
  methodologyVersion: "comun-transport-programmed-network-v2",
  sourceHistory: { previousCatalogSourceId: oldCatalog.sourceId, activeCatalogSourceId: sourceId },
  changeSummary,
};
const activePointer = {
  activeSnapshotId: snapshotV2.snapshotId,
  previousSnapshotId: v1.snapshotId,
  snapshotFile: "programmed-network-v2.json",
  manifestFile: "source-manifest-v2.json",
  normalizedCatalogFile: "catalog-normalized-v2.json",
};
await Promise.all([
  writeFile(new URL("source-manifest-v2.json", root), JSON.stringify(manifestV2, null, 2) + "\n"),
  writeFile(new URL("catalog-normalized-v2.json", root), JSON.stringify(catalogV2, null, 2) + "\n"),
  writeFile(new URL("programmed-network-v2.json", root), JSON.stringify(snapshotV2, null, 2) + "\n"),
  writeFile(new URL("active-snapshot.json", root), JSON.stringify(activePointer, null, 2) + "\n"),
]);
console.log(JSON.stringify({ result: "COMUN_48_2_C1_R1_V2_MATERIALIZED", snapshotId: snapshotV2.snapshotId, rawSha256, semanticSha256, lineCount: snapshotV2.lineCount }));
