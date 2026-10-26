import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  roleCatalogReadPlan,
  parseRoleCaptureArguments,
} from "./capture-recovery-role-catalog.mjs";

test("role capture uses fixed read-only query and keeps password outside arguments", () => {
  const password = "synthetic-not-a-real-password";
  const plan = roleCatalogReadPlan(password);
  assert(!plan.args.join(" ").includes(password));
  assert.equal(plan.options.env.PGPASSWORD, password);
  assert.match(
    plan.args.at(-1),
    /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/,
  );
  assert.match(plan.args.at(-1), /ROLLBACK;/);
  assert.equal(plan.options.env.PGSSLMODE, "verify-full");
  assert.equal(plan.options.maxBuffer, 1024 * 1024);
});

test("capture CLI rejects incomplete, relative, unknown and duplicate arguments", () => {
  for (const args of [
    [],
    ["capture"],
    ["verify", "--input", "relative"],
    ["other"],
    ["capture", "--config", "x", "--config", "y"],
  ]) {
    assert.throws(
      () => parseRoleCaptureArguments(args),
      /COMUN_ROLE_CATALOG_OPERATION_REJECTED/,
    );
  }
});
import {
  canonicalRoleCatalog,
  roleCatalogDigest,
  compareRoleCatalogs,
} from "./recovery-role-contract.mjs";

const role = (name) => ({
  name,
  superuser: false,
  inherit: true,
  create_role: false,
  create_database: false,
  login: false,
  replication: false,
  bypass_rls: false,
  connection_limit: -1,
  valid_until: null,
});
const fixture = () => ({
  formatVersion: 1,
  postgresMajor: 17,
  transactionReadOnly: true,
  roles: [role("owner"), role("member"), role("grantor")],
  memberships: [
    {
      role: "owner",
      member: "member",
      grantor: "grantor",
      admin: false,
      inherit: true,
      set_role: true,
    },
  ],
});
test("catalog is stable across order and reports no implied restoration", () => {
  const a = fixture(),
    b = fixture();
  b.roles.reverse();
  assert.equal(roleCatalogDigest(a), roleCatalogDigest(b));
  const result = compareRoleCatalogs(a, b);
  assert.equal(result.equal, true);
  assert.equal(result.recoveryComplete, false);
  assert.equal(result.applySql, false);
});
for (const field of [
  "superuser",
  "inherit",
  "create_role",
  "create_database",
  "login",
  "replication",
  "bypass_rls",
  "connection_limit",
  "valid_until",
])
  test(`detect role attribute ${field}`, () => {
    const a = fixture(),
      b = fixture();
    b.roles[0][field] =
      field === "connection_limit"
        ? 10
        : field === "valid_until"
          ? "2026-12-01T00:00:00.123456Z"
          : !b.roles[0][field];
    const result = compareRoleCatalogs(a, b);
    assert.equal(result.equal, false);
    assert.equal(result.attributesChanged, 1);
    assert.notEqual(result.sourceDigest, result.restoredDigest);
  });
for (const field of ["admin", "inherit", "set_role"])
  test(`detect membership option ${field}`, () => {
    const a = fixture(),
      b = fixture();
    b.memberships[0][field] = !b.memberships[0][field];
    assert.equal(compareRoleCatalogs(a, b).membershipOptionsChanged, 1);
  });
test("membership grantor is part of identity", () => {
  const a = fixture(),
    b = fixture();
  b.memberships[0].grantor = "owner";
  const result = compareRoleCatalogs(a, b);
  assert.equal(result.membershipsMissing, 1);
  assert.equal(result.membershipsExtra, 1);
});
for (const [label, change] of Object.entries({
  password: (a) => (a.roles[0].rolpassword = "forbidden"),
  configuration: (a) => (a.roles[0].rolconfig = ["secret=x"]),
  duplicateRole: (a) => a.roles.push({ ...a.roles[0], superuser: true }),
  duplicateEdge: (a) =>
    a.memberships.push({ ...a.memberships[0], admin: true }),
  unknownRole: (a) => (a.memberships[0].member = "unknown"),
  cycle: (a) =>
    a.memberships.push({
      role: "member",
      member: "owner",
      grantor: "grantor",
      admin: false,
      inherit: true,
      set_role: true,
    }),
  writeTransaction: (a) => (a.transactionReadOnly = false),
  unsupportedVersion: (a) => (a.postgresMajor = 16),
  invalidExpiry: (a) =>
    (a.roles[0].valid_until = "2026-02-31T00:00:00.000000Z"),
}))
  test(`reject ${label} without reflecting input`, () => {
    const input = fixture();
    change(input);
    assert.throws(() => canonicalRoleCatalog(input), {
      message: "RECOVERY_ROLE_CATALOG_REJECTED",
    });
  });
test("query reads no credential/configuration/account catalogs and does not mutate", async () => {
  const sql = await readFile(
    new URL("./recovery-role-catalog.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /pg_catalog\.pg_roles/);
  assert.match(sql, /pg_catalog\.pg_auth_members/);
  assert.doesNotMatch(
    sql,
    /\b(pg_authid|rolpassword|rolconfig|auth\.users|auth\.sessions|insert|update|delete|grant|revoke|alter|create|drop)\b/i,
  );
});
