import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  compareNormalizedCatalogs,
  parseOfficialCatalogHtml,
  snapshotLinesAsCatalogRecords,
} from "./transport-catalog-normalizer.mjs";

const catalogUrl = "https://www.voltaredonda.rj.gov.br/horario-de-onibus/";
const snapshot = JSON.parse(await readFile(new URL("../../data/comun/transport/programmed-network-v1.json", import.meta.url)));
const previous = snapshotLinesAsCatalogRecords(snapshot.lines);
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
const summary = {
  result: diff.semanticDiffEmpty
    ? "COMUN_48_2_C1_R1_CATALOG_CONTENT_CHANGED_SEMANTICS_UNCHANGED"
    : "COMUN_48_2_C1_R1_CATALOG_SEMANTIC_CHANGE_REVIEW_REQUIRED",
  previousSnapshotId: snapshot.snapshotId,
  currentCatalogSha256: createHash("sha256").update(html).digest("hex"),
  normalizedLineCount: current.records.length,
  diff,
};
console.log(JSON.stringify(summary));
