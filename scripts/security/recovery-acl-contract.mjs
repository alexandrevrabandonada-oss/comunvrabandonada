import { createHash } from "node:crypto";

const schemas = new Set([
  "public",
  "private",
  "comun_auth_private",
  "supabase_migrations",
]);
const kinds = new Set([
  "schema",
  "table",
  "sequence",
  "function",
  "procedure",
  "type",
  "column",
]);
const privileges = new Set([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
  "MAINTAIN",
  "USAGE",
  "CREATE",
  "EXECUTE",
]);
const fail = () => {
  throw new Error("RECOVERY_ACL_CATALOG_REJECTED");
};
function keys(value, expected) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== [...expected].sort().join()
  )
    fail();
}
function text(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 16384 ||
    /[\x00-\x1f]/.test(value)
  )
    fail();
  return value;
}
const order = (a, b) => {
  const x = JSON.stringify(a),
    y = JSON.stringify(b);
  return x < y ? -1 : x > y ? 1 : 0;
};
function sortedUnique(values) {
  const sorted = values.sort(order);
  for (let i = 1; i < sorted.length; i++)
    if (order(sorted[i - 1], sorted[i]) === 0) fail();
  return sorted;
}
function grants(values) {
  if (!Array.isArray(values)) fail();
  return sortedUnique(
    values.map((value) => {
      keys(value, ["grantor", "grantee", "privilege", "grantable"]);
      if (
        !privileges.has(value.privilege) ||
        typeof value.grantable !== "boolean"
      )
        fail();
      return {
        grantor: text(value.grantor),
        grantee: value.grantee === null ? null : text(value.grantee),
        privilege: value.privilege,
        grantable: value.grantable,
      };
    }),
  );
}
// Comparison only: never generates GRANT/REVOKE or opens a database connection.
export function canonicalAclCatalog(catalog) {
  keys(catalog, ["formatVersion", "schemas", "objects", "defaults"]);
  if (
    catalog.formatVersion !== 1 ||
    !Array.isArray(catalog.schemas) ||
    !Array.isArray(catalog.objects) ||
    !Array.isArray(catalog.defaults)
  )
    fail();
  const scope = sortedUnique(
    catalog.schemas.map((value) => {
      if (!schemas.has(value)) fail();
      return value;
    }),
  );
  const objects = sortedUnique(
    catalog.objects.map((value) => {
      keys(value, ["kind", "identity", "owner", "grants"]);
      if (!kinds.has(value.kind)) fail();
      return {
        kind: value.kind,
        identity: text(value.identity),
        owner: text(value.owner),
        grants: grants(value.grants),
      };
    }),
  );
  const identities = new Set(
    objects.map((value) => JSON.stringify([value.kind, value.identity])),
  );
  if (identities.size !== objects.length) fail();
  const defaults = sortedUnique(
    catalog.defaults.map((value) => {
      keys(value, ["owner", "scope", "kind", "grants"]);
      if (
        (value.scope !== "*" && !scope.includes(value.scope)) ||
        !["r", "S", "f", "T", "n", "L"].includes(value.kind)
      )
        fail();
      return {
        owner: text(value.owner),
        scope: value.scope,
        kind: value.kind,
        grants: grants(value.grants),
      };
    }),
  );
  return { formatVersion: 1, schemas: scope, objects, defaults };
}
export function aclCatalogDigest(catalog) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalAclCatalog(catalog)))
    .digest("hex");
}

const quoteRole = (value) => `"${text(value).replaceAll('"', '""')}"`;
function identity(value, count) {
  const token = '(?:[a-z_][a-z0-9_]*|"(?:[^"\\x00-\\x1f]|"")+")';
  const match = new RegExp(
    `^(${token})${count === 2 ? `\\.(${token})` : ""}$`,
  ).exec(value);
  if (!match) fail();
  const scope = match[1].startsWith('"')
    ? match[1].slice(1, -1).replaceAll('""', '"')
    : match[1];
  if (!schemas.has(scope)) fail();
  return value;
}

// Offline plan for an isolated restore only. It never connects or executes SQL.
// Restore only missing owner-issued schema/sequence grants from the captured
// source catalog. Extra grants, changed owners, defaults or other object kinds
// are not repaired automatically. The caller must compare the ENTIRE catalog
// again after applying the plan inside its owned, network-isolated database.
export function planMissingRestoreGrants(source, restored) {
  const a = canonicalAclCatalog(source),
    b = canonicalAclCatalog(restored);
  if (
    JSON.stringify(a.schemas) !== JSON.stringify(b.schemas) ||
    JSON.stringify(a.defaults) !== JSON.stringify(b.defaults) ||
    a.objects.length !== b.objects.length
  )
    fail();
  const byIdentity = new Map(
    b.objects.map((o) => [JSON.stringify([o.kind, o.identity]), o]),
  );
  const statements = [];
  for (const object of a.objects) {
    const current = byIdentity.get(
      JSON.stringify([object.kind, object.identity]),
    );
    if (!current || current.owner !== object.owner) fail();
    const expected = new Set(object.grants.map((g) => JSON.stringify(g)));
    const actual = new Set(current.grants.map((g) => JSON.stringify(g)));
    if ([...actual].some((g) => !expected.has(g))) fail();
    const missing = object.grants.filter((g) => !actual.has(JSON.stringify(g)));
    if (!missing.length) continue;
    if (!["schema", "sequence"].includes(object.kind)) fail();
    const target = identity(object.identity, object.kind === "schema" ? 1 : 2);
    const allowed =
      object.kind === "schema"
        ? ["USAGE", "CREATE"]
        : ["USAGE", "SELECT", "UPDATE"];
    for (const grant of missing) {
      if (grant.grantor !== object.owner || !allowed.includes(grant.privilege))
        fail();
      const recipient =
        grant.grantee === null ? "PUBLIC" : quoteRole(grant.grantee);
      statements.push(
        `GRANT ${grant.privilege} ON ${object.kind.toUpperCase()} ${target} TO ${recipient}${grant.grantable ? " WITH GRANT OPTION" : ""};`,
      );
    }
  }
  return statements;
}
