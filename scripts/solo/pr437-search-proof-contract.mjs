import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const SHA = /^[a-f0-9]{64}$/;
const TARGET = "public.comun_sync_public_search_projection()";
export const PINNED_IMAGE =
  "public.ecr.aws/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function requireProductionCapture(
  capture,
  reference,
  release,
  manifestSha256,
) {
  const fail = (marker) => {
    throw new Error(marker);
  };
  if (
    !capture ||
    capture.scope !== "COMUN_PR437_PROMOTION_FINGERPRINT_READ_ONLY" ||
    capture.target !== "PRODUCTION"
  )
    fail("COMUN_SEARCH_LINT_PRODUCTION_ARTIFACT_MISSING");
  if (
    capture.runnerFingerprint !== reference.postRunnerFingerprint ||
    capture.runnerFingerprint !== release.expectedPostFingerprint ||
    capture.canonicalFingerprint !== reference.postCanonicalFingerprint ||
    capture.blockingFindings !== 0 ||
    capture.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    capture.releasePresent !== true ||
    capture.consentMigrationPresent !== false ||
    capture.consentObjectCount !== 0
  )
    fail("COMUN_SEARCH_LINT_PRODUCTION_POST_DRIFT");
  const search = capture.searchFunction;
  if (
    search?.identity !== TARGET ||
    search?.language !== "plpgsql" ||
    search?.owner !== reference.searchSyncOwner ||
    search?.securityDefiner !== true ||
    JSON.stringify(search?.config) !==
      JSON.stringify(["search_path=pg_catalog"]) ||
    search?.definitionSha256 !== reference.searchSyncDefinitionSha256 ||
    !SHA.test(search?.definitionSha256 ?? "")
  )
    fail("COMUN_SEARCH_LINT_PRODUCTION_FUNCTION_DRIFT");
  const identity = capture.releaseIdentity;
  if (
    identity?.release !== release.release ||
    identity?.migration !== release.migration ||
    identity?.migrationSha256 !== release.migrationSha256 ||
    identity?.manifestSha256 !== manifestSha256 ||
    identity?.expectedPostFingerprint !== release.expectedPostFingerprint
  )
    fail("COMUN_SEARCH_LINT_RELEASE_IDENTITY_DRIFT");
  if (!/^17\.6(?:\.\d+)?$/.test(capture.postgresVersion ?? ""))
    fail("COMUN_SEARCH_LINT_PRODUCTION_POSTGRES_VERSION_DRIFT");
  const catalog = capture.plpgsqlCheckCatalog;
  if (
    catalog?.name !== "plpgsql_check" ||
    catalog.installed !== null ||
    catalog.available?.defaultVersion !== "2.7" ||
    catalog.available?.installedVersion !== null ||
    !Array.isArray(catalog.versions) ||
    catalog.versions.length !== 1 ||
    catalog.versions[0]?.name !== "plpgsql_check" ||
    catalog.versions[0]?.version !== "2.7" ||
    catalog.versions[0]?.installed !== false ||
    catalog.versions[0]?.superuser !== true ||
    catalog.versions[0]?.trusted !== false ||
    catalog.versions[0]?.relocatable !== false
  )
    fail("COMUN_SEARCH_LINT_PRODUCTION_EXTENSION_CATALOG_DRIFT");
  return capture;
}

export function requireDisposableCapture(capture, production, fixture) {
  if (!capture || capture.target !== "DISPOSABLE")
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_ARTIFACT_MISSING");
  if (
    capture.postgresVersion !== production.postgresVersion ||
    capture.runnerFingerprint !== production.runnerFingerprint ||
    capture.canonicalFingerprint !== production.canonicalFingerprint ||
    capture.blockingFindings !== 0 ||
    capture.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    JSON.stringify(capture.searchFunction) !==
      JSON.stringify(production.searchFunction) ||
    JSON.stringify(capture.releaseIdentity) !==
      JSON.stringify(production.releaseIdentity) ||
    capture.plpgsqlCheckCatalog?.installed?.version !==
      fixture.plpgsqlCheckCatalogVersion
  )
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_FIXTURE_DRIFT");
  return capture;
}

export function classifyVersionEquivalence(
  productionAvailableVersion,
  disposableVersion,
) {
  if (!productionAvailableVersion || !disposableVersion) return "MISMATCH";
  if (
    productionAvailableVersion === disposableVersion &&
    /^\d+\.\d+\.\d+$/.test(disposableVersion)
  )
    return "EXACT";
  if (
    productionAvailableVersion === disposableVersion &&
    /^\d+\.\d+$/.test(disposableVersion)
  )
    return "SAME_MINOR_PATCH_UNKNOWN";
  return "MISMATCH";
}

export function requireFixtureFiles(fixture, files) {
  if (
    fixture.postgresImage !== PINNED_IMAGE ||
    fixture.postgresImageTag !== "17.6.1.100" ||
    fixture.plpgsqlCheckCatalogVersion !== "2.7"
  )
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_IMAGE_UNPINNED");
  for (const [name, expected] of Object.entries(fixture.files ?? {})) {
    if (!SHA.test(expected) || sha256(files[name] ?? "") !== expected)
      throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_FIXTURE_FILE_DRIFT");
  }
  if (Object.keys(fixture.files ?? {}).length !== 4)
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_FIXTURE_FILE_DRIFT");
  return true;
}

export async function loadReleaseContract() {
  const [referenceText, releaseText, migrationText] = await Promise.all([
    readFile(
      "reports/current/comun-pr437-production-preflight-reference.json",
      "utf8",
    ),
    readFile(
      "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
      "utf8",
    ),
    readFile(
      "supabase/migrations/20260922120000_comun_canonical_security_hardening_v2.sql",
    ),
  ]);
  const reference = JSON.parse(referenceText);
  const release = JSON.parse(releaseText);
  if (sha256(migrationText) !== release.migrationSha256)
    throw new Error("COMUN_SEARCH_LINT_MIGRATION_CHANGED");
  return { reference, release, manifestSha256: sha256(releaseText) };
}
