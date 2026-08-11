import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { catalogSemanticHash, parseOfficialCatalogHtml } from "./transport-catalog-normalizer.mjs";
const manifest = JSON.parse(await readFile(new URL("../../data/comun/transport/source-manifest-v2.json", import.meta.url)));
const allowed = new Set(["www.voltaredonda.rj.gov.br"]);
let drift = false;
for (const source of manifest.sources) {
  if (source.status !== "active") continue;
  if (!source.sourceId || !source.sourceType || !source.sha256 || !source.retrievedAt || !source.publisher || !source.parserVersion || !source.qualityState || !source.status) {
    throw new Error(`COMUN_48_2_C1_SOURCE_METADATA_INVALID:${source.sourceId ?? "unknown"}`);
  }
  const url = new URL(source.officialUrl);
  if (url.protocol !== "https:" || !allowed.has(url.hostname)) throw new Error(`COMUN_48_2_C1_SOURCE_DOMAIN_REJECTED:${source.sourceId}`);
  let bytes;
  try {
    bytes = execFileSync(
      "curl",
      [
        "--fail",
        "--silent",
        "--show-error",
        "--max-redirs",
        "0",
        "--proto",
        "=https",
        "--user-agent",
        "COMUN-source-audit/1.0",
        source.officialUrl,
      ],
      { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    throw new Error(`COMUN_48_2_C1_SOURCE_HTTP_FAILURE:${source.sourceId}`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (source.sourceType === "catalog_html") {
    const catalog = parseOfficialCatalogHtml(bytes.toString("utf8"), source.officialUrl);
    if (!catalog.ok || !source.semanticSha256 || catalogSemanticHash(catalog.records) !== source.semanticSha256) {
      console.log(`COMUN_48_2_C1_OFFICIAL_SOURCE_DRIFT_DETECTED:${source.sourceId}`); drift = true;
    } else if (hash !== source.sha256) {
      console.log(`COMUN_48_2_C1_CATALOG_RENDERING_DRIFT_SEMANTICS_CURRENT:${source.sourceId}`);
    }
  } else if (hash !== source.sha256) { console.log(`COMUN_48_2_C1_OFFICIAL_SOURCE_DRIFT_DETECTED:${source.sourceId}`); drift = true; }
}
if (!drift) {
  console.log("COMUN_48_2_C1_OFFICIAL_SOURCES_CURRENT");
} else {
  process.exitCode = 2;
}
