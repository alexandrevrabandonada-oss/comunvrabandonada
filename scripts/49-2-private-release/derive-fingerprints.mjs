import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [prePath, beforePath, partialPath, afterPath, outputPath] =
  process.argv.slice(2);
if (!prePath || !beforePath || !partialPath || !afterPath || !outputPath)
  throw new Error("COMUN_49_2_DERIVE_INPUT_MISSING");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const pre = await readJson(prePath);
const before = await readJson(beforePath);
const partial = await readJson(partialPath);
const after = await readJson(afterPath);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const migrationPaths = [
  "supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql",
  "supabase/migrations/20260924015511_comun_relata_collective_entity_authenticated_runtime.sql",
];
const migrationHashes = await Promise.all(
  migrationPaths.map(async (path) => sha256(await readFile(path))),
);
const preText = await readFile(prePath);
if (
  sha256(preText) !==
  "e8bff2fdae5e6ac49391757ef10fa24de759ef1903d9b7660c3790408117f015"
)
  throw new Error("COMUN_49_2_PRE_ARTIFACT_HASH_MISMATCH");
if (
  pre.scope !== "COMUN_49_2_PRIVATE_RELEASE_PRODUCTION_PRE" ||
  pre.sourceSha !== "438cf7e7bb630b08ccac348d3e0859dda2c02692" ||
  pre.transactionReadOnly !== "on" ||
  pre.privateTableCount !== 0 ||
  pre.r2BridgeCount !== 0 ||
  pre.migrationCount !== 0 ||
  pre.blockingFindings !== 0 ||
  pre.hardeningLedger !== "PRESENT_ACCEPTED" ||
  pre.runnerFingerprint !==
    "a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98"
)
  throw new Error("COMUN_49_2_PRIVATE_RELEASE_PRODUCTION_DRIFT");
if (
  before.target !== "DISPOSABLE" ||
  before.runnerFingerprint !== pre.runnerFingerprint ||
  before.canonicalFingerprint !== pre.canonicalFingerprint ||
  before.blockingFindings !== 0 ||
  before.releaseLedgerState !== "PRESENT_ACCEPTED" ||
  before.consentObjectCount !== 0 ||
  before.postgresVersion !== pre.postgresVersion ||
  JSON.stringify(before.migrations) !== JSON.stringify(pre.migrations)
)
  throw new Error("COMUN_49_2_DISPOSABLE_PRE_DRIFT");
if (
  partial.blockingFindings !== 0 ||
  after.blockingFindings !== 0 ||
  partial.consentMigrationPresent !== true ||
  after.consentMigrationPresent !== true ||
  !after.migrations.includes("20260924015511") ||
  partial.migrations.includes("20260924015511") ||
  partial.consentObjectCount !== 6 ||
  after.consentObjectCount !== 6
) {
  console.error(
    JSON.stringify({
      partial: {
        blockingFindings: partial.blockingFindings,
        findingRules: partial.findingRules,
        consentMigrationPresent: partial.consentMigrationPresent,
        consentObjectCount: partial.consentObjectCount,
        r2Present: partial.migrations.includes("20260924015511"),
      },
      post: {
        blockingFindings: after.blockingFindings,
        findingRules: after.findingRules,
        consentMigrationPresent: after.consentMigrationPresent,
        consentObjectCount: after.consentObjectCount,
        r2Present: after.migrations.includes("20260924015511"),
      },
    }),
  );
  throw new Error("COMUN_49_2_DISPOSABLE_POST_INVALID");
}

const output = {
  scope: "COMUN_49_2_PRIVATE_RELEASE_DISPOSABLE_FINGERPRINTS",
  productionCaptureRun: "36018063341",
  productionCaptureSha256: sha256(preText),
  sourceSha: pre.sourceSha,
  fixture: "tests/fixtures/pr437-post",
  postgresVersion: pre.postgresVersion,
  migrations: migrationPaths.map((path, index) => ({
    order: index + 1,
    path,
    sha256: migrationHashes[index],
  })),
  pre: {
    runnerFingerprint: before.runnerFingerprint,
    canonicalFingerprint: before.canonicalFingerprint,
    blockingFindings: before.blockingFindings,
  },
  partialR1: {
    runnerFingerprint: partial.runnerFingerprint,
    canonicalFingerprint: partial.canonicalFingerprint,
    blockingFindings: partial.blockingFindings,
    consentObjectCount: partial.consentObjectCount,
  },
  post: {
    runnerFingerprint: after.runnerFingerprint,
    canonicalFingerprint: after.canonicalFingerprint,
    blockingFindings: after.blockingFindings,
    consentObjectCount: after.consentObjectCount,
  },
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log("COMUN_49_2_PRIVATE_RELEASE_FINGERPRINTS_DERIVED");
