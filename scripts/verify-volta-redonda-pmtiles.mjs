import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOLTA_REDONDA_PMTILES_SHA256 =
  "d0512669d6c01cbffbc513837e30ac926ef124727feeaa12b91d9be04cd635b9";
export const VOLTA_REDONDA_PMTILES_RELATIVE_PATH =
  "public/maps/volta-redonda/volta-redonda.pmtiles";
export const VOLTA_REDONDA_PMTILES_MANIFEST_RELATIVE_PATH =
  "public/maps/volta-redonda/manifest.json";

export async function validateVoltaRedondaPmtiles(root = process.cwd()) {
  const artifactPath = path.join(root, VOLTA_REDONDA_PMTILES_RELATIVE_PATH);
  const manifestPath = path.join(
    root,
    VOLTA_REDONDA_PMTILES_MANIFEST_RELATIVE_PATH,
  );
  const [artifact, rawManifest, artifactStat] = await Promise.all([
    readFile(artifactPath),
    readFile(manifestPath, "utf8"),
    stat(artifactPath),
  ]);
  const manifest = JSON.parse(rawManifest);
  const sha256 = createHash("sha256").update(artifact).digest("hex");

  if (
    artifact.length < 127 ||
    artifact.subarray(0, 7).toString("utf8") !== "PMTiles"
  )
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_INVALID_HEADER");
  if (artifact[7] !== 3 || manifest.output?.pmtilesVersion !== 3)
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_VERSION_INVALID");
  if (manifest.output?.file !== "volta-redonda.pmtiles")
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_MANIFEST_INVALID");
  if (manifest.output?.sha256 !== VOLTA_REDONDA_PMTILES_SHA256)
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_CANONICAL_MANIFEST_MISMATCH");
  if (sha256 !== VOLTA_REDONDA_PMTILES_SHA256)
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_CANONICAL_HASH_MISMATCH");
  if (artifactStat.size !== manifest.output?.sizeBytes)
    throw new Error("COMUN_VOLTA_REDONDA_PMTILES_SIZE_MISMATCH");

  return {
    sha256,
    sizeBytes: artifactStat.size,
    pmtilesVersion: artifact[7],
    manifest: VOLTA_REDONDA_PMTILES_MANIFEST_RELATIVE_PATH,
  };
}

async function main() {
  const result = await validateVoltaRedondaPmtiles();
  console.log(JSON.stringify(result));
  console.log("COMUN_VOLTA_REDONDA_PMTILES_INTEGRITY_GREEN");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
