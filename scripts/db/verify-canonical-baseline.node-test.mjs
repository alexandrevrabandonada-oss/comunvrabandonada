import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_VERSIONED_BASELINE_BYTES,
  assertVersionedBaseline,
  buildDocuments,
  fingerprintCanonical,
} from "./verify-canonical-baseline.mjs";

const fixture = () => ({
  canonical: {
    relations: [{ schema: "public", name: "items", kind: "r", owner: "postgres", rls: true, force_rls: false, options: [], persistence: "p", replica_identity: "d", definition: null }],
    columns: [{ table: "items", name: "title", type: "text", nullable: "NO", default: null }],
    constraints: [],
    indexes: [],
    policies: [{ schema: "public", table: "items", name: "read", roles: ["anon"], command: "SELECT", using: "published = true", check: null }],
    functions: [{ schema: "public", name: "slug", specificName: "slug_1", identityArguments: "text", result: "text", owner: "postgres", securityDefiner: false, config: [], definition: "CREATE FUNCTION slug(text) RETURNS text LANGUAGE sql AS 'select lower($1)'" }],
    tableGrants: [{ table: "items", grantee: "anon", privilege: "SELECT" }],
    sequenceGrants: [],
    routineGrants: [{ routine: "slug", specificName: "slug_1", grantee: "anon", privilege: "EXECUTE" }],
    schemaGrants: [{ grantee: "anon", privilege: "USAGE" }],
    defaultPrivileges: [],
    triggers: [],
    buckets: [{ id: "archive-private-originals", public: false, fileSizeLimit: 10, allowedMimeTypes: ["image/jpeg"] }],
    migrations: ["20260723000000"],
  },
  platform: { authRelations: 10, storageRelations: 5, authFunctions: 3, storageFunctions: 4, storagePolicies: 2, postgresVersion: 170004 },
});

test("RLS enable and force participate in the canonical fingerprint", () => {
  const raw = fixture();
  const original = fingerprintCanonical(raw.canonical);
  raw.canonical.relations[0].force_rls = true;
  assert.notEqual(fingerprintCanonical(raw.canonical), original);
});

for (const [label, mutate] of [
  ["function body", (raw) => { raw.canonical.functions[0].definition += " immutable"; }],
  ["view definition", (raw) => { raw.canonical.relations.push({ schema: "public", name: "v", kind: "v", owner: "postgres", rls: false, force_rls: false, options: ["security_invoker=true"], persistence: "p", replica_identity: "n", definition: "select title from items" }); }],
  ["policy", (raw) => { raw.canonical.policies[0].using = "published and reviewed"; }],
  ["function grant", (raw) => { raw.canonical.routineGrants[0].grantee = "authenticated"; }],
]) {
  test(`${label} changes the canonical fingerprint`, () => {
    const raw = fixture();
    const original = fingerprintCanonical(raw.canonical);
    mutate(raw);
    assert.notEqual(fingerprintCanonical(raw.canonical), original);
  });
}

test("managed Supabase internals are informational and do not change the canonical fingerprint", () => {
  const raw = fixture();
  const original = buildDocuments(raw, "2026-07-23T00:00:00Z").compact.fingerprint;
  raw.platform.authRelations += 1;
  raw.platform.storageFunctions += 10;
  assert.equal(buildDocuments(raw, "2026-07-23T00:00:00Z").compact.fingerprint, original);
});

test("versioned baseline is bounded and contains no data-shaped forbidden fields", () => {
  const document = buildDocuments(fixture(), "2026-07-23T00:00:00Z").compact;
  const serialized = assertVersionedBaseline(document);
  assert.ok(Buffer.byteLength(serialized) < MAX_VERSIONED_BASELINE_BYTES);
  assert.throws(() => assertVersionedBaseline({ ...document, email: "person@example.test" }), /FORBIDDEN_DATA_FIELD/);
  assert.throws(() => assertVersionedBaseline({ ...document, object_key: "private/file.jpg" }), /FORBIDDEN_DATA_FIELD/);
  assert.throws(() => assertVersionedBaseline({ ...document, exact_latitude: -22 }), /FORBIDDEN_DATA_FIELD/);
});

test("dangerous encoded default privileges are fail-closed findings", () => {
  const raw = fixture();
  raw.canonical.defaultPrivileges.push({
    schema: "public",
    owner: "postgres",
    objectType: "r",
    acl: "{anon=Dxtm/postgres,authenticated=Dxtm/postgres}",
  });
  const result = buildDocuments(raw, "2026-07-23T00:00:00Z").compact;
  assert.equal(result.security.status, "COMUN_APP_SECURITY_FINDINGS");
  assert.ok(result.security.blockingFindings.some((item) => item.classification === "DEFAULT_PRIVILEGE_RISK"));
});

test("supabase_admin defaults are informational and excluded from blocking fingerprint", () => {
  const raw = fixture();
  raw.canonical.defaultPrivileges.push({
    schema: "public",
    owner: "supabase_admin",
    objectType: "r",
    acl: "{anon=arwdDxtm/supabase_admin}",
  });
  const result = buildDocuments(raw, "2026-07-23T00:00:00Z").compact;
  assert.equal(result.security.status, "COMUN_APP_SECURITY_OK");
  assert.equal(result.security.blockingFindings.length, 0);
  assert.equal(result.security.platformObservations.length, 1);
  assert.equal(result.platformInformationalSnapshot.managedDefaultPrivileges.count, 1);
  assert.equal(result.canonical.defaultPrivileges.length, 0);
});
