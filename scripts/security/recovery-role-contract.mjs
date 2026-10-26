import { createHash } from "node:crypto";

const flags = [
  "superuser",
  "inherit",
  "create_role",
  "create_database",
  "login",
  "replication",
  "bypass_rls",
];
const fail = () => {
  throw new Error("RECOVERY_ROLE_CATALOG_REJECTED");
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
function name(value) {
  if (
    typeof value !== "string" ||
    !value ||
    Buffer.byteLength(value) > 63 ||
    /[\x00-\x1f\x7f]/.test(value)
  )
    fail();
  return value;
}
const order = (a, b) => {
  const x = JSON.stringify(a),
    y = JSON.stringify(b);
  return x < y ? -1 : x > y ? 1 : 0;
};
function expiry(value) {
  if (value === null || value === "infinity" || value === "-infinity")
    return value;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value)
  )
    fail();
  const parsed = Date.parse(value);
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().slice(0, 23) !== value.slice(0, 23)
  )
    fail();
  return value;
}

// Comparison only. No connection, DDL generation, credential or setting restoration.
export function canonicalRoleCatalog(input) {
  keys(input, [
    "formatVersion",
    "postgresMajor",
    "transactionReadOnly",
    "roles",
    "memberships",
  ]);
  if (
    input.formatVersion !== 1 ||
    input.postgresMajor !== 17 ||
    input.transactionReadOnly !== true ||
    !Array.isArray(input.roles) ||
    !Array.isArray(input.memberships) ||
    input.roles.length > 5000 ||
    input.memberships.length > 20000
  )
    fail();
  const names = new Set();
  const roles = input.roles
    .map((role) => {
      keys(role, ["name", ...flags, "connection_limit", "valid_until"]);
      const roleName = name(role.name);
      if (names.has(roleName)) fail();
      names.add(roleName);
      const output = { name: roleName };
      for (const field of flags) {
        if (typeof role[field] !== "boolean") fail();
        output[field] = role[field];
      }
      if (
        !Number.isInteger(role.connection_limit) ||
        role.connection_limit < -1 ||
        role.connection_limit > 2147483647
      )
        fail();
      return {
        ...output,
        connection_limit: role.connection_limit,
        valid_until: expiry(role.valid_until),
      };
    })
    .sort(order);
  const edges = new Set();
  const memberships = input.memberships
    .map((edge) => {
      keys(edge, ["role", "member", "grantor", "admin", "inherit", "set_role"]);
      for (const field of ["role", "member", "grantor"])
        if (!names.has(name(edge[field]))) fail();
      if (edge.role === edge.member) fail();
      const identity = JSON.stringify([edge.role, edge.member, edge.grantor]);
      if (edges.has(identity)) fail();
      edges.add(identity);
      for (const field of ["admin", "inherit", "set_role"])
        if (typeof edge[field] !== "boolean") fail();
      return {
        role: edge.role,
        member: edge.member,
        grantor: edge.grantor,
        admin: edge.admin,
        inherit: edge.inherit,
        set_role: edge.set_role,
      };
    })
    .sort(order);
  const incoming = new Map([...names].map((n) => [n, 0]));
  const outgoing = new Map([...names].map((n) => [n, []]));
  for (const edge of memberships) {
    incoming.set(edge.member, incoming.get(edge.member) + 1);
    outgoing.get(edge.role).push(edge.member);
  }
  const queue = [...names].filter((n) => incoming.get(n) === 0);
  let count = 0;
  for (let i = 0; i < queue.length; i++) {
    count++;
    for (const member of outgoing.get(queue[i])) {
      incoming.set(member, incoming.get(member) - 1);
      if (incoming.get(member) === 0) queue.push(member);
    }
  }
  if (count !== names.size) fail();
  return {
    formatVersion: 1,
    postgresMajor: 17,
    transactionReadOnly: true,
    roles,
    memberships,
  };
}
export function roleCatalogDigest(input) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalRoleCatalog(input)))
    .digest("hex");
}
export function compareRoleCatalogs(source, restored) {
  const a = canonicalRoleCatalog(source),
    b = canonicalRoleCatalog(restored);
  const roles = new Map(b.roles.map((role) => [role.name, role]));
  const expected = new Set(a.roles.map((role) => role.name));
  const edgeId = (edge) =>
    JSON.stringify([edge.role, edge.member, edge.grantor]);
  const edges = new Map(b.memberships.map((edge) => [edgeId(edge), edge]));
  const expectedEdges = new Set(a.memberships.map(edgeId));
  const result = {
    rolesMissing: 0,
    rolesExtra: b.roles.filter((role) => !expected.has(role.name)).length,
    attributesChanged: 0,
    membershipsMissing: 0,
    membershipsExtra: b.memberships.filter(
      (edge) => !expectedEdges.has(edgeId(edge)),
    ).length,
    membershipOptionsChanged: 0,
  };
  for (const role of a.roles) {
    const current = roles.get(role.name);
    if (!current) result.rolesMissing++;
    else if (JSON.stringify(role) !== JSON.stringify(current))
      result.attributesChanged++;
  }
  for (const edge of a.memberships) {
    const current = edges.get(edgeId(edge));
    if (!current) result.membershipsMissing++;
    else if (JSON.stringify(edge) !== JSON.stringify(current))
      result.membershipOptionsChanged++;
  }
  return {
    ...result,
    equal: Object.values(result).every((value) => value === 0),
    sourceDigest: roleCatalogDigest(a),
    restoredDigest: roleCatalogDigest(b),
    scope: "role_attributes_and_memberships_without_credentials_or_gucs",
    recoveryComplete: false,
    applySql: false,
  };
}

