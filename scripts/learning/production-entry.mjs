import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { installSchoolTransaction } from "./transaction-core.mjs";
import { digest, connectionOptions } from "./production-pre.mjs";
import { migrationHash, manifestHash } from "./release-review.mjs";

// Separate entry for the specifically authorized School operation. No CLI,
// credential discovery, remote workflow, manifest override or automatic retry.
const projectRef = "nvmdszymrtacfehdynpg";
const permits = new WeakMap();
export const productionContract = Object.freeze({
  preCanonical:
    "160face699d0b22b88b0434a6393cedf587ce0ccf1f8338dd8765ec56f6fab4a",
  preRunner: "ccb89095e56cad37b6b0e8459eee4eee9c130abd709b78940a85578a302c317f",
  postCanonical:
    "d32721d3fb6df9203ff8aa6af00cddab64cf9bb948e47e9e4f799f328b0625ad",
  postRunner:
    "1e78dfc1986015c57615f24766caf099df9459d33644971d3b1a08f53e45af66",
});
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const within = (root, file) => {
  const relative = path.relative(root, file);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
};

export function requireProductionTransport(db) {
  const p = db.connectionParameters;
  assert.ok(
    p?.database === "postgres" &&
      Number(p.port) === 5432 &&
      ((p.host === `db.${projectRef}.supabase.co` && p.user === "postgres") ||
        (/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(p.host ?? "") &&
          p.user === `postgres.${projectRef}`)),
    "LEARNING_PRODUCTION_DESTINATION_REJECTED",
  );
  assert.ok(
    p.ssl &&
      p.ssl.rejectUnauthorized === true &&
      db.connection?.stream?.encrypted === true &&
      db.connection.stream.authorized === true,
    "LEARNING_PRODUCTION_VERIFIED_TLS_REQUIRED",
  );
  assert.ok(
    Object.keys(p.ssl).every((key) =>
      ["ca", "rejectUnauthorized", "servername"].includes(key),
    ) &&
      (!p.ssl.servername || p.ssl.servername === p.host),
    "LEARNING_PRODUCTION_TLS_OVERRIDE_REJECTED",
  );
  assert.equal(
    p.options,
    connectionOptions,
    "LEARNING_PRODUCTION_DEFAULT_READ_ONLY_REQUIRED",
  );
}

export function requireRecoveryReceipt(receipt, now = Date.now()) {
  assert.equal(receipt.format, "COMUN_SCHOOL_PRIVATE_REAL_RECOVERY_V1");
  assert.equal(receipt.kind, "PRIVATE_REAL_RESTORE");
  assert.equal(receipt.sourceProjectRefSha256, digest(projectRef));
  assert.equal(receipt.destinationKind, "ISOLATED_LOCAL");
  assert.equal(receipt.productionWrites, 0);
  assert.equal(receipt.migrationSha256, migrationHash);
  assert.equal(receipt.manifestSha256, manifestHash);
  assert.equal(
    receipt.postgresVersion,
    "17.6",
    "LEARNING_PRODUCTION_VERSION_REQUIRES_NEW_REHEARSAL",
  );
  assert.deepEqual(receipt.contract, productionContract);
  const started = Date.parse(receipt.backupStartedAt);
  const completed = Date.parse(receipt.restoreCompletedAt);
  // A strict upper bound, explicitly reported as a recovery point, never RPO 0.
  assert.ok(
    Number.isFinite(started) &&
      Number.isFinite(completed) &&
      started <= completed &&
      completed <= now &&
      now - started <= 3600000,
    "LEARNING_PRODUCTION_RECOVERY_STALE_OR_INVALID",
  );
  for (const key of [
    "databaseRestored",
    "tableIntegrity",
    "historyAndLedger",
    "rolesAndGrants",
    "policiesFunctionsTriggers",
    "authApiAndIsolation",
    "storageFilesAndApiIsolation",
    "externalConfigurationRecoverable",
    "independentKeyRestore",
    "authenticatedEncryption",
  ])
    assert.equal(
      receipt.checks?.[key],
      true,
      `LEARNING_PRODUCTION_RECOVERY_INCOMPLETE:${key}`,
    );
  assert.deepEqual(receipt.evidence?.map((e) => e.kind).sort(), [
    "AUTH",
    "CONFIGURATION",
    "DATABASE",
    "KEY",
    "STORAGE",
  ]);
  assert.ok(
    Array.isArray(receipt.ciphertexts) && receipt.ciphertexts.length >= 2,
    "LEARNING_PRODUCTION_CIPHERTEXTS_REQUIRED",
  );
}

