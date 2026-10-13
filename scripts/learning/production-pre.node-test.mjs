import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  captureProductionPre,
  classifyPre,
  ledgerStates,
  connectionOptions,
  scopeSql,
  privateCatalogSql,
  migrationVersion,
} from "./production-pre.mjs";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";

const input = () => {
  const releases = Array.from({ length: 5 }, (_, i) => ({
    release: `release-${i}`,
    migration: `supabase/migrations/20260922120000_${i}.sql`,
    migrationSha256: `hash-${i}`,
    expectedPreFingerprint: `pre-${i}`,
    expectedPostFingerprint: "runner",
    expectedPostCanonicalFingerprint: "canonical",
    postgresVersion: "17.6",
  }));
  return {
    releases,
    localVersions: ["20260810194054", "20261006134804"],
    metadata: {
      read_only: "on",
      history_present: false,
      relations: [],
      functions: [],
    },
    scope: {
      readOnly: "on",
      currentUser: "postgres",
      database: "postgres",
      serverVersion: "17.6.1",
      p4ProjectionPresent: true,
      p4ProjectionRlsEnabled: true,
      p4PublicGeometryPresent: true,
      p6cCApplied: true,
    },
    snapshot: {
      runner: "runner",
      compact: {
        fingerprint: "canonical",
        canonical: { migrations: ["20260810194054"] },
        security: { blockingFindings: [] },
      },
      ledger: releases.map((m) => ({
        release: m.release,
        migration_path: m.migration,
        migration_sha256: m.migrationSha256,
        pre_fingerprint: m.expectedPreFingerprint,
        post_fingerprint: m.expectedPostFingerprint,
        status: "applied",
      })),
    },
  };
};
test("migration inventory preserves historical 12-digit versions", () => {
  assert.equal(migrationVersion("202605070001_foundation.sql"), "202605070001");
  assert.equal(migrationVersion("20261006134804_school.sql"), "20261006134804");
  assert.equal(migrationVersion("README.md"), undefined);
});
test("existing historical reconciliation requires the exact accepted baseline", () => {
  const i = input();
  i.localVersions.push("20260724233256", "20260922120000");
  assert.deepEqual(classifyPre(i).reasons, []);
  assert.deepEqual(classifyPre(i).actionablePending, ["20261006134804"]);
  i.snapshot.compact.fingerprint = "different";
  assert.ok(classifyPre(i).reasons.includes("BASELINE_FINGERPRINT_DRIFT"));
});
test("exact accepted baseline and absent School captures PRE without granting promotion", () => {
  const result = classifyPre(input());
  assert.deepEqual(result.reasons, []);
  assert.equal(result.promotionReady, false);
  assert.equal(result.remotePromotionAllowed, false);
  assert.equal(result.schoolLedgerState, "ABSENT");
});
for (const [name, change, reason] of [
  [
    "fingerprint",
    (i) => (i.snapshot.compact.fingerprint = "other"),
    "BASELINE_FINGERPRINT_DRIFT",
  ],
  [
    "runner",
    (i) => (i.snapshot.runner = "other"),
    "BASELINE_FINGERPRINT_DRIFT",
  ],
  [
    "PostgreSQL",
    (i) => (i.scope.serverVersion = "18.0"),
    "POSTGRES_VERSION_DRIFT",
  ],
  [
    "ledger field",
    (i) => (i.snapshot.ledger[0].post_fingerprint = "other"),
    "ACCEPTED_RELEASE_LEDGER_DRIFT",
  ],
  [
    "duplicate ledger",
    (i) => i.snapshot.ledger.push(i.snapshot.ledger[0]),
    "ACCEPTED_RELEASE_LEDGER_DRIFT",
  ],
  [
    "missing ledger",
    (i) => i.snapshot.ledger.pop(),
    "ACCEPTED_RELEASE_LEDGER_DRIFT",
  ],
  [
    "School logical row",
    (i) =>
      i.snapshot.ledger.push({ release: "20261006134804-comun-learning-r0" }),
    "SCHOOL_NOT_ABSENT",
  ],
  [
    "partial School",
    (i) => i.metadata.relations.push({ name: "comun_learning_progress" }),
    "SCHOOL_NOT_ABSENT",
  ],
  [
    "School history",
    (i) => (i.metadata.history_present = true),
    "SCHOOL_NOT_ABSENT",
  ],
  [
    "unknown version",
    (i) => i.snapshot.compact.canonical.migrations.push("20990101000000"),
    "MIGRATION_HISTORY_DRIFT",
  ],
  [
    "additional pending",
    (i) => i.localVersions.push("20261007120000"),
    "MIGRATION_HISTORY_DRIFT",
  ],
  [
    "geometry absent",
    (i) => (i.scope.p4PublicGeometryPresent = false),
    "OBSERVATORY_OBJECT_DRIFT",
  ],
  [
    "blocking finding",
    (i) =>
      i.snapshot.compact.security.blockingFindings.push({
        rule: "RLS_DISABLED",
      }),
    "CANONICAL_SECURITY_FINDINGS",
  ],
])
  test(`blocks ${name} rather than changing expected baseline`, () => {
    const i = input();
    change(i);
    assert.ok(classifyPre(i).reasons.includes(reason));
  });
