import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { digest, connectionOptions } from "./production-pre.mjs";
import { migrationHash, manifestHash } from "./release-review.mjs";
import {
  requireProductionTransport,
  requireRecoveryReceipt,
  productionContract,
  loadReviewedRecovery,
  installAuthorizedSchoolProduction,
} from "./production-entry.mjs";

const now = Date.parse("2026-10-09T19:00:00Z");
const hash = (b) => createHash("sha256").update(b).digest("hex");
// Synthetic unit inputs exercise refusals/shape only. Not a real recovery proof.
const receipt = () => ({
  format: "COMUN_SCHOOL_PRIVATE_REAL_RECOVERY_V1",
  kind: "PRIVATE_REAL_RESTORE",
  sourceProjectRefSha256: digest("nvmdszymrtacfehdynpg"),
  destinationKind: "ISOLATED_LOCAL",
  productionWrites: 0,
  migrationSha256: migrationHash,
  manifestSha256: manifestHash,
  postgresVersion: "17.6",
  contract: productionContract,
  backupStartedAt: "2026-10-09T18:45:00Z",
  restoreCompletedAt: "2026-10-09T18:55:00Z",
  checks: Object.fromEntries(
    [
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
    ].map((k) => [k, true]),
  ),
  evidence: ["AUTH", "CONFIGURATION", "DATABASE", "KEY", "STORAGE"].map(
    (kind) => ({ kind, path: kind + ".json", sha256: hash(kind) }),
  ),
  ciphertexts: ["database.aesgcm", "storage.aesgcm"].map((p) => ({
    path: p,
    sha256: hash(p),
  })),
});
const transport = () => ({
  connectionParameters: {
    host: "db.nvmdszymrtacfehdynpg.supabase.co",
    user: "postgres",
    port: 5432,
    database: "postgres",
    ssl: { rejectUnauthorized: true },
    options: connectionOptions,
  },
  connection: { stream: { encrypted: true, authorized: true } },
});
test("exact direct and session pooler transport require verified TLS/read-only default", () => {
  requireProductionTransport(transport());
  const db = transport();
  db.connectionParameters.host = "aws-0-us-west-2.pooler.supabase.com";
  db.connectionParameters.user = "postgres.nvmdszymrtacfehdynpg";
  requireProductionTransport(db);
});
for (const [key, value] of Object.entries({
  host: "db.other.supabase.co",
  user: "service_role",
  port: 6543,
  database: "other",
  ssl: { rejectUnauthorized: false },
  options: "",
}))
  test(`transport ${key} rejected`, () => {
    const db = transport();
    db.connectionParameters[key] = value;
    assert.throws(() => requireProductionTransport(db));
  });
test("TLS requested without an authenticated encrypted socket is rejected", () => {
  for (const key of ["encrypted", "authorized"]) {
    const db = transport();
    db.connection.stream[key] = false;
    assert.throws(() => requireProductionTransport(db));
  }
});
test("custom TLS identity callback or a different servername is rejected", () => {
  for (const ssl of [
    { rejectUnauthorized: true, checkServerIdentity: () => undefined },
    { rejectUnauthorized: true, servername: "other.supabase.co" },
  ]) {
    const db = transport();
    db.connectionParameters.ssl = ssl;
    assert.throws(() => requireProductionTransport(db));
  }
});
test("complete-shaped receipt accepted by shape validator only", () =>
  requireRecoveryReceipt(receipt(), now));
for (const key of Object.keys(receipt().checks))
  test(`incomplete recovery ${key} rejected`, () => {
    const r = receipt();
    r.checks[key] = false;
    assert.throws(() => requireRecoveryReceipt(r, now), /RECOVERY_INCOMPLETE/);
  });