// The expected receipt hash is the separately reviewed PRIVATE attestation.
// File hashes establish integrity, not the truth of a fabricated attestation.
// This API cannot generate a receipt or turn a synthetic proof into a real one.
export async function loadReviewedRecovery({
  root,
  receiptPath,
  reviewedReceiptSha256,
}) {
  const now = Date.now();
  assert.match(reviewedReceiptSha256 ?? "", /^[a-f0-9]{64}$/);
  const directory = await realpath(root);
  const file = await realpath(receiptPath);
  assert.ok(
    within(directory, file),
    "LEARNING_PRODUCTION_PRIVATE_PATH_REQUIRED",
  );
  const bytes = await readFile(file);
  assert.equal(
    sha256(bytes),
    reviewedReceiptSha256,
    "LEARNING_PRODUCTION_RECEIPT_CHANGED",
  );
  const receipt = JSON.parse(bytes);
  requireRecoveryReceipt(receipt, now);
  for (const item of [...receipt.evidence, ...receipt.ciphertexts]) {
    assert.match(item.sha256 ?? "", /^[a-f0-9]{64}$/);
    const artifact = await realpath(path.resolve(directory, item.path));
    assert.ok(
      within(directory, artifact),
      "LEARNING_PRODUCTION_PRIVATE_PATH_REQUIRED",
    );
    const metadata = await stat(artifact);
    assert.ok(metadata.isFile() && metadata.size > 0);
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(artifact)) hash.update(chunk);
    assert.equal(
      hash.digest("hex"),
      item.sha256,
      "LEARNING_PRODUCTION_RECOVERY_FILE_CHANGED",
    );
  }
  const permit = Object.freeze({});
  permits.set(permit, {
    deadline: Date.parse(receipt.backupStartedAt) + 3600000,
    receiptSha256: reviewedReceiptSha256,
  });
  return permit;
}

export async function installAuthorizedSchoolProduction(
  db,
  capture,
  permit,
  testedTree,
) {
  const now = Date.now();
  capture = structuredClone(capture);
  const recovery = permits.get(permit);
  assert.ok(
    recovery && now <= recovery.deadline,
    "LEARNING_PRODUCTION_REVIEWED_RECOVERY_REQUIRED",
  );
  requireProductionTransport(db);
  assert.match(testedTree ?? "", /^[a-f0-9]{40}$/);
  assert.equal(
    capture.sourceTree,
    testedTree,
    "LEARNING_PRODUCTION_CAPTURE_TREE_MISMATCH",
  );
  assert.equal(capture.target?.projectRefSha256, digest(projectRef));
  assert.equal(capture.target?.allowlisted, true);
  assert.deepEqual(capture.reasons, []);
  assert.equal(capture.transactionReadOnly, true);
  assert.equal(
    capture.scope?.serverVersion,
    "17.6",
    "LEARNING_PRODUCTION_VERSION_REQUIRES_NEW_REHEARSAL",
  );
  assert.equal(
    capture.status,
    "COMUN_LEARNING_PRE_CAPTURED_AWAITING_DISPOSABLE_EQUIVALENCE",
  );
  assert.equal(capture.rollback, "CONFIRMED");
  assert.equal(capture.schoolLedgerState, "ABSENT");
  assert.deepEqual(capture.actionablePending, ["20261006134804"]);
  assert.equal(Object.keys(capture.ledgers ?? {}).length, 5);
  assert.ok(
    Object.values(capture.ledgers).every((s) => s === "PRESENT_ACCEPTED"),
  );
  const at = Date.parse(capture.capturedAt);
  assert.ok(
    Number.isFinite(at) && at <= now && now - at <= 300000,
    "LEARNING_PRODUCTION_CAPTURE_STALE",
  );
  // Consume before BEGIN. Never auto-retry, including an unknown COMMIT result.
  permits.delete(permit);
  return installSchoolTransaction(db, capture, productionContract);
}