test("wrong database or read/write transaction fails closed", () => {
  for (const change of [
    (i) => (i.scope.readOnly = "off"),
    (i) => (i.scope.database = "other"),
    (i) => (i.scope.currentUser = "supabase_admin"),
  ]) {
    const i = input();
    change(i);
    assert.throws(() => classifyPre(i));
  }
});
test("allowlist and connection endpoint must both bind to the expected project", () => {
  assert.equal(connectionOptions, "-c default_transaction_read_only=on");
  const i = {
    databaseUrl:
      "postgresql://postgres:synthetic@db.expected.supabase.co/postgres",
    projectRef: "expected",
    allowedRefs: "expected",
  };
  validateRemoteTarget(i);
  assert.throws(() => validateRemoteTarget({ ...i, allowedRefs: "different" }));
  assert.throws(() =>
    validateRemoteTarget({
      ...i,
      databaseUrl:
        "postgresql://postgres:synthetic@db.other.supabase.co/postgres",
    }),
  );
});
test("read-only rejection is rolled back and never reaches canonical or business queries", async () => {
  const calls = [];
  const db = {
    query: async (sql) => {
      calls.push(sql);
      return { rows: [{ value: { readOnly: "off" } }] };
    },
  };
  await assert.rejects(
    () => captureProductionPre(db, input()),
    /READ_ONLY_REQUIRED/,
  );
  assert.equal(calls.length, 3);
  assert.match(calls[0], /REPEATABLE READ READ ONLY/);
  assert.equal(calls.at(-1), "ROLLBACK");
});
test("rollback failure prevents a successful capture", async () => {
  const db = {
    query: async (sql) => {
      if (sql === "ROLLBACK") throw new Error("rollback unavailable");
      return { rows: [{ value: { readOnly: "off" } }] };
    },
  };
  await assert.rejects(
    () => captureProductionPre(db, input()),
    /rollback unavailable/,
  );
});
test("catalog scope contains no private/business row reads or extension execution", () => {
  for (const sql of [scopeSql, privateCatalogSql]) {
    assert.doesNotMatch(
      // CREATE/INSERT here are literal privilege names in catalog reads,
      // never executable statements. Strip only these exact read-only calls.
      sql.replace(
        /pg_catalog\.has_(?:schema|table)_privilege\(current_user,'[^']+','(?:CREATE|INSERT|REFERENCES)'\)/g,
        "CATALOG_PRIVILEGE_READ",
      ),
      /\b(insert|update|delete|create|alter|drop|load)\b/i,
    );
    assert.doesNotMatch(
      sql,
      /from\s+(?:private\.|auth\.users|public\.comun_learning_)/i,
    );
  }
});
test("executor capability inspection reads catalog privileges without granting them", () => {
  assert.match(scopeSql, /'executorCapabilities'/);
  assert.equal(
    (scopeSql.match(/pg_catalog\.has_(?:schema|table)_privilege/g) ?? [])
      .length,
    4,
  );
  assert.doesNotMatch(scopeSql, /\b(?:grant|revoke|set role)\b/i);
});
test("capture workflow contains secrets only on the bounded read-only step", () => {
  const source = readFileSync(
    ".github/workflows/comun-learning-production-pre.yml",
    "utf8",
  );
  assert.match(source, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.equal(source.match(/SUPABASE_DB_URL:/g).length, 1);
  assert.doesNotMatch(
    source,
    /workflow_dispatch|comun:promover|service_role|migration.*push|db lint|CREATE EXTENSION/,
  );
  assert.match(source, /persist-credentials: false/);
  const envStart = source.indexOf("        env:");
  assert.ok(envStart > source.indexOf("name: Allowlisted"));
  assert.ok(source.indexOf("run: node --test") < envStart);
});
test("ledger comparison does not infer absence from table/history state", () => {
  const i = input();
  assert.equal(Object.values(ledgerStates([], i.releases))[0], "ABSENT");
  assert.equal(
    Object.values(ledgerStates(i.snapshot.ledger, i.releases))[0],
    "PRESENT_ACCEPTED",
  );
});
test("disposable receives only this run artifact, never Production credentials", () => {
  const source = readFileSync(
    ".github/workflows/comun-learning-production-pre.yml",
    "utf8",
  );
  const job = source.split("  production-like-disposable:")[1];
  assert.ok(job);
  assert.doesNotMatch(
    job,
    /secrets\.|SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/,
  );
  assert.match(job, /needs: read-only-capture/);
  assert.match(job, /escola-production-pre-\$\{\{ github.sha \}\}/);
  const fixture = readFileSync(
    "scripts/learning/production-like-fixture.sh",
    "utf8",
  );
  assert.match(fixture, /postgres@sha256:[a-f0-9]{64}/);
  assert.match(fixture, /owned_exec\(\) \{ owned; docker exec/);
  assert.match(fixture, /127\.0\.0\.1:55432:5432/);
});
