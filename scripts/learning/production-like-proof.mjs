import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { digest, privateCatalogSql } from "./production-pre.mjs";
import {
  captureAtomicSnapshot,
  installAtomicDisposable,
  sameSnapshot,
  requireAtomicConnection,
} from "./atomic-disposable.mjs";
import { migrationHash } from "./release-review.mjs";

const image =
  "docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52";
const env = process.env;
const container = env.COMUN_LEARNING_PRODLIKE_CONTAINER;
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
  assert.equal(item.NetworkSettings.Ports["5432/tcp"][0].HostPort, "55432");
};
const captureBytes = await readFile(
  ".ci-artifacts/learning-production-pre/capture.json",
);
const capture = JSON.parse(captureBytes);
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
const db = new pg.Client({ connectionString: env.COMUN_DISPOSABLE_DB_URL });
requireAtomicConnection(db);
owned();
const admin = new pg.Client({
  connectionString: env.COMUN_DISPOSABLE_DB_URL.replace(
    "postgres:postgres@",
    "supabase_admin:postgres@",
  ),
});
const privateSnapshot = async () =>
  (await db.query(privateCatalogSql)).rows[0].value;
try {
  await db.connect();
  await admin.connect();
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
  sameSnapshot(pre, capture.snapshot);
  assert.equal(
    (await db.query("show server_version")).rows[0].server_version,
    capture.scope.serverVersion,
  );
  assert.deepEqual(
    await privateSnapshot(),
    capture.privateCatalog,
    "LEARNING_PRIVATE_PRE_FIXTURE_DRIFT",
  );
  // Temporary local executor rights, absent from the release itself. Restore
  // them before the final equivalence capture, including on injected failure.
  owned();
  await admin.query(
    "grant create on schema public to postgres; grant insert on supabase_migrations.schema_migrations to postgres",
  );
  const executablePre = await captureAtomicSnapshot(db);
  sameSnapshot(executablePre, pre);
  for (const stage of ["schema", "history", "ledger"]) {
    owned();
    await assert.rejects(
      () => installAtomicDisposable(db, pre, stage),
      /LEARNING_DISPOSABLE_INJECTED_/,
    );
    sameSnapshot(await captureAtomicSnapshot(db), pre);
    assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  }
  owned();
  const expectedPost = await installAtomicDisposable(db, pre);
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
    () => installAtomicDisposable(db, post),
    /LEARNING_REPLAY_OR_PARTIAL_BLOCKED/,
  );
  sameSnapshot(await captureAtomicSnapshot(db), post);
  owned();
  await admin.query(
    "revoke create on schema public from postgres; revoke insert on supabase_migrations.schema_migrations from postgres",
  );
  sameSnapshot(await captureAtomicSnapshot(db), post);
  assert.deepEqual(await privateSnapshot(), capture.privateCatalog);
  const proof = {
    status: "COMUN_LEARNING_PRODUCTION_LIKE_ATOMIC_DISPOSABLE_GREEN",
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
    rollbackStages: ["schema", "history", "ledger"],
    replayRefused: true,
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
  await admin.end();
}
