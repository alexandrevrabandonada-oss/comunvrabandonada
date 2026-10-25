import assert from "node:assert/strict";
import test from "node:test";
import {
  aclCatalogDigest,
  planMissingRestoreGrants,
} from "./recovery-acl-contract.mjs";
const grant = {
  grantor: "owner",
  grantee: "authenticated",
  privilege: "SELECT",
  grantable: false,
};
const valid = {
  formatVersion: 1,
  schemas: ["private", "public"],
  objects: [
    {
      kind: "table",
      identity: "public.synthetic",
      owner: "owner",
      grants: [grant],
    },
    {
      kind: "function",
      identity: "private.synthetic()",
      owner: "owner",
      grants: [],
    },
  ],
  defaults: [{ owner: "owner", scope: "public", kind: "r", grants: [grant] }],
};
const clone = () => structuredClone(valid);
test("ordering of schemas, catalog entries and ACL rows is not an authorization difference", () => {
  const other = clone();
  other.schemas.reverse();
  other.objects.reverse();
  assert.equal(aclCatalogDigest(other), aclCatalogDigest(valid));
  const withGrants = clone();
  withGrants.objects[0].grants.push({ ...grant, grantee: null });
  const reversed = structuredClone(withGrants);
  reversed.objects[0].grants.reverse();
  assert.equal(aclCatalogDigest(withGrants), aclCatalogDigest(reversed));
});

const baseline = () => ({
  formatVersion: 1,
  schemas: ["public", "private"],
  objects: [
    {
      kind: "schema",
      identity: "public",
      owner: "owner",
      grants: [
        {
          grantor: "owner",
          grantee: null,
          privilege: "USAGE",
          grantable: false,
        },
      ],
    },
    {
      kind: "sequence",
      identity: "private.synthetic_seq",
      owner: "owner",
      grants: [
        {
          grantor: "owner",
          grantee: "owner",
          privilege: "SELECT",
          grantable: false,
        },
      ],
    },
  ],
  defaults: [],
});
test("isolated restore plan only replays exact missing owner-issued grants", () => {
  const a = baseline(),
    b = baseline();
  b.objects[0].grants = [];
  b.objects[1].grants = [];
  assert.deepEqual(planMissingRestoreGrants(a, b), [
    "GRANT USAGE ON SCHEMA public TO PUBLIC;",
    'GRANT SELECT ON SEQUENCE private.synthetic_seq TO "owner";',
  ]);
  assert.deepEqual(planMissingRestoreGrants(a, a), []);
});
test("restore plan rejects overgrants, changed owners/defaults, missing objects and unsupported repairs", () => {
  for (const edit of [
    (c) => (c.objects[0].owner = "other"),
    (c) => c.objects.pop(),
    (c) => c.objects[0].grants.push({ ...grant, privilege: "CREATE" }),
    (c) =>
      c.defaults.push({
        owner: "owner",
        scope: "public",
        kind: "r",
        grants: [],
      }),
  ]) {
    const a = baseline(),
      b = baseline();
    edit(b);
    assert.throws(() => planMissingRestoreGrants(a, b), {
      message: "RECOVERY_ACL_CATALOG_REJECTED",
    });
  }
  const a = clone(),
    b = clone();
  b.objects[0].grants = [];
  assert.throws(() => planMissingRestoreGrants(a, b));
});
test("restore plan rejects forged SQL identities and grants issued by another role", () => {
  for (const target of [
    "public; DROP SCHEMA private; --",
    "auth.synthetic_seq",
    "private.synthetic_seq; SELECT 1",
  ]) {
    const a = baseline(),
      b = baseline();
    a.objects[1].identity = target;
    b.objects[1].identity = target;
    b.objects[1].grants = [];
    assert.throws(() => planMissingRestoreGrants(a, b));
  }
  const a = baseline(),
    b = baseline();
  a.objects[1].grants[0].grantor = "other";
  b.objects[1].grants = [];
  assert.throws(() => planMissingRestoreGrants(a, b));
});
for (const field of [
  "owner",
  "grantor",
  "grantee",
  "privilege",
  "grantable",
  "defaults",
])
  test(`detect actual difference in ${field}`, () => {
    const other = clone();
    if (field === "owner") other.objects[0].owner = "other";
    else if (field === "defaults") other.defaults = [];
    else
      other.objects[0].grants[0][field] =
        field === "grantable"
          ? true
          : field === "privilege"
            ? "UPDATE"
            : "other";
    assert.notEqual(aclCatalogDigest(other), aclCatalogDigest(valid));
  });
test("added or missing grants and objects change the digest", () => {
  for (const edit of [
    (c) => c.objects.pop(),
    (c) => c.objects[0].grants.pop(),
    (c) => c.objects[0].grants.push({ ...grant, grantee: null }),
  ]) {
    const c = clone();
    edit(c);
    assert.notEqual(aclCatalogDigest(c), aclCatalogDigest(valid));
  }
});
test("unknown private fields, malformed roles, duplicate identities and unexpected scopes fail closed", () => {
  for (const edit of [
    (c) => (c.privateContact = "DO_NOT_PRINT"),
    (c) => (c.objects[0].password = "DO_NOT_PRINT"),
    (c) => c.schemas.push("auth"),
    (c) => (c.objects[0].owner = "bad\nrole"),
    (c) => c.objects.push({ ...c.objects[0], owner: "other" }),
    (c) => c.objects[0].grants.push({ ...grant }),
    (c) => (c.objects[0].grants[0].grantable = "false"),
    (c) => (c.defaults[0].scope = "auth"),
  ]) {
    const c = clone();
    edit(c);
    assert.throws(() => aclCatalogDigest(c), {
      message: "RECOVERY_ACL_CATALOG_REJECTED",
    });
  }
});
