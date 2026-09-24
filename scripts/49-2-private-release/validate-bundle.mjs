import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateForwardOnlySqlText } from "../solo/validate-forward-only-sql.mjs";
import { classifyPrivateRelease } from "./state-machine.mjs";

const manifestPath =
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const prePath =
  "reports/current/comun-49-2-private-release-production-pre.json";
const derivedPath =
  "reports/current/comun-49-2-private-release-disposable-derived.json";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFileSync(path);
const readJson = (path) => JSON.parse(read(path).toString("utf8"));

export function validateBundle({
  manifest,
  pre,
  derived,
  preBytes,
  derivedBytes,
  migrationBytes,
}) {
  if (
    manifest.destructiveSql !== false ||
    manifest.requiresPromotion !== true ||
    manifest.expectedBlockingFindings !== 0 ||
    manifest.releaseLedger?.relation !== "public.comun_schema_releases" ||
    manifest.releaseLedger?.status !== "applied" ||
    hash(preBytes) !== manifest.productionPreCaptureSha256 ||
    hash(derivedBytes) !== manifest.disposableProofArtifactSha256 ||
    derived.productionCaptureSha256 !== manifest.productionPreCaptureSha256 ||
    derived.productionCaptureRun !== manifest.productionPreCaptureRun ||
    derived.sourceSha !== manifest.sourceMainSha ||
    pre.sourceSha !== manifest.sourceMainSha ||
    pre.transactionReadOnly !== "on" ||
    pre.hardeningLedger !== "PRESENT_ACCEPTED" ||
    pre.postgresVersion !== manifest.postgresVersion ||
    derived.postgresVersion !== manifest.postgresVersion ||
    pre.runnerFingerprint !== derived.pre.runnerFingerprint ||
    pre.canonicalFingerprint !== derived.pre.canonicalFingerprint ||
    manifest.migrations?.length !== 2 ||
    derived.migrations?.length !== 2 ||
    migrationBytes?.length !== 2
  )
    throw new Error("COMUN_49_2_PRIVATE_RELEASE_BUNDLE_INVALID");

  const set = [];
  for (const [index, entry] of manifest.migrations.entries()) {
    const actual = derived.migrations[index];
    if (
      entry.order !== index + 1 ||
      entry.path !== actual.path ||
      entry.sha256 !== actual.sha256 ||
      !entry.path.startsWith("supabase/migrations/") ||
      entry.version !== entry.path.split("/").at(-1).slice(0, 14) ||
      hash(migrationBytes[index]) !== entry.sha256
    )
      throw new Error("COMUN_49_2_PRIVATE_RELEASE_MIGRATION_HASH_INVALID");
    validateForwardOnlySqlText(
      {
        release: manifest.release,
        destructiveSql: false,
        expectedBlockingFindings: 0,
        platformObservationsAllowed: true,
        releaseLedger: "public.comun_schema_releases",
      },
      migrationBytes[index].toString("utf8"),
    );
    set.push([entry.path, entry.sha256]);
  }
  const setHash = hash(JSON.stringify(set));
  if (
    setHash !== manifest.migrationSetSha256 ||
    manifest.releaseLedger.migrationSha256 !== setHash ||
    manifest.releaseLedger.migrationPath !== `bundle:${manifestPath}` ||
    manifest.expectedPreFingerprint !== derived.pre.runnerFingerprint ||
    manifest.expectedPreCanonicalFingerprint !==
      derived.pre.canonicalFingerprint ||
    manifest.expectedPartialR1Fingerprint !==
      derived.partialR1.runnerFingerprint ||
    manifest.expectedPartialR1CanonicalFingerprint !==
      derived.partialR1.canonicalFingerprint ||
    manifest.expectedPostFingerprint !== derived.post.runnerFingerprint ||
    manifest.expectedPostCanonicalFingerprint !==
      derived.post.canonicalFingerprint ||
    manifest.expectedPreMigrationVersionsSha256 !==
      hash(JSON.stringify(pre.migrations)) ||
    pre.blockingFindings !== 0 ||
    derived.pre.blockingFindings !== 0 ||
    derived.partialR1.blockingFindings !== 0 ||
    derived.post.blockingFindings !== 0
  )
    throw new Error("COMUN_49_2_PRIVATE_RELEASE_FINGERPRINT_INVALID");

  const baseline = { migrations: pre.migrations };
  const capture = {
    migrations: pre.migrations,
    runnerFingerprint: pre.runnerFingerprint,
    canonicalFingerprint: pre.canonicalFingerprint,
    blockingFindings: pre.blockingFindings,
    releaseLedgerState: pre.hardeningLedger,
    consentObjectCount: pre.privateTableCount,
    bundleLedgerState: "ABSENT",
  };
  if (classifyPrivateRelease(capture, manifest, baseline).state !== "PRE")
    throw new Error("COMUN_49_2_PRIVATE_RELEASE_PRE_INVALID");
  return {
    release: manifest.release,
    migrationSetSha256: setHash,
    state: "PRE",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const manifest = readJson(manifestPath);
  const preBytes = read(prePath);
  const derivedBytes = read(derivedPath);
  const result = validateBundle({
    manifest,
    pre: JSON.parse(preBytes),
    derived: JSON.parse(derivedBytes),
    preBytes,
    derivedBytes,
    migrationBytes: manifest.migrations.map((entry) => read(entry.path)),
  });
  console.log(`COMUN_49_2_PRIVATE_RELEASE_BUNDLE_VALID:${result.state}`);
}
