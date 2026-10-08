import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";
import { query, buildDocuments } from "../db/verify-canonical-baseline.mjs";
import {
  reviewPackage,
  migrationPath,
  manifestPath,
  version,
} from "./release-review.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const release = "20261006134804-comun-learning-r0";

export async function loadAtomicPackage() {
  const migrationBytes = await readFile(migrationPath);
  const packet = reviewPackage({
    migrationBytes,
    manifestBytes: await readFile(manifestPath),
    catalog: JSON.parse(await readFile("lib/learning/catalog.json", "utf8")),
  });
  const sql = migrationBytes.toString();
  assert.match(sql, /^begin;\s/i);
  assert.match(sql, /commit;\s*$/i);
  // Bytes are pinned before removing ONLY the reviewed outer transaction.
  return {
    packet,
    sql: sql.replace(/^begin;\s*/i, "").replace(/commit;\s*$/i, ""),
  };
}

export async function readAtomicSnapshot(db) {
  const raw = JSON.parse((await db.query(query)).rows[0].value);
  const compact = buildDocuments(raw).compact;
  const runner = (await db.query(schemaFingerprintQuery)).rows
    .map((row) => Object.values(row)[0])
    .join("\n")
    .replace(/\r\n/g, "\n")
    .trimEnd();
  assert.ok(runner.length, "LEARNING_RUNNER_FINGERPRINT_EMPTY");
  const ledger = (
    await db.query(
      "select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status from public.comun_schema_releases order by release",
    )
  ).rows;
  return { compact, runner: hash(runner), ledger };
}

export async function captureAtomicSnapshot(db) {
  await db.query("BEGIN READ ONLY");
  try {
    assert.equal(
      (
        await db.query(
          "select current_setting('transaction_read_only') as mode",
        )
      ).rows[0].mode,
      "on",
    );
    return await readAtomicSnapshot(db);
  } finally {
    await db.query("ROLLBACK");
  }
}

const school = (name) =>
  typeof name === "string" && name.startsWith("comun_learning_");
export function outsideSchool(canonical) {
  const ownership = {
    relations: "name",
    columns: "table",
    constraints: "table",
    indexes: "table",
    policies: "table",
    functions: "name",
    tableGrants: "table",
    sequenceGrants: "sequence",
    routineGrants: "routine",
    triggers: "table",
  };
  return Object.fromEntries(
    Object.entries(canonical).map(([section, rows]) => [
      section,
      section === "migrations"
        ? rows.filter((v) => v !== version)
        : ownership[section]
          ? rows.filter((row) => !school(row[ownership[section]]))
          : rows,
    ]),
  );
}

export function requireAbsent(snapshot) {
  assert.ok(
    !snapshot.compact.canonical.migrations.includes(version),
    "LEARNING_REPLAY_OR_PARTIAL_BLOCKED",
  );
  assert.ok(
    !snapshot.compact.canonical.relations.some((r) => school(r.name)),
    "LEARNING_REPLAY_OR_PARTIAL_BLOCKED",
  );
  assert.ok(
    !snapshot.compact.canonical.functions.some((f) => school(f.name)),
    "LEARNING_REPLAY_OR_PARTIAL_BLOCKED",
  );
  assert.ok(
    !snapshot.ledger.some((r) => r.release === release),
    "LEARNING_REPLAY_OR_PARTIAL_BLOCKED",
  );
  assert.equal(
    snapshot.compact.security.blockingFindings.length,
    0,
    "LEARNING_CANONICAL_FINDINGS_BLOCKED",
  );
}

export function sameSnapshot(actual, expected) {
  assert.equal(actual.compact.fingerprint, expected.compact.fingerprint);
  assert.equal(actual.runner, expected.runner);
  assert.deepEqual(actual.ledger, expected.ledger);
}

export function requireAtomicConnection(db, env = process.env) {
  const target = db.connectionParameters;
  assert.ok(
    env.COMUN_LEARNING_DISPOSABLE_AUTH === "true" &&
      /^\d+-\d+$/.test(env.COMUN_LEARNING_RUN_ID ?? ""),
    "LEARNING_ATOMIC_DISPOSABLE_CONFIRMATION_REQUIRED",
  );
  assert.ok(
    target?.host === "127.0.0.1" &&
      Number(target.port) === 55432 &&
      (target.database === "postgres" ||
        target.database ===
          `comun_learning_prodlike_${env.COMUN_LEARNING_RUN_ID.replace("-", "_")}`) &&
      (target.user === "postgres" ||
        (target.user === "supabase_admin" &&
          target.database ===
            `comun_learning_prodlike_${env.COMUN_LEARNING_RUN_ID.replace("-", "_")}`)),
    "LEARNING_ATOMIC_LOCAL_DESTINATION_REQUIRED",
  );
  for (const key of [
    "SUPABASE_DB_URL",
    "SUPABASE_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])
    assert.ok(!env[key], "LEARNING_ATOMIC_REMOTE_CREDENTIAL_FORBIDDEN");
}

// Disposable rehearsal only. No CLI for remote promotion; no remote manifest change.
export async function installAtomicDisposable(db, expectedPre, failAt = null) {
  requireAtomicConnection(db);
  assert.ok([null, "schema", "history", "ledger"].includes(failAt));
  const { sql, packet } = await loadAtomicPackage();
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await db.query("select pg_advisory_xact_lock(20261006,134804)");
    const pre = await readAtomicSnapshot(db);
    requireAbsent(pre);
    sameSnapshot(pre, expectedPre);
    // Pinned Supabase image: lend executor rights only inside this disposable
    // transaction. Install as postgres, restore ACLs before fingerprinting.
    // Rollback at any stage restores the original privileges as well.
    const privilegeWindow = db.connectionParameters.user === "supabase_admin";
    if (privilegeWindow) {
      await db.query(
        "grant create on schema public to postgres; grant references on auth.users to postgres; grant insert on supabase_migrations.schema_migrations to postgres; set local role postgres",
      );
    }
    await db.query(sql);
    if (failAt === "schema")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_SCHEMA_FAILURE");
    await db.query(
      "insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3)",
      [version, "comun_learning_r0", [sql]],
    );
    if (failAt === "history")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_HISTORY_FAILURE");
    if (privilegeWindow) {
      await db.query(
        "reset role; revoke create on schema public from postgres; revoke references on auth.users from postgres; revoke insert on supabase_migrations.schema_migrations from postgres; set local role postgres",
      );
    }
    const post = await readAtomicSnapshot(db);
    assert.deepEqual(
      outsideSchool(post.compact.canonical),
      outsideSchool(pre.compact.canonical),
      "LEARNING_OUTSIDE_SCOPE_CHANGED",
    );
    assert.equal(post.compact.security.blockingFindings.length, 0);
    const relations = post.compact.canonical.relations.filter((r) =>
      school(r.name),
    );
    assert.equal(relations.length, 6);
    assert.ok(relations.every((r) => r.kind === "r" && r.rls));
    const functions = post.compact.canonical.functions.filter((f) =>
      school(f.name),
    );
    assert.equal(functions.length, 4);
    assert.ok(functions.every((f) => !f.securityDefiner));
    await db.query(
      "insert into public.comun_schema_releases(release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status) values($1,$2,$3,$4,$5,'applied')",
      [release, migrationPath, packet.migrationSha256, pre.runner, post.runner],
    );
    if (failAt === "ledger")
      throw new Error("LEARNING_DISPOSABLE_INJECTED_LEDGER_FAILURE");
    await db.query("COMMIT");
    return post;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
