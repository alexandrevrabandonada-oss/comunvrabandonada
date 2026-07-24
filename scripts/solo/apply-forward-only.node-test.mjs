import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  SoloRunnerError,
  executeSql,
  parseJsonOutput,
  parseScalarOutput,
  queryJson,
  queryScalar,
  validatePreflightObjects,
  validateCurrentState,
} from "./apply-forward-only.mjs";

const marker = (expected) => (error) =>
  error instanceof SoloRunnerError && error.marker === expected;

test("legacy tabular psql output is rejected as JSON", () => {
  assert.throws(
    () => parseJsonOutput(" jsonb_build_object\n--------------------\n {\"ok\": true}\n(1 row)\n"),
    marker("SOLO_CANONICAL_BASELINE_OUTPUT_INVALID"),
  );
});

test("canonical query flags produce parseable JSON", () => {
  let receivedArgs = [];
  const value = queryJson("select 1", {
    databaseUrl: "postgresql://redacted.invalid/db",
    spawn: (_command, args) => {
      receivedArgs = args;
      return { status: 0, signal: null, stdout: "{\"ok\":true}\n", stderr: "" };
    },
  });
  assert.deepEqual(value, { ok: true });
  assert.ok(receivedArgs.includes("--tuples-only"));
  assert.ok(receivedArgs.includes("--no-align"));
  assert.ok(receivedArgs.includes("--quiet"));
  assert.ok(receivedArgs.includes("--no-psqlrc"));
});

test("scalar accepts exactly one non-empty line", () => {
  assert.equal(parseScalarOutput("value\n"), "value");
});

test("scalar rejects a header", () => {
  assert.throws(
    () => parseScalarOutput("header\nvalue\n"),
    marker("SOLO_CANONICAL_SCALAR_OUTPUT_INVALID"),
  );
});

test("scalar rejects two result lines", () => {
  assert.throws(
    () => parseScalarOutput("one\ntwo\n"),
    marker("SOLO_CANONICAL_SCALAR_OUTPUT_INVALID"),
  );
});

test("scalar rejects unexpected surrounding spaces", () => {
  assert.throws(
    () => parseScalarOutput(" value \n"),
    marker("SOLO_CANONICAL_SCALAR_OUTPUT_INVALID"),
  );
});

test("empty JSON stdout has a specific marker", () => {
  assert.throws(
    () => parseJsonOutput(" \n"),
    marker("SOLO_CANONICAL_BASELINE_OUTPUT_EMPTY"),
  );
});

test("ENOBUFS has a specific marker", () => {
  assert.throws(
    () => queryJson("select 1", {
      databaseUrl: "postgresql://redacted.invalid/db",
      spawn: () => ({ error: Object.assign(new Error("buffer"), { code: "ENOBUFS" }), status: null }),
    }),
    marker("SOLO_PSQL_OUTPUT_BUFFER_EXCEEDED"),
  );
});

test("connection failure is sanitized", () => {
  const secretUrl = "postgresql://user:password-that-must-not-leak@invalid/db";
  assert.throws(
    () => queryJson("select 1", {
      databaseUrl: secretUrl,
      spawn: () => ({ status: 2, signal: null, stdout: "", stderr: `psql: ${secretUrl}` }),
    }),
    (error) => marker("SOLO_CANONICAL_DATABASE_QUERY_FAILED")(error)
      && !error.message.includes("password-that-must-not-leak")
      && !error.message.includes(secretUrl),
  );
});

test("transaction failure is distinct from query failure", () => {
  assert.throws(
    () => executeSql("begin; select 1; commit;", {
      databaseUrl: "postgresql://redacted.invalid/db",
      spawn: () => ({ status: 3, signal: null, stdout: "", stderr: "" }),
    }),
    marker("SOLO_CANONICAL_DATABASE_TRANSACTION_FAILED"),
  );
});

const releaseFixture = {
  expectedPreFingerprint: "pre",
  expectedPostFingerprint: "post",
  migrationSha256: "sha",
};

test("pre fingerprint with absent ledger is valid", () => {
  const baseline = {
    fingerprint: "pre",
    canonical: { relations: [] },
  };
  assert.equal(validateCurrentState(baseline, releaseFixture), "PRE");
});

test("post fingerprint with the exact ledger is valid", () => {
  const baseline = {
    fingerprint: "post",
    canonical: {
      relations: [{ schema: "public", name: "comun_schema_releases" }],
    },
  };
  assert.equal(
    validateCurrentState(baseline, releaseFixture, () => "sha|pre|post"),
    "POST",
  );
});

test("preflight validates the auth trigger outside the compact public projection", () => {
  const baseline = {
    canonical: {
      relations: [
        { schema: "public", name: "comun_reports", rls: true },
        { schema: "public", name: "comun_public_reports", rls: false },
      ],
      functions: [{ schema: "public", name: "handle_new_user" }],
      triggers: [],
    },
  };
  assert.doesNotThrow(() => validatePreflightObjects(baseline, "1"));
  assert.throws(
    () => validatePreflightObjects(baseline, "0"),
    marker("SOLO_CANONICAL_PREFLIGHT_OBJECTS_INVALID"),
  );
});

const container = `comun-promotion-runner-pg17-${randomUUID().slice(0, 8)}`;
const port = "55441";
const localUrl = `postgresql://postgres:local_test_only@host.docker.internal:${port}/postgres`;

before(() => {
  const started = spawnSync(
    "docker",
    ["run", "-d", "--name", container, "-e", "POSTGRES_PASSWORD=local_test_only", "-p", `${port}:5432`, "postgres:17"],
    { encoding: "utf8" },
  );
  assert.equal(started.status, 0, started.stderr);
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const ready = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"]);
    if (ready.status === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  assert.fail("PostgreSQL 17 did not become ready");
});

after(() => {
  spawnSync("docker", ["rm", "-f", container]);
});

test("PostgreSQL 17 returns canonical JSON transport", () => {
  assert.deepEqual(
    queryJson("select jsonb_build_object('ok', true)::text;", { databaseUrl: localUrl }),
    { ok: true },
  );
  console.log("COMUN_PSQL_JSON_TRANSPORT_OK");
});

test("PostgreSQL 17 returns canonical scalar transport", () => {
  assert.equal(queryScalar("select 'one-value';", { databaseUrl: localUrl }), "one-value");
  console.log("COMUN_PSQL_SCALAR_TRANSPORT_OK");
});

test("PostgreSQL 17 ledger transaction is readable and idempotent", () => {
  const sql = `
    begin;
    create table if not exists public.comun_schema_releases (
      release text primary key,
      migration_sha256 text not null,
      pre_fingerprint text not null,
      post_fingerprint text not null
    );
    insert into public.comun_schema_releases values ('release','sha','pre','post')
    on conflict (release) do nothing;
    commit;
  `;
  executeSql(sql, { databaseUrl: localUrl });
  executeSql(sql, { databaseUrl: localUrl });
  assert.equal(
    queryScalar(
      "select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint from public.comun_schema_releases where release='release';",
      { databaseUrl: localUrl },
    ),
    "sha|pre|post",
  );
  console.log("COMUN_SCHEMA_RELEASE_LEDGER_OK");
  console.log("COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED");
});
