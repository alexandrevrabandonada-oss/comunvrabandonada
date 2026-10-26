import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The immutable index, its linux/amd64 manifest and that manifest's config are
// distinct digests. Docker's image store may expose either index or config ID.
export const ROLE_IMAGE =
  "postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675";
const IDS = new Set([
  "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675",
  "sha256:7296f210ae81031ec955dbad9a67a84fe958572a2153b8d0826a647522904dc1",
]);

export function verifyRoleImage(record) {
  if (
    !record ||
    record.Os !== "linux" ||
    record.Architecture !== "amd64" ||
    !IDS.has(record.Id) ||
    !Array.isArray(record.RepoDigests) ||
    !record.RepoDigests.includes(ROLE_IMAGE)
  ) {
    throw new Error("COMUN_M7E_ROLE_POSTGRES_IMAGE_PIN_MISMATCH");
  }
  return record.Id;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 3 || !path.isAbsolute(process.argv[2]))
      throw new Error();
    verifyRoleImage(JSON.parse(await readFile(process.argv[2], "utf8"))[0]);
    console.log("COMUN_M7E_ROLE_POSTGRES_IMAGE_VERIFIED");
  } catch {
    console.error("COMUN_M7E_ROLE_POSTGRES_IMAGE_PIN_MISMATCH");
    process.exitCode = 1;
  }
}
