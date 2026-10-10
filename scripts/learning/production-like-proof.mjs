import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { digest, privateCatalogSql, scopeSql } from "./production-pre.mjs";
import {
  captureAtomicSnapshot,
  installAtomicDisposable,
  sameSnapshot,
  requireAtomicConnection,
} from "./atomic-disposable.mjs";
import { migrationHash } from "./release-review.mjs";
import {
  installControlledRehearsal,
  requireControlledConnection,
} from "./controlled-transaction.mjs";

const image =
  "docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52";
const env = process.env;
const container = env.COMUN_LEARNING_PRODLIKE_CONTAINER;
const localPort =
  env.COMUN_LEARNING_CONTROLLED_REHEARSAL === "true" ? "55443" : "55432";
const requireConnection =
  env.COMUN_LEARNING_CONTROLLED_REHEARSAL === "true"
    ? requireControlledConnection
    : requireAtomicConnection;
const owned = () => {
  const item = JSON.parse(
    execFileSync("docker", ["inspect", container], { encoding: "utf8" }),
  )[0];
  assert.equal(item.Config.Image, image);
  assert.equal(
    item.Config.Labels["comun.learning.run"],
    env.COMUN_LEARNING_RUN_ID,
  );
  assert.equal(item.NetworkSettings.Ports["5432/tcp"][0].HostIp, "127.0.0.1");
  assert.equal(item.NetworkSettings.Ports["5432/tcp"][0].HostPort, localPort);
};
const captureBytes = await readFile(
  ".ci-artifacts/learning-production-pre/capture.json",
);
const capture = JSON.parse(captureBytes);
const controlled = env.COMUN_LEARNING_CONTROLLED_REHEARSAL === "true";
const install = controlled
  ? (db, _pre, stage, contract) =>
      installControlledRehearsal(db, capture, contract, stage)
  : installAtomicDisposable;
// Previously reviewed derivation, never recalculate expectations from this run.
const contract = JSON.parse(
  await readFile(
    "reports/current/comun-escola-production-like-derived.json",
    "utf8",
  ),
);
assert.equal(contract.migrationSha256, migrationHash);
assert.equal(contract.remotePromotionAllowed, false);
assert.equal(
  capture.status,
  "COMUN_LEARNING_PRE_CAPTURED_AWAITING_DISPOSABLE_EQUIVALENCE",
);
assert.equal(capture.sourceSha, env.GITHUB_SHA);
assert.equal(capture.run, env.GITHUB_RUN_ID);
assert.equal(capture.transactionReadOnly, true);
assert.equal(capture.rollback, "CONFIRMED");
assert.equal(capture.schemaWrites, 0);
assert.equal(capture.ledgerWrites, 0);
assert.equal(capture.privateCatalogSha256, digest(capture.privateCatalog));
for (const [section, value] of Object.entries(
  capture.snapshot.compact.canonical,
))
  assert.equal(digest(value), capture.canonicalSectionHashes[section]);
let db = new pg.Client({
  connectionString: env.COMUN_DISPOSABLE_DB_URL.replace(
    "postgres:postgres@",
    "supabase_admin:postgres@",
  ),
});
requireConnection(db);
owned();
const privateSnapshot = async () =>
  (await db.query(privateCatalogSql)).rows[0].value;
const capabilities = async () =>
  (await db.query(scopeSql)).rows[0].value.executorCapabilities;
