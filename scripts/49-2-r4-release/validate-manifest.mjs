import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const MANIFEST_PATH =
  "supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json";
export const BASELINE_PATH =
  "reports/current/comun-49-2-r4-production-pre.json";
export const DERIVED_PATH =
  "reports/current/comun-49-2-r4-release-disposable-derived.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validateR4Manifest({
  manifest,
  baseline,
  derived,
  baselineBytes,
  derivedBytes,
  migrationBytes,
}) {
  const migration = manifest?.migrations?.[0];
  const expectedPath =
    "supabase/migrations/20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql";
  const migrationSetHash = sha256(
    JSON.stringify([[expectedPath, migration?.sha256]]),
  );
  if (
    manifest?.release !== "20260925-comun-49-2-r4-private-legitimacy-eligibility" ||
    manifest?.sourceMainSha !== "7e72a4f943bd882d09119a8e068fb94456048ac4" ||
    manifest.migrations?.length !== 1 ||
    migration?.order !== 1 ||
    migration.version !== "20260925014131" ||
    migration.path !== expectedPath ||
    sha256(migrationBytes) !== migration.sha256 ||
    manifest.migrationSetSha256 !== migrationSetHash ||
    manifest.productionPreCaptureRun !== baseline.runId ||
    manifest.productionPreCaptureSha256 !== sha256(baselineBytes) ||
    manifest.disposableProofRun !== "36195239684" ||
    manifest.disposableProofArtifactSha256 !== sha256(derivedBytes) ||
    manifest.postgresVersion !== baseline.postgresVersion ||
    manifest.expectedPreFingerprint !== baseline.runnerFingerprint ||
    manifest.expectedPreCanonicalFingerprint !== baseline.canonicalFingerprint ||
    manifest.expectedPostFingerprint !== derived.post?.runnerFingerprint ||
    manifest.expectedPostCanonicalFingerprint !== derived.post?.canonicalFingerprint ||
    manifest.expectedBlockingFindings !== 0 ||
    manifest.destructiveSql !== false ||
    manifest.requiresPromotion !== true ||
    manifest.releaseLedger?.relation !== "public.comun_schema_releases" ||
    manifest.releaseLedger?.migrationPath !== `bundle:${MANIFEST_PATH}` ||
    manifest.releaseLedger?.migrationSha256 !== migrationSetHash ||
    manifest.releaseLedger?.status !== "applied" ||
    baseline.sourceMainSha !== manifest.sourceMainSha ||
    baseline.scope !== "COMUN_49_2_R4_PRODUCTION_PRE_READ_ONLY" ||
    baseline.transactionReadOnly !== "on" ||
    baseline.blockingFindings !== 0 ||
    baseline.r1Present !== true ||
    baseline.r2Present !== true ||
    baseline.r3Present !== true ||
    baseline.r4Present !== false ||
    baseline.r12Ledger !== "PRESENT_ACCEPTED" ||
    baseline.r3Ledger !== "PRESENT_ACCEPTED" ||
    baseline.hardeningLedger !== "PRESENT_ACCEPTED" ||
    baseline.r4LedgerState !== "ABSENT" ||
    derived.productionCaptureSha256 !== sha256(baselineBytes) ||
    derived.migrationSha256 !== migration.sha256 ||
    derived.pre?.runnerFingerprint !== baseline.runnerFingerprint ||
    derived.pre?.canonicalFingerprint !== baseline.canonicalFingerprint ||
    derived.post?.blockingFindings !== 0 ||
    derived.structure?.reviewOrderIdentity !== "a" ||
    derived.structure?.reviewOrderUnique !== true ||
    derived.structure?.publicLegitimacyRelations !== 0 ||
    derived.structure?.reviewRows !== 0
  )
    throw new Error("COMUN_49_2_R4_RELEASE_MANIFEST_INVALID");
  return { manifest, baseline, derived };
}

export function loadValidatedR4Manifest() {
  const manifestBytes = readFileSync(MANIFEST_PATH);
  const baselineBytes = readFileSync(BASELINE_PATH);
  const derivedBytes = readFileSync(DERIVED_PATH);
  const manifest = JSON.parse(manifestBytes);
  const baseline = JSON.parse(baselineBytes);
  const derived = JSON.parse(derivedBytes);
  const migrationBytes = readFileSync(manifest.migrations?.[0]?.path ?? "");
  return validateR4Manifest({
    manifest,
    baseline,
    derived,
    baselineBytes,
    derivedBytes,
    migrationBytes,
  });
}

if (process.argv[1]?.endsWith("validate-manifest.mjs")) {
  loadValidatedR4Manifest();
  console.log("COMUN_49_2_R4_RELEASE_MANIFEST_VALID");
}
