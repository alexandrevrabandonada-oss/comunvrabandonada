import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { readSupabaseLocalEnv } from "../ci/read-supabase-local-env.mjs";
import {
  disposableContext,
  assertOwnedContainers,
} from "./disposable-boundary.mjs";
import {
  captureAtomicSnapshot,
  installAtomicDisposable,
  requireAbsent,
  sameSnapshot,
} from "./atomic-disposable.mjs";
import { migrationHash } from "./release-review.mjs";

const result = readSupabaseLocalEnv();
assert.ok(result.ok);
const values = Object.fromEntries(
  result.output
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)="(.*)"$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const context = disposableContext({
  ...process.env,
  COMUN_LEARNING_LOCAL_API_URL: values.API_URL,
  COMUN_LEARNING_LOCAL_DATABASE_URL: values.DB_URL,
  COMUN_LEARNING_LOCAL_ANON_KEY: values.ANON_KEY,
  COMUN_LEARNING_LOCAL_SERVICE_KEY: values.SERVICE_ROLE_KEY,
});
assertOwnedContainers(context);
const db = new pg.Client({
  connectionString: context.database,
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
});
const digest = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
try {
  await db.connect();
  const pre = await captureAtomicSnapshot(db);
  requireAbsent(pre);
  for (const stage of ["schema", "history", "ledger"]) {
    await assert.rejects(
      () => installAtomicDisposable(db, pre, stage),
      /LEARNING_DISPOSABLE_INJECTED_/,
    );
    sameSnapshot(await captureAtomicSnapshot(db), pre);
  }
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
  await assert.rejects(
    () => installAtomicDisposable(db, post),
    /LEARNING_REPLAY_OR_PARTIAL_BLOCKED/,
  );
  sameSnapshot(await captureAtomicSnapshot(db), post);
  const counts = (
    await db.query(
      "select (select count(*)::int from comun_learning_units) units,(select count(*)::int from comun_learning_resources) resources,(select count(*)::int from comun_learning_enrollments) enrollments,(select count(*)::int from comun_learning_progress) progress,(select count(*)::int from comun_learning_practice_links) practices",
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
    status: "COMUN_LEARNING_ATOMIC_CANONICAL_DISPOSABLE_GREEN",
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    migrationSha256: migrationHash,
    preCanonical: pre.compact.fingerprint,
    postCanonical: post.compact.fingerprint,
    preRunner: pre.runner,
    postRunner: post.runner,
    preLedgerHash: digest(pre.ledger),
    postLedgerHash: digest(post.ledger),
    rollbackStages: ["schema", "history", "ledger"],
    replayRefused: true,
    otherDomainsUnchanged: true,
    promotionReady: false,
    remotePromotionAllowed: false,
    featureFlagChanges: 0,
    scope: "canonical-disposable-only",
  };
  await mkdir(".ci-artifacts/learning-atomic", { recursive: true });
  await writeFile(
    ".ci-artifacts/learning-atomic/proof.json",
    `${JSON.stringify(proof, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(proof.status);
} finally {
  await db.end();
}
