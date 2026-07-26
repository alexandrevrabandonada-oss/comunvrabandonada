import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  SoloRunnerError,
  buildSanitizedSecurityDiagnostic,
  executeSql,
  parseJsonOutput,
  parseScalarOutput,
  queryJson,
  queryScalar,
  schemaFingerprintQuery,
  serializeSanitizedSecurityDiagnostic,
  validateBlockingFindings,
  validatePreflightObjects,
  validateCurrentState,
} from "./apply-forward-only.mjs";

const marker = (expected) => (error) =>
  error instanceof SoloRunnerError && error.marker === expected;

const securityBaseline = ({ fingerprint = "a".repeat(64), blockingFindings = [], platformObservations = [] } = {}) => ({
  fingerprint,
  security: { blockingFindings, platformObservations },
});

test("security diagnostic records zero findings without database details", () => {
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({ fingerprint: "pre" }),
    after: securityBaseline({ fingerprint: "post" }),
    beforeLedgerState: "ABSENT",
    afterLedgerState: "PRESENT_ACCEPTED",
  });
  assert.equal(diagnostic.before.blockingFindingsCount, 0);
  assert.equal(diagnostic.after.blockingFindingsCount, 0);
  assert.equal(diagnostic.after.fingerprint, "post");
  assert.equal(diagnostic.after.ledgerState, "PRESENT_ACCEPTED");
});

test("security diagnostic preserves one finding with a sanitized detail", () => {
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: securityBaseline(),
    after: securityBaseline({
      blockingFindings: [{
        classification: "FUNCTION_SECURITY_RISK",
        rule: "DEFINER_EXECUTE",
        object: "public.comun_safe_function(uuid)",
        detail: "postgresql://user:password@database/private-note",
      }],
    }),
    beforeLedgerState: "ABSENT",
    afterLedgerState: "PRESENT_ACCEPTED",
  });
  assert.deepEqual(diagnostic.after.blockingFindings, [{
    classification: "FUNCTION_SECURITY_RISK",
    rule: "DEFINER_EXECUTE",
    object: "public.comun_safe_function(uuid)",
    detail: "security definer execute privilege is exposed",
  }]);
});

test("security diagnostic exposes only the safe role and privilege for a dangerous grant", () => {
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({
      blockingFindings: [{
        classification: "EXCESS_PRIVILEGE",
        rule: "DANGEROUS_RELATION_GRANT",
        object: "public.comun_records",
        detail: "authenticated:TRUNCATE",
      }],
    }),
    after: null,
    beforeLedgerState: "ABSENT",
    afterLedgerState: "NOT_REACHED",
  });
  assert.equal(diagnostic.before.blockingFindings[0].detail, "role=authenticated; privilege=TRUNCATE");
});

test("security diagnostic sorts multiple findings deterministically", () => {
  const findings = [
    { classification: "VIEW_SECURITY_RISK", rule: "VIEW_SECURITY_INVOKER", object: "public.z_view", detail: "ignored" },
    { classification: "EXCESS_PRIVILEGE", rule: "RLS_ENABLED", object: "public.a_table", detail: "ignored" },
  ];
  const first = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({ blockingFindings: findings }), after: null, beforeLedgerState: "ABSENT", afterLedgerState: "NOT_REACHED",
  });
  const second = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({ blockingFindings: [...findings].reverse() }), after: null, beforeLedgerState: "ABSENT", afterLedgerState: "NOT_REACHED",
  });
  assert.deepEqual(first, second);
  assert.equal(first.before.blockingFindingsCount, 2);
});

test("platform observations remain separate from blocking findings", () => {
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({
      platformObservations: [{
        classification: "PLATFORM_MANAGED_OBSERVATION",
        rule: "SUPABASE_ADMIN_DEFAULT_PRIVILEGES",
        object: "schema public",
        detail: "unsafe raw platform default hash=secret",
      }],
    }),
    after: null,
    beforeLedgerState: "ABSENT",
    afterLedgerState: "NOT_REACHED",
  });
  assert.equal(diagnostic.before.blockingFindingsCount, 0);
  assert.equal(diagnostic.before.platformObservationsCount, 1);
  assert.equal(diagnostic.before.platformObservations[0].detail, "managed platform default privileges observed");
});

