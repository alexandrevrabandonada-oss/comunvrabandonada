import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const LOCAL_RELEASE_DIRECTORIES = Object.freeze([
  "supabase/local-releases",
]);

export const PROMOTION_MANIFEST_DIRECTORIES = Object.freeze([
  "supabase/releases",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function manifestMigrationSha(manifest) {
  const values = [manifest?.migrationSha256, manifest?.sha256].filter(Boolean);
  return values.length === 1 ? values[0] : null;
}

export function isLocalFeatureFlag(flag) {
  return typeof flag === "string" && /(?:^|_)LOCAL$/.test(flag);
}

export function validateLocalManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object") return false;
  if (typeof manifest.release !== "string" || !manifest.release) return false;
  if (
    typeof manifest.migration !== "string" ||
    !/^supabase\/(?:local-migrations|migrations)\/\d+_[^/]+\.sql$/.test(manifest.migration)
  ) {
    return false;
  }
  const expectedSha = manifestMigrationSha(manifest);
  if (!/^[a-f0-9]{64}$/.test(expectedSha ?? "")) return false;
  if (manifest.requiresPromotion !== false) return false;
  if (manifest.remotePromotionAllowed !== false) return false;
  if (
    manifest.scope !== "local-only" &&
    manifest.scope !== "disposable_local_supabase_only"
  ) {
    return false;
  }
  if (manifest.scope === "local-only" && !isLocalFeatureFlag(manifest.featureFlag)) {
    return false;
  }
  return true;
}

async function jsonFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  try {
    return (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function discoverManifestRecords(root) {
  const records = [];
  for (const relativeDirectory of [
    ...LOCAL_RELEASE_DIRECTORIES,
    ...PROMOTION_MANIFEST_DIRECTORIES,
  ]) {
    for (const name of await jsonFiles(root, relativeDirectory)) {
      const manifestPath = `${relativeDirectory}/${name}`;
      const manifest = JSON.parse(
        await readFile(path.join(root, manifestPath), "utf8"),
      );
      if (typeof manifest?.migration !== "string") continue;
      records.push({ manifestPath, manifest });
    }
  }
  return records;
}

export async function classifyLocalReleaseManifests(root) {
  const records = await discoverManifestRecords(root);
  const localRecords = records.filter(({ manifestPath }) =>
    LOCAL_RELEASE_DIRECTORIES.some((directory) => manifestPath.startsWith(`${directory}/`)),
  );
  const promotionRecords = records.filter(({ manifestPath }) =>
    PROMOTION_MANIFEST_DIRECTORIES.some((directory) => manifestPath.startsWith(`${directory}/`)),
  );
  const counts = new Map();
  for (const { manifest } of records) {
    counts.set(manifest.migration, (counts.get(manifest.migration) ?? 0) + 1);
  }
  const classified = [];
  for (const { manifestPath, manifest } of localRecords) {
    const migrationPath = path.join(root, manifest.migration);
    const migration = await readFile(migrationPath);
    const actualSha = sha256(migration);
    const expectedSha = manifestMigrationSha(manifest);
    const conflictingPromotion = promotionRecords.some(
      ({ manifest: candidate }) => candidate.migration === manifest.migration,
    );
    const exact =
      validateLocalManifestShape(manifest) &&
      actualSha === expectedSha &&
      !conflictingPromotion &&
      counts.get(manifest.migration) === 1;
    classified.push({
      manifestPath,
      release: manifest.release,
      migration: manifest.migration,
      sha256: actualSha,
      expectedSha,
      status: exact ? "LOCAL_ONLY_MANIFEST_EXACT" : "MANIFEST_MISMATCH",
      manifestFound: true,
      localOnly: manifest.requiresPromotion === false,
      remotePromotionForbidden: manifest.remotePromotionAllowed === false,
      quarantineAllowed: exact,
      productionReplacementRequiredIfFeatureNeeded: exact,
      conflictingPromotion,
      duplicateMigration: counts.get(manifest.migration) !== 1,
    });
  }
  return classified;
}