try {
  await db.connect();
  assert.equal(
    capture.scope.databaseOwner,
    "postgres",
    "LEARNING_DATABASE_OWNER_UNREVIEWED",
  );
  assert.equal(
    capture.scope.publicSchemaOwner,
    "pg_database_owner",
    "LEARNING_PUBLIC_SCHEMA_OWNER_UNREVIEWED",
  );
  // The historical dump/bootstrap intentionally removes these executor grants.
  // Reproduce only the four positive capabilities captured on Production.
  // This changes the owned synthetic fixture, never Production permissions.
  assert.deepEqual(
    capture.scope.executorCapabilities,
    {
      role: "postgres",
      superuser: false,
      createPublic: true,
      referencesAuthUsers: true,
      insertMigrationHistory: true,
      insertReleaseLedger: true,
    },
    "LEARNING_PRODUCTION_EXECUTOR_CAPABILITIES_UNREVIEWED",
  );
  owned();
  await db.query(
    "grant references on auth.users to postgres; grant insert on supabase_migrations.schema_migrations to postgres",
  );
  // End bootstrap authority. The release transaction must authenticate as the
  // same postgres principal captured on Production, not an admin SET ROLE.
  await db.end();
  db = new pg.Client({ connectionString: env.COMUN_DISPOSABLE_DB_URL });
  requireConnection(db);
  owned();
  await db.connect();
  // information_schema visibility depends on current_user. Match the captured
  // postgres reader; administrator remains only the guarded transaction owner.
  owned();
  await db.query("set role postgres");
  assert.equal(typeof capture.scope.searchPath, "string");
  await db.query("select set_config('search_path',$1,false)", [
    capture.scope.searchPath,
  ]);
  assert.equal(
    (await db.query("select current_user as role")).rows[0].role,
    capture.scope.currentUser,
  );
  const r5 = JSON.parse(
    await readFile(
      "supabase/release-bundles/20260927-comun-49-2-r5-public-projection-gate.json",
      "utf8",
    ),
  );
  owned();
  await db.query(
    "insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status) values($1,$2,$3,$4,$5,'applied')",
    [
      r5.release,
      r5.releaseLedger.migrationPath,
      r5.migrationSetSha256,
      r5.expectedPreFingerprint,
      r5.expectedPostFingerprint,
    ],
  );
  const pre = await captureAtomicSnapshot(db);
  // The historical schema fixture intentionally carries only the v2 ledger.
  // Restore missing technical release rows from this run's sanitized capture,
  // never business data. Existing rows are never overwritten or deleted.
  for (const row of capture.snapshot.ledger) {
    if (pre.ledger.some((r) => r.release === row.release)) continue;
    owned();
    await db.query(
      "insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status) values($1,$2,$3,$4,$5,$6)",
      [
        row.release,
        row.migration_path,
        row.migration_sha256,
        row.pre_fingerprint,
        row.post_fingerprint,
        row.status,
      ],
    );
  }
  const restoredPre = await captureAtomicSnapshot(db);
  pre.ledger = restoredPre.ledger;
  await mkdir(".ci-artifacts/learning-production-like", { recursive: true });
  const identity = (
    await db.query(
      "select current_user as current_user,session_user as session_user,current_setting('search_path') as search_path",
    )
  ).rows[0];
  assert.equal(
    identity.session_user,
    capture.scope.sessionUser,
    "LEARNING_EXECUTOR_SESSION_IDENTITY_MISMATCH",
  );
  assert.equal(db.connectionParameters.user, "postgres");
  await writeFile(
    ".ci-artifacts/learning-production-like/pre-equivalence.json",
    JSON.stringify(
      {
        identity,
        productionIdentity: capture.scope,
        expectedCanonical: capture.snapshot.compact.fingerprint,
        actualCanonical: pre.compact.fingerprint,
        sections: Object.fromEntries(
          Object.entries(pre.compact.canonical).map(([key, value]) => [
            key,
            {
              expected: capture.canonicalSectionHashes[key],
              actual: digest(value),
              ...(digest(value) !== capture.canonicalSectionHashes[key]
                ? {
                    expectedRows: capture.snapshot.compact.canonical[key],
                    actualRows: value,
                  }
                : {}),
            },
          ]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  sameSnapshot(pre, capture.snapshot);
  const localScope = (await db.query(scopeSql)).rows[0].value;
  assert.equal(localScope.databaseOwner, capture.scope.databaseOwner);
  assert.equal(localScope.publicSchemaOwner, capture.scope.publicSchemaOwner);
  const preCapabilities = await capabilities();
  assert.deepEqual(
    preCapabilities,
    capture.scope.executorCapabilities,
    "LEARNING_EXECUTOR_CAPABILITY_PRE_DRIFT",
  );
  assert.equal(
    (await db.query("show server_version")).rows[0].server_version,
    capture.scope.serverVersion,
  );
  assert.deepEqual(
    await privateSnapshot(),
    capture.privateCatalog,
    "LEARNING_PRIVATE_PRE_FIXTURE_DRIFT",
  );
  for (const stage of ["schema", "history", "ledger"]) {
    owned();
    await assert.rejects(
      () => install(db, pre, stage, contract),
      /LEARNING_DISPOSABLE_INJECTED_/,
    );
    sameSnapshot(await captureAtomicSnapshot(db), pre);
    assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
    assert.deepEqual(
      await capabilities(),
      preCapabilities,
      "LEARNING_EXECUTOR_PRIVILEGES_NOT_RESTORED",
    );
  }
  owned();
  await assert.rejects(
    () => install(db, pre, "post-drift", contract),
    /LEARNING_RELEASE_CANONICAL_DIVERGED/,
  );
  sameSnapshot(await captureAtomicSnapshot(db), pre);
  assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  assert.deepEqual(
    await capabilities(),
    preCapabilities,
    "LEARNING_EXECUTOR_PRIVILEGES_NOT_RESTORED",
  );
  owned();
  await assert.rejects(
    () => install(db, pre, "ledger-drift", contract),
    /LEARNING_ATOMIC_LEDGER_DIVERGED/,
  );
  sameSnapshot(await captureAtomicSnapshot(db), pre);
  assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  assert.deepEqual(
    await capabilities(),
    preCapabilities,
    "LEARNING_EXECUTOR_PRIVILEGES_NOT_RESTORED",
  );
  owned();
  if (controlled) {
    owned();
    await assert.rejects(
      () => install(db, pre, "private-drift", contract),
      /LEARNING_CONTROLLED_PRIVATE_POST_DRIFT/,
    );
    sameSnapshot(await captureAtomicSnapshot(db), pre);
    assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  }
  let expectedPost;
  if (controlled) {
    const lostCommitResponse = {
      connectionParameters: db.connectionParameters,
      query: async (...args) => {
        const result = await db.query(...args);
        if (args[0] === "COMMIT")
          throw new Error("SYNTHETIC_COMMIT_RESPONSE_LOST");
        return result;
      },
    };
    await assert.rejects(
      () => install(lostCommitResponse, pre, null, contract),
      /LEARNING_CONTROLLED_COMMIT_OUTCOME_UNKNOWN_REQUIRE_READ_ONLY_RECONCILIATION/,
    );
    expectedPost = await captureAtomicSnapshot(db);
    assert.equal(expectedPost.compact.fingerprint, contract.postCanonical);
    assert.equal(expectedPost.runner, contract.postRunner);
  } else {
    expectedPost = await install(db, pre, null, contract);
  }
  const post = await captureAtomicSnapshot(db);
  assert.equal(post.compact.fingerprint, expectedPost.compact.fingerprint);
  assert.equal(post.runner, expectedPost.runner);
  assert.deepEqual(
    post.ledger.filter((r) => r.release !== "20261006134804-comun-learning-r0"),
    pre.ledger,
  );
  const added = post.ledger.filter(
    (r) => r.release === "20261006134804-comun-learning-r0",
  );
  assert.equal(added.length, 1);
  assert.equal(added[0].migration_sha256, migrationHash);
  assert.equal(added[0].pre_fingerprint, pre.runner);
  assert.equal(added[0].post_fingerprint, post.runner);
  owned();
  await assert.rejects(
    () =>
      controlled
        ? install(db, post, null, contract)
        : installAtomicDisposable(db, post),
    /LEARNING_REPLAY_OR_PARTIAL_BLOCKED/,
  );
  sameSnapshot(await captureAtomicSnapshot(db), post);
  owned();
  sameSnapshot(await captureAtomicSnapshot(db), post);
  assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  assert.deepEqual(
    await capabilities(),
    preCapabilities,
    "LEARNING_EXECUTOR_PRIVILEGES_NOT_RESTORED",
  );
  const counts = (
    await db.query(
      "select (select count(*)::int from public.comun_learning_units) units,(select count(*)::int from public.comun_learning_resources) resources,(select count(*)::int from public.comun_learning_enrollments) enrollments,(select count(*)::int from public.comun_learning_progress) progress,(select count(*)::int from public.comun_learning_practice_links) practices",
    )
  ).rows[0];
  assert.deepEqual(counts, {
    units: 28,
    resources: 4,
    enrollments: 0,
    progress: 0,
    practices: 0,
  });
  const proof = {
    status: "COMUN_LEARNING_PRODUCTION_LIKE_ATOMIC_DISPOSABLE_GREEN",
    controlledRehearsal: controlled,
    privateCatalogVerifiedBeforeCommit: controlled,
    privateDriftRejectedAndPreRestored: controlled,
    productionEntryImplemented: false,
    executionEnvironment:
      env.GITHUB_ACTIONS === "true" ? "GITHUB_ACTIONS" : "LOCAL",
    lostCommitResponseReconciledReadOnly: controlled,
    testedSourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    testedSourceTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
      encoding: "utf8",
    }).trim(),
    sourceSha: capture.sourceSha,
    sourceTree: capture.sourceTree,
    run: env.GITHUB_RUN_ID,
    captureSha256: (await import("node:crypto"))
      .createHash("sha256")
      .update(captureBytes)
      .digest("hex"),
    image,
    postgresVersion: capture.scope.serverVersion,
    preCanonical: pre.compact.fingerprint,
    preRunner: pre.runner,
    postCanonical: post.compact.fingerprint,
    postRunner: post.runner,
    schoolStructure: Object.fromEntries(
      Object.entries(post.compact.canonical)
        .filter(([, rows]) => Array.isArray(rows))
        .map(([key, rows]) => [
          key,
          rows.filter(
            (r) =>
              typeof r === "object" &&
              [r.name, r.table, r.sequence, r.routine].some((n) =>
                n?.startsWith("comun_learning_"),
              ),
          ),
        ]),
    ),
    preLedgerSha256: digest(pre.ledger),
    postLedgerSha256: digest(post.ledger),
    privateCatalogUnchanged: true,
    catalogReader: capture.scope.currentUser,
    syntheticCounts: counts,
    blockingFindings: post.compact.security.blockingFindings.length,
    rollbackStages: ["schema", "history", "ledger"],
    replayRefused: true,
    approvedPostEnforcedBeforeCommit: true,
    postDriftRejectedAndPreRestored: true,
    ledgerVerifiedBeforeCommit: true,
    ledgerDriftRejectedAndPreRestored: true,
    executorCapabilities: preCapabilities,
    executorPrivilegesRestored: true,
    executorSessionUser: identity.session_user,
    releaseUsesBootstrapAdministrator: false,
    executorDatabaseOwner: capture.scope.databaseOwner,
    publicSchemaOwner: capture.scope.publicSchemaOwner,
    remotePromotionAllowed: false,
    promotionReady: false,
    providerBackupProved: false,
    productionSchemaWrites: 0,
    productionBusinessWrites: 0,
  };
  await mkdir(".ci-artifacts/learning-production-like", { recursive: true });
  await writeFile(
    ".ci-artifacts/learning-production-like/proof.json",
    JSON.stringify(proof, null, 2) + "\n",
  );
  console.log(proof.status);
} finally {
  await db.end();
}
