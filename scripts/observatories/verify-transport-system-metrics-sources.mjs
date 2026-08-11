import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(new URL("../../data/comun/transport/system-metrics-sources-v1.json", import.meta.url)),
);
const allowedDomains = new Set([
  "mobilidadeurbana.voltaredonda.rj.gov.br",
  "www.voltaredonda.rj.gov.br",
]);
let drift = false;

for (const source of manifest.sources) {
  const url = new URL(source.officialUrl);
  if (url.protocol !== "https:" || !allowedDomains.has(url.hostname)) {
    throw new Error(`COMUN_48_2_C2_SOURCE_DOMAIN_REJECTED:${source.sourceId}`);
  }
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
      {
        encoding: "buffer",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error(`COMUN_48_2_C2_SOURCE_HTTP_FAILURE:${source.sourceId}`);
  }
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) {
    console.log(`COMUN_48_2_C2_SOURCE_DRIFT_REVIEW_REQUIRED:${source.sourceId}`);
    drift = true;
  }
}

if (drift) process.exitCode = 2;
else console.log("COMUN_48_2_C2_OFFICIAL_SOURCES_CURRENT");
