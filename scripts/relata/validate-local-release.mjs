import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  classifyLocalReleaseManifests,
  discoverManifestRecords,
  LOCAL_RELEASE_DIRECTORIES,
} from "./local-release-manifest.mjs";

const root = process.cwd();
const classified = await classifyLocalReleaseManifests(root);
assert.ok(classified.length >= 2);
for (const entry of classified) {
  assert.equal(entry.status, "LOCAL_ONLY_MANIFEST_EXACT", entry.manifestPath);
}

const verified = classified.map((entry) => ({
  release: entry.release,
  migration: entry.migration,
  migrationSha256: entry.sha256,
  manifest: entry.manifestPath,
  classification: entry.status,
  manifestFound: entry.manifestFound,
  localOnly: entry.localOnly,
  remotePromotionForbidden: entry.remotePromotionForbidden,
  quarantineAllowed: entry.quarantineAllowed,
  productionReplacementRequiredIfFeatureNeeded:
    entry.productionReplacementRequiredIfFeatureNeeded,
}));

const remoteApplyScripts = (
  await readdir(path.join(root, "scripts"), {
    recursive: true,
    withFileTypes: true,
  })
)
  .filter(
    (entry) =>
      entry.isFile() &&
      /(?:apply|promot).*remote|remote.*(?:apply|promot)/i.test(entry.name),
  )
  .map((entry) => path.join(entry.parentPath, entry.name));

for (const scriptPath of remoteApplyScripts) {
  const contents = await readFile(scriptPath, "utf8");
  for (const release of verified) {
    assert.equal(
      contents.includes(release.release) || contents.includes(release.migration),
      false,
      `${path.relative(root, scriptPath)} must not promote ${release.release}`,
    );
  }
}

const allRecords = await discoverManifestRecords(root);
const localDirectories = LOCAL_RELEASE_DIRECTORIES;
console.log(
  JSON.stringify({
    result: "COMUN_RELATA_LOCAL_RELEASE_CONTRACT_GREEN",
    localManifestDirectories: localDirectories,
    releases: verified,
    manifestRecordsInspected: allRecords.length,
    remotePromotionAllowed: false,
  }),
);