test("security diagnostic rejects prohibited values and table content", () => {
  assert.throws(
    () => serializeSanitizedSecurityDiagnostic({ formatVersion: 1, tableContent: "private note", after: {} }),
    /SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID/,
  );
  assert.throws(
    () => serializeSanitizedSecurityDiagnostic({ formatVersion: 1, after: { detail: "postgresql://user:password@db/postgres" } }),
    /SOLO_SECURITY_DIAGNOSTIC_SHAPE_INVALID/,
  );
});

test("security diagnostic serialization never exposes a database URL", () => {
  const diagnostic = buildSanitizedSecurityDiagnostic({
    before: securityBaseline({ blockingFindings: [{
      classification: "EXCESS_PRIVILEGE",
      rule: "RLS_ENABLED",
      object: "public.comun_records",
      detail: "postgresql://person:password@db/postgres",
    }] }),
    after: null,
    beforeLedgerState: "ABSENT",
    afterLedgerState: "NOT_REACHED",
  });
  const serialized = serializeSanitizedSecurityDiagnostic(diagnostic);
  assert.doesNotMatch(serialized, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(serialized, /password/i);
});

test("security finding error preserves the canonical runner marker", () => {
  assert.throws(
    () => validateBlockingFindings(securityBaseline({ blockingFindings: [{ rule: "RLS_ENABLED" }] }), 0),
    marker("SOLO_CANONICAL_SECURITY_FINDINGS_REMAIN"),
  );
});

test("legacy tabular psql output is rejected as JSON", () => {
  assert.equal(parseDockerMappedPort("127.0.0.1:49152\n"), 49152);
  assert.equal(parseDockerMappedPort("0.0.0.0:49153\n"), 49153);
  assert.equal(parseDockerMappedPort("[::]:49154\n"), 49154);
  for (const invalid of ["", "127.0.0.1:0\n", "127.0.0.1:49152\n0.0.0.0:49152\n"]) {
    assert.throws(() => parseDockerMappedPort(invalid), /COMUN_TEST_POSTGRES_PORT_INVALID/);
  }
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

test("runner fingerprint query uses the canonical PostgreSQL tab delimiter", () => {
  assert.match(schemaFingerprintQuery, /E'\\t'/);
  assert.doesNotMatch(schemaFingerprintQuery, /E'\\\\t'/);
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
  assert.equal(validateCurrentState(baseline, releaseFixture, () => "__COMUN_RELEASE_LEDGER_ABSENT__"), "PRE");
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

test("post fingerprint accepts only an explicitly recorded legacy ledger tuple", () => {
  const baseline = {
    fingerprint: "post",
    canonical: {
      relations: [{ schema: "public", name: "comun_schema_releases" }],
    },
  };
  const reconciledRelease = {
    ...releaseFixture,
    acceptedLegacyLedgerValues: ["sha|pre|legacy-post"],
  };
  assert.equal(
    validateCurrentState(baseline, reconciledRelease, () => "sha|pre|legacy-post"),
    "POST",
  );
  assert.throws(
    () => validateCurrentState(baseline, reconciledRelease, () => "sha|pre|unknown"),
    marker("SOLO_CANONICAL_RELEASE_LEDGER_MISMATCH"),
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

test("preflight accepts a baseline without the optional legacy onboarding trigger", () => {
  const baseline = {
    canonical: {
      relations: [
        { schema: "public", name: "comun_reports", rls: true },
        { schema: "public", name: "comun_public_reports", rls: false },
      ],
      functions: [],
    },
  };
  assert.doesNotThrow(() => validatePreflightObjects(baseline, "0"));
});

const container = `comun-promotion-runner-pg17-${randomUUID().slice(0, 8)}`;
const network = `comun-promotion-runner-net-${randomUUID().slice(0, 8)}`;
let localUrl;
let localConnection;

export function parseDockerMappedPort(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error("COMUN_TEST_POSTGRES_PORT_INVALID");
  const match = lines[0].match(/^(?:127\.0\.0\.1|0\.0\.0\.0|\[::\]):(\d{1,5})$/);
  const port = Number(match?.[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("COMUN_TEST_POSTGRES_PORT_INVALID");
  return port;
}

export function removeTemporaryPostgres(name) {
  spawnSync("docker", ["rm", "-f", name], { encoding: "utf8" });
}

export function removeTemporaryNetwork(name) {
  spawnSync("docker", ["network", "rm", name], { encoding: "utf8" });
}

export function startTemporaryPostgres(name, dockerNetwork) {
  removeTemporaryPostgres(name);
  removeTemporaryNetwork(dockerNetwork);
  const networkCreated = spawnSync("docker", ["network", "create", dockerNetwork], { encoding: "utf8" });
  if (networkCreated.status !== 0) throw new Error("COMUN_TEST_POSTGRES_NETWORK_START_FAILED");
  let started;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    started = spawnSync("docker", ["run", "-d", "--name", name, "--network", dockerNetwork, "--network-alias", "postgres-test", "-e", "POSTGRES_PASSWORD=local_test_only", "-p", "127.0.0.1::5432", "postgres:17"], { encoding: "utf8" });
    if (started.status === 0) break;
    removeTemporaryPostgres(name);
    if (attempt === 0)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (started?.status !== 0) {
    removeTemporaryNetwork(dockerNetwork);
    throw new Error("COMUN_TEST_POSTGRES_START_FAILED");
  }
  try {
    const mapped = spawnSync("docker", ["port", name, "5432/tcp"], { encoding: "utf8" });
    if (mapped.status !== 0) throw new Error("COMUN_TEST_POSTGRES_PORT_INVALID");
    return parseDockerMappedPort(mapped.stdout);
  } catch (error) {
    removeTemporaryPostgres(name);
    removeTemporaryNetwork(dockerNetwork);
    throw error;
  }
}

before(() => {
  const mappedPort = startTemporaryPostgres(container, network);
  assert.ok(mappedPort >= 1 && mappedPort <= 65535);
  localUrl = "postgresql://postgres:local_test_only@postgres-test:5432/postgres";
  localConnection = { databaseUrl: localUrl, dockerNetwork: network };
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      queryScalar("select 'ready';", localConnection);
      return;
    } catch (error) {
      if (!(error instanceof SoloRunnerError)) throw error;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  removeTemporaryPostgres(container);
  removeTemporaryNetwork(network);
  assert.fail("COMUN_TEST_POSTGRES_NETWORK_NOT_READY");
});

after(() => {
  removeTemporaryPostgres(container);
  removeTemporaryNetwork(network);
});

test("PostgreSQL 17 returns canonical JSON transport", () => {
  assert.deepEqual(
    queryJson("select jsonb_build_object('ok', true)::text;", localConnection),
    { ok: true },
  );
  console.log("COMUN_PSQL_JSON_TRANSPORT_OK");
});

test("PostgreSQL 17 returns canonical scalar transport", () => {
  assert.equal(queryScalar("select 'one-value';", localConnection), "one-value");
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
  executeSql(sql, localConnection);
  executeSql(sql, localConnection);
  assert.equal(
    queryScalar(
      "select migration_sha256 || '|' || pre_fingerprint || '|' || post_fingerprint from public.comun_schema_releases where release='release';",
      localConnection,
    ),
    "sha|pre|post",
  );
  console.log("COMUN_SCHEMA_RELEASE_LEDGER_OK");
  console.log("COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED");
});
