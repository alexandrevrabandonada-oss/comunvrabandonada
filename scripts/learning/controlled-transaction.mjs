import assert from "node:assert/strict";
import {
  loadAtomicPackage,
  readAtomicSnapshot,
  sameSnapshot,
  requireAbsent,
  requireAtomicConnection,
  requireReleaseFingerprint,
  outsideSchool,
} from "./atomic-disposable.mjs";
import { privateCatalogSql, scopeSql } from "./production-pre.mjs";
import { migrationPath, version } from "./release-review.mjs";

const release = "20261006134804-comun-learning-r0";
export const expectedCapabilities = {
  role: "postgres",
  superuser: false,
  createPublic: true,
  referencesAuthUsers: true,
  insertMigrationHistory: true,
  insertReleaseLedger: true,
};

export function requireControlledConnection(db, env = process.env) {
  assert.equal(
    env.COMUN_LEARNING_CONTROLLED_REHEARSAL,
    "true",
    "LEARNING_CONTROLLED_REHEARSAL_REQUIRED",
  );
  assert.equal(
    Number(db.connectionParameters?.port),
    55443,
    "LEARNING_CONTROLLED_LOCAL_PORT_REQUIRED",
  );
  // Same host, role, run database and no-Production-secret policy as the original
  // fixture, with a separate fixed loopback port to preserve existing labs.
  requireAtomicConnection(
    { connectionParameters: { ...db.connectionParameters, port: 55432 } },
    env,
  );
}

export function requireExecutorScope(scope, expected) {
  assert.deepEqual(
    scope.executorCapabilities,
    expectedCapabilities,
    "LEARNING_CONTROLLED_EXECUTOR_PRIVILEGES_REQUIRED",
  );
  for (const key of [
    "currentUser",
    "sessionUser",
    "databaseOwner",
    "publicSchemaOwner",
    "serverVersion",
    "searchPath",
  ])
    assert.equal(
      scope[key],
      expected[key],
      `LEARNING_CONTROLLED_SCOPE_DRIFT:${key}`,
    );
  assert.equal(scope.currentUser, "postgres");
  assert.equal(scope.sessionUser, "postgres");
}

export function requireControlledPost(pre, post, contract) {
  requireReleaseFingerprint(post, contract, "post");
  assert.deepEqual(
    outsideSchool(post.compact.canonical),
    outsideSchool(pre.compact.canonical),
    "LEARNING_CONTROLLED_OUTSIDE_SCOPE_CHANGED",
  );
  assert.equal(post.compact.security.blockingFindings.length, 0);
  const relations = post.compact.canonical.relations.filter((r) =>
    r.name.startsWith("comun_learning_"),
  );
  const functions = post.compact.canonical.functions.filter((f) =>
    f.name.startsWith("comun_learning_"),
  );
  assert.equal(relations.length, 6);
  assert.ok(relations.every((r) => r.kind === "r" && r.rls));
  assert.equal(functions.length, 4);
  assert.ok(functions.every((f) => !f.securityDefiner));
}

// Rehearsal entry only: preserves the existing loopback/run guard. Production
// requires a separately reviewed destination/recovery authorization adapter.
// No remote CLI, credential lookup, privilege borrowing or manifest override.
export async function installControlledRehearsal(
  db,
  capture,
  contract,
  failAt = null,
) {
  requireControlledConnection(db);
  assert.ok(
    [
      null,
      "schema",
      "history",
      "ledger",
      "post-drift",
      "ledger-drift",
      "private-drift",
    ].includes(failAt),
  );
  assert.equal(
    capture.privateCatalogSha256,
    (await import("./production-pre.mjs")).digest(capture.privateCatalog),
  );
  assert.equal(capture.transactionReadOnly, true);
  assert.equal(capture.schemaWrites, 0);
  assert.equal(capture.ledgerWrites, 0);
  requireReleaseFingerprint(capture.snapshot, contract, "pre");
  const { sql, packet } = await loadAtomicPackage();
  let commitStarted = false;
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await db.query(
      "SET LOCAL lock_timeout = '10s'; SET LOCAL statement_timeout = '60s'",
    );
    await db.query("select pg_advisory_xact_lock(20261006,134804)");
    const scope = (await db.query(scopeSql)).rows[0].value;
    requireExecutorScope(scope, capture.scope);
    const privatePre = (await db.query(privateCatalogSql)).rows[0].value;
    assert.deepEqual(
      privatePre,
      capture.privateCatalog,
      "LEARNING_CONTROLLED_PRIVATE_PRE_DRIFT",
    );
    const pre = await readAtomicSnapshot(db);
    requireAbsent(pre);
    sameSnapshot(pre, capture.snapshot);
    await db.query(sql);
    if (failAt === "schema")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_SCHEMA_FAILURE");
    await db.query(
      "insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)",
      [version, "comun_learning_r0", [sql]],
    );
    if (failAt === "history")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_HISTORY_FAILURE");
    if (failAt === "post-drift")
      await db.query(
        "alter table public.comun_learning_units add column synthetic_release_drift boolean",
      );
    const post = await readAtomicSnapshot(db);
    requireControlledPost(pre, post, contract);
    await db.query(
      "insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status) values($1,$2,$3,$4,$5,'applied')",
      [release, migrationPath, packet.migrationSha256, pre.runner, post.runner],
    );
    if (failAt === "ledger")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_LEDGER_FAILURE");
    if (failAt === "ledger-drift")
      await db.query(
        "update public.comun_schema_releases set post_fingerprint=$1 where release=$2",
        ["0".repeat(64), release],
      );
    if (failAt === "private-drift")
      await db.query(
        "alter table private.comun_relata_collective_entities add column synthetic_release_drift boolean",
      );
    const final = await readAtomicSnapshot(db);
    assert.equal(
      final.compact.fingerprint,
      post.compact.fingerprint,
      "LEARNING_CONTROLLED_LEDGER_CHANGED_SCHEMA",
    );
    assert.equal(
      final.runner,
      post.runner,
      "LEARNING_CONTROLLED_LEDGER_CHANGED_SCHEMA",
    );
    assert.deepEqual(
      final.ledger,
      [
        ...pre.ledger,
        {
          release,
          migration_path: migrationPath,
          migration_sha256: packet.migrationSha256,
          pre_fingerprint: pre.runner,
          post_fingerprint: post.runner,
          status: "applied",
        },
      ].sort((a, b) => a.release.localeCompare(b.release)),
      "LEARNING_ATOMIC_LEDGER_DIVERGED",
    );
    // Critical: private scope and privileges are checked INSIDE the transaction,
    // before COMMIT, rather than relying on a post-commit assertion in a harness.
    assert.deepEqual(
      (await db.query(privateCatalogSql)).rows[0].value,
      privatePre,
      "LEARNING_CONTROLLED_PRIVATE_POST_DRIFT",
    );
    requireExecutorScope(
      (await db.query(scopeSql)).rows[0].value,
      capture.scope,
    );
    commitStarted = true;
    await db.query("COMMIT");
    return post;
  } catch (error) {
    if (commitStarted) {
      // A lost COMMIT response is not evidence of rollback. Never auto-retry.
      throw new Error(
        "LEARNING_CONTROLLED_COMMIT_OUTCOME_UNKNOWN_REQUIRE_READ_ONLY_RECONCILIATION",
        { cause: error },
      );
    }
    try {
      await db.query("ROLLBACK");
    } catch (rollbackError) {
      throw new Error("LEARNING_CONTROLLED_ROLLBACK_UNCONFIRMED", {
        cause: rollbackError,
      });
    }
    throw error;
  }
}