/**
 * Audit a deliberately restricted laboratory reconstruction.
 * This never generates DDL or authorizes replay of provider or captured roles.
 */
export function assessSyntheticLeastPrivilegeReconstruction(source, target) {
  const before = canonicalRoleCatalog(source);
  const after = canonicalRoleCatalog(target);
  const syntheticNames = [
    "synthetic_owner",
    "synthetic_member",
    "synthetic_delegate",
  ];
  const names = new Set(syntheticNames);
  const beforeRoles = before.roles.filter((role) => names.has(role.name));
  const afterRoles = after.roles.filter((role) => names.has(role.name));
  if (
    beforeRoles.length !== syntheticNames.length ||
    afterRoles.length !== syntheticNames.length
  )
    fail();
  if (
    afterRoles.some(
      (role) =>
        role.superuser ||
        role.inherit ||
        role.create_role ||
        role.create_database ||
        role.login ||
        role.replication ||
        role.bypass_rls ||
        role.connection_limit !== -1 ||
        role.valid_until !== null,
    )
  )
    fail();
  const affectedEdges = after.memberships.filter(
    (edge) => names.has(edge.role) || names.has(edge.member),
  );
  if (
    affectedEdges.length !== 1 ||
    affectedEdges[0].role !== "synthetic_owner" ||
    affectedEdges[0].member !== "synthetic_member" ||
    affectedEdges[0].grantor !== "postgres" ||
    affectedEdges[0].admin ||
    affectedEdges[0].inherit ||
    affectedEdges[0].set_role
  )
    fail();
  const comparison = compareRoleCatalogs(before, after);
  if (
    comparison.equal ||
    comparison.rolesMissing !== 0 ||
    comparison.attributesChanged < 1 ||
    comparison.membershipsMissing < 1 ||
    comparison.recoveryComplete !== false ||
    comparison.applySql !== false
  )
    fail();
  return {
    syntheticRoles: syntheticNames.length,
    restrictedGrants: affectedEdges.length,
    privilegeReplay: false,
    providerRolesRestored: false,
    recoveryComplete: false,
  };
}
