import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertLocalOnly,
  buildDerivedReference,
} from "./derive-sidewalk-safer-pre-v2-reference.mjs";
import {
  buildDocument,
  buildStructuralDocument,
  fingerprint,
  fingerprintScope,
  structuralFingerprintScope,
} from "./sidewalk-operational-fingerprint.mjs";
import {
  saferPreFixtureId,
  saferPreFixtureSql,
  saferPreLegacyTables,
  saferPrePublicPrivileges,
  saferPrePublicRoles,
} from "./sidewalk-safer-pre-v2-fixture.mjs";

const localEnvironment = {
  SUPABASE_PROJECT_REF: "LOCAL_VALIDATION",
  PR23_DATABASE_URL:
    "postgresql://postgres:placeholder@127.0.0.1:56632/postgres",
};

const raw = (ledger = []) => ({
  relations: [],
  columns: [],
  constraints: [],
  indexes: [],
  policies: [],
  grants: [],
  ledger,
});

test("structural v2 excludes the target release ledger from its fingerprint", () => {
  const withoutLedger = raw([]);
  const withLedger = raw([
    {
      release: "20260724233256-comun-sidewalk-operational-hardening",
      migrationPath:
        "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
      migrationSha256: "a".repeat(64),
      pre: "b".repeat(64),
      post: "c".repeat(64),
      status: "applied",
    },
  ]);

  assert.notEqual(
    fingerprint(buildDocument(withoutLedger)),
    fingerprint(buildDocument(withLedger)),
  );
  assert.equal(
    fingerprint(buildStructuralDocument(withoutLedger)),
    fingerprint(buildStructuralDocument(withLedger)),
  );
  assert.equal(
    buildStructuralDocument(withLedger).scope,
    structuralFingerprintScope,
  );
  assert.equal(buildDocument(withLedger).scope, fingerprintScope);
});

test("structural v2 still detects a real scoped schema change", () => {
  const before = raw([]);
  const after = raw([]);
  after.columns.push({ table: "comun_sidewalk_records", name: "state" });

  assert.notEqual(
    fingerprint(buildStructuralDocument(before)),
    fingerprint(buildStructuralDocument(after)),
  );
});

test("safer PRE v2 fixture removes exactly the three public grants on every legacy table", () => {
  assert.equal(saferPreFixtureId, "sidewalk-operational-safer-pre-v2");
  assert.deepEqual(saferPrePublicRoles, ["anon", "authenticated"]);
  assert.deepEqual(saferPrePublicPrivileges, [
    "references",
    "trigger",
    "truncate",
  ]);
  assert.equal(saferPreLegacyTables.length, 12);
  for (const table of saferPreLegacyTables) {
    assert.match(saferPreFixtureSql, new RegExp(`public\\.${table}`));
  }
  assert.match(
    saferPreFixtureSql,
    /revoke references, trigger, truncate on table/i,
  );
  assert.match(saferPreFixtureSql, /from anon, authenticated;/i);
});

test("derived safer PRE v2 reference preserves the fixture metadata and structural values", () => {
  const pre = {
    global: "1".repeat(64),
    scoped: "2".repeat(64),
    objects: [],
    auditGrants: [],
  };
  const post = {
    global: "3".repeat(64),
    scoped: "4".repeat(64),
    objects: [],
    auditGrants: [],
  };
  const reference = buildDerivedReference(pre, post);

  assert.equal(reference.scope, structuralFingerprintScope);
  assert.equal(reference.scopedPre, pre.scoped);
  assert.equal(reference.scopedPost, post.scoped);
  assert.equal(reference.fixture.id, saferPreFixtureId);
  assert.equal(reference.rawMigrationReapplied, true);
});

test("safer PRE v2 derivation rejects any nonlocal destination before SQL execution", () => {
  assert.doesNotThrow(() => assertLocalOnly(localEnvironment));
  assert.throws(
    () =>
      assertLocalOnly({
        ...localEnvironment,
        PR23_DATABASE_URL:
          "postgresql://reader:placeholder@remote.invalid/postgres",
      }),
    /COMUN_SAFER_PRE_V2_REFERENCE_LOCAL_DATABASE_REQUIRED/,
  );
  assert.throws(
    () =>
      assertLocalOnly({
        ...localEnvironment,
        SUPABASE_PROJECT_REF: "remote-project",
      }),
    /COMUN_SAFER_PRE_V2_REFERENCE_LOCAL_ONLY/,
  );
});