test("old backup, future restoration, synthetic scope and wrong package rejected", () => {
  for (const change of [
    { backupStartedAt: "2026-10-09T17:00:00Z" },
    { restoreCompletedAt: "2026-10-09T20:00:00Z" },
    { kind: "SYNTHETIC" },
    { sourceProjectRefSha256: "0".repeat(64) },
    { destinationKind: "PRODUCTION" },
    { migrationSha256: "0".repeat(64) },
    { manifestSha256: "0".repeat(64) },
    { contract: { ...productionContract, postCanonical: "0".repeat(64) } },
    { productionWrites: 1 },
    { evidence: receipt().evidence.slice(1) },
    { ciphertexts: [] },
  ])
    assert.throws(() =>
      requireRecoveryReceipt({ ...receipt(), ...change }, now),
    );
});
test("a JSON boolean or forged permit cannot reach any database query", async () => {
  let queries = 0;
  const db = {
    ...transport(),
    query() {
      queries++;
    },
  };
  await assert.rejects(
    () =>
      installAuthorizedSchoolProduction(db, {}, receipt(), "a".repeat(40), now),
    /REVIEWED_RECOVERY_REQUIRED/,
  );
  assert.equal(queries, 0);
});
test("reviewed file hashes bound; tampering/path escape rejected and fresh capture required", async (t) => {
  let clock = now;
  t.mock.method(Date, "now", () => clock);
  const root = await mkdtemp(path.join(tmpdir(), "comun-school-entry-unit-"));
  try {
    const r = receipt();
    for (const i of [...r.evidence, ...r.ciphertexts])
      await writeFile(path.join(root, i.path), i.kind ?? i.path);
    const file = path.join(root, "receipt.json");
    const bytes = Buffer.from(JSON.stringify(r));
    await writeFile(file, bytes);
    const args = {
      root,
      receiptPath: file,
      reviewedReceiptSha256: hash(bytes),
      now,
    };
    const permit = await loadReviewedRecovery(args);
    let queries = 0;
    const db = {
      ...transport(),
      query() {
        queries++;
      },
    };
    const capture = {
      sourceTree: "a".repeat(40),
      target: {
        projectRefSha256: digest("nvmdszymrtacfehdynpg"),
        allowlisted: true,
      },
      reasons: [],
      transactionReadOnly: true,
      scope: { serverVersion: "17.6" },
      status: "COMUN_LEARNING_PRE_CAPTURED_AWAITING_DISPOSABLE_EQUIVALENCE",
      rollback: "CONFIRMED",
      schoolLedgerState: "ABSENT",
      actionablePending: ["20261006134804"],
      ledgers: Object.fromEntries(
        [1, 2, 3, 4, 5].map((n) => [n, "PRESENT_ACCEPTED"]),
      ),
      capturedAt: "2026-10-09T18:00:00Z",
    };
    await assert.rejects(
      () =>
        installAuthorizedSchoolProduction(
          db,
          capture,
          permit,
          "a".repeat(40),
          now,
        ),
      /CAPTURE_STALE/,
    );
    assert.equal(queries, 0);
    await assert.rejects(
      () =>
        installAuthorizedSchoolProduction(
          db,
          { ...capture, capturedAt: "2026-10-09T18:59:00Z" },
          permit,
          "b".repeat(40),
          now,
        ),
      /TREE_MISMATCH/,
    );
    assert.equal(queries, 0);
    clock = now + 3600000;
    await assert.rejects(
      () =>
        installAuthorizedSchoolProduction(
          db,
          capture,
          permit,
          "a".repeat(40),
          now + 3600000,
        ),
      /REVIEWED_RECOVERY_REQUIRED/,
    );
    clock = now;
    const fresh = {
      ...capture,
      capturedAt: "2026-10-09T18:59:00Z",
      privateCatalog: {},
      privateCatalogSha256: digest({}),
      schemaWrites: 0,
      ledgerWrites: 0,
      snapshot: {
        compact: { fingerprint: productionContract.preCanonical },
        runner: productionContract.preRunner,
      },
    };
    db.query = () => {
      queries++;
      throw new Error("SYNTHETIC_BEGIN_FAILURE");
    };
    await assert.rejects(
      () =>
        installAuthorizedSchoolProduction(db, fresh, permit, "a".repeat(40)),
      /SYNTHETIC_BEGIN_FAILURE/,
    );
    assert.equal(queries, 1);
    await assert.rejects(
      () =>
        installAuthorizedSchoolProduction(db, fresh, permit, "a".repeat(40)),
      /REVIEWED_RECOVERY_REQUIRED/,
    );
    assert.equal(queries, 1);
    await writeFile(path.join(root, "DATABASE.json"), "tampered");
    await assert.rejects(
      () => loadReviewedRecovery(args),
      /RECOVERY_FILE_CHANGED/,
    );
    await assert.rejects(
      () =>
        loadReviewedRecovery({
          ...args,
          reviewedReceiptSha256: "0".repeat(64),
        }),
      /RECEIPT_CHANGED/,
    );
    await assert.rejects(() =>
      loadReviewedRecovery({ ...args, root: path.join(root, "child") }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("neither entry provides credential discovery, remote workflow or manifest override", async () => {
  const source = await readFile(
    "scripts/learning/production-entry.mjs",
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /process\.env|process\.argv|console\.log|workflow_dispatch|remotePromotionAllowed\s*=|\bgrant\s|set local role/i,
  );
  const core = await readFile("scripts/learning/transaction-core.mjs", "utf8");
  assert.match(core, /BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE/);
  assert.ok(
    core.indexOf("LEARNING_CONTROLLED_PRIVATE_POST_DRIFT") <
      core.indexOf("commitStarted = true"),
  );
});
