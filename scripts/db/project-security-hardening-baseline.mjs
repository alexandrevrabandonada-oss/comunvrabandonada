import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { buildDocuments } from "./verify-canonical-baseline.mjs";

const sourcePath = process.argv.find((value) => value.startsWith("--source="))
  ?.slice("--source=".length) || "reports/current/comun-remote-schema-baseline.json";
const baselineOutput = process.argv.find((value) => value.startsWith("--baseline-output="))
  ?.slice("--baseline-output=".length) || "reports/current/comun-remote-schema-baseline.json";
const releaseOutput = process.argv.find((value) => value.startsWith("--release-output="))
  ?.slice("--release-output=".length) || "supabase/releases/20260723220112-canonical-security-hardening.json";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const expectedLegacyPre =
  "f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793";
const expectedPreFingerprint =
  "b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de";
const legacyProjectedPostFingerprint =
  "82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b";
const preCanonical = structuredClone(source.canonical);
const stableFunctionNames = new Map();
for (const fn of preCanonical.functions) {
  const stable = `${fn.name}(${fn.identityArguments})`;
  stableFunctionNames.set(fn.specificName, stable);
  fn.specificName = stable;
}
for (const grant of preCanonical.routineGrants) {
  grant.specificName = stableFunctionNames.get(grant.specificName) || `${grant.routine}()`;
}
const sourceBlocking = buildDocuments(
  {
    canonical: preCanonical,
    platform: source.platformInformationalSnapshot,
  },
  "PRE_PROMOTION",
).compact;
if (source.fingerprint !== expectedLegacyPre && sourceBlocking.fingerprint !== source.fingerprint) {
  throw new Error("COMUN_HARDENING_PRE_FINGERPRINT_MISMATCH");
}

const canonical = structuredClone(preCanonical);
const view = canonical.relations.find((item) => item.name === "comun_public_reports");
view.options = ["security_invoker=true"];
canonical.tableGrants = canonical.tableGrants.filter(
  (grant) =>
    grant.table !== "comun_public_reports" ||
    !["anon", "authenticated"].includes(grant.grantee) ||
    grant.privilege === "SELECT",
);
if (!canonical.policies.some((policy) =>
  policy.schema === "public" &&
  policy.table === "comun_reports" &&
  policy.name === "Public can read sanitized published reports"
)) {
  canonical.policies.push({
    name: "Public can read sanitized published reports",
    check: null,
    roles: ["anon", "authenticated"],
    table: "comun_reports",
    using:
      "((status = 'published'::text) AND (public_text IS NOT NULL) AND (can_publish_sanitized IS TRUE))",
    schema: "public",
    command: "SELECT",
    permissive: "PERMISSIVE",
  });
}
canonical.policies.sort((a, b) =>
  `${a.schema}.${a.table}.${a.name}`.localeCompare(`${b.schema}.${b.table}.${b.name}`),
);

for (const fn of canonical.functions.filter((item) =>
  ["claim_next_archive_processing_job", "handle_new_user"].includes(item.name),
)) {
  fn.config = ["search_path=pg_catalog"];
  fn.definition = fn.definition.replace(
    /SET search_path TO 'public'/,
    "SET search_path TO 'pg_catalog'",
  );
}

for (const privilege of canonical.defaultPrivileges) {
  if (privilege.schema !== "public") continue;
  if (privilege.owner === "postgres" && privilege.objectType === "r") {
    privilege.acl = "{postgres=arwdDxtm/postgres,service_role=Dxtm/postgres}";
  } else if (privilege.owner === "postgres" && privilege.objectType === "S") {
    privilege.acl = "{postgres=rwU/postgres,service_role=w/postgres}";
  }
}

if (!canonical.relations.some((relation) =>
  relation.schema === "public" && relation.name === "comun_schema_releases"
)) {
  canonical.relations.push({
    rls: true,
    kind: "r",
    name: "comun_schema_releases",
    owner: "postgres",
    schema: "public",
    options: [],
    force_rls: false,
    definition: null,
    persistence: "p",
    replica_identity: "d",
  });
}
canonical.relations.sort((a, b) => `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`));
if (!canonical.columns.some((column) => column.table === "comun_schema_releases")) {
  canonical.columns.push(
    { name: "release", type: "text", table: "comun_schema_releases", default: null, nullable: "NO" },
    { name: "migration_path", type: "text", table: "comun_schema_releases", default: null, nullable: "NO" },
    { name: "migration_sha256", type: "text", table: "comun_schema_releases", default: null, nullable: "NO" },
    { name: "pre_fingerprint", type: "text", table: "comun_schema_releases", default: null, nullable: "NO" },
    { name: "post_fingerprint", type: "text", table: "comun_schema_releases", default: null, nullable: "NO" },
    { name: "applied_at", type: "timestamp with time zone", table: "comun_schema_releases", default: "now()", nullable: "NO" },
    { name: "applied_by", type: "text", table: "comun_schema_releases", default: "CURRENT_USER", nullable: "NO" },
    { name: "status", type: "text", table: "comun_schema_releases", default: "'applied'::text", nullable: "NO" },
  );
}
canonical.columns.sort((a, b) => a.table.localeCompare(b.table));
if (!canonical.constraints.some((constraint) =>
  constraint.table === "comun_schema_releases"
)) {
  canonical.constraints.push(
    { table: "comun_schema_releases", name: "comun_schema_releases_pkey", type: "p", definition: "PRIMARY KEY (release)" },
    { table: "comun_schema_releases", name: "comun_schema_releases_status_check", type: "c", definition: "CHECK ((status = 'applied'::text))" },
  );
}
canonical.constraints.sort((a, b) => `${a.table}.${a.name}`.localeCompare(`${b.table}.${b.name}`));
if (!canonical.indexes.some((index) =>
  index.table === "comun_schema_releases" &&
  index.name === "comun_schema_releases_pkey"
)) {
  canonical.indexes.push({
    table: "comun_schema_releases",
    name: "comun_schema_releases_pkey",
    definition: "CREATE UNIQUE INDEX comun_schema_releases_pkey ON public.comun_schema_releases USING btree (release)",
  });
}
canonical.indexes.sort((a, b) => `${a.table}.${a.name}`.localeCompare(`${b.table}.${b.name}`));
for (const privilege of ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"]) {
  if (!canonical.tableGrants.some((grant) =>
    grant.table === "comun_schema_releases" &&
    grant.grantee === "postgres" &&
    grant.privilege === privilege
  )) canonical.tableGrants.push({ table: "comun_schema_releases", grantee: "postgres", privilege });
}
for (const privilege of ["REFERENCES", "TRIGGER", "TRUNCATE"]) {
  if (!canonical.tableGrants.some((grant) =>
    grant.table === "comun_schema_releases" &&
    grant.grantee === "service_role" &&
    grant.privilege === privilege
  )) canonical.tableGrants.push({ table: "comun_schema_releases", grantee: "service_role", privilege });
}
canonical.tableGrants.sort((a, b) =>
  `${a.table}.${a.grantee}.${a.privilege}`.localeCompare(`${b.table}.${b.grantee}.${b.privilege}`),
);

const projected = buildDocuments(
  { canonical, platform: source.platformInformationalSnapshot },
  "EXPECTED_AFTER_PROMOTION",
).compact;
if (projected.security.blockingFindings.length !== 0) {
  throw new Error(`COMUN_HARDENING_PROJECTED_FINDINGS:${projected.security.blockingFindings.length}`);
}

const migration = "supabase/migrations/20260723220112_comun_canonical_security_hardening.sql";
const migrationBytes = await readFile(migration);
const release = {
  release: "20260723220112-canonical-security-hardening",
  migration,
  migrationSha256: createHash("sha256").update(migrationBytes).digest("hex"),
  expectedPreFingerprint,
  expectedPostFingerprint: projected.fingerprint,
  acceptedLegacyLedgerValues: [
    `${createHash("sha256").update(migrationBytes).digest("hex")}|${expectedPreFingerprint}|${legacyProjectedPostFingerprint}`,
  ],
  destructiveSql: false,
  requiresPromotion: true,
  expectedBlockingFindings: 0,
  platformObservationsAllowed: true,
  releaseLedger: "public.comun_schema_releases",
  assertions: [
    "security_invoker=true",
    "public view SELECT-only",
    "default privileges hardened in public",
    "definer search_path=pg_catalog",
    "auth trigger preserved",
    "RLS preserved",
  ],
  changedObjects: [
    "public.comun_public_reports",
    "public.comun_reports RLS policy and public projection column grants",
    "public.claim_next_archive_processing_job(text)",
    "public.handle_new_user()",
    "postgres defaults in public",
    "public.comun_schema_releases",
  ],
};

await writeFile(
  baselineOutput,
  `${JSON.stringify(projected, null, 2)}\n`,
);
await writeFile(
  releaseOutput,
  `${JSON.stringify(release, null, 2)}\n`,
);
console.log(`COMUN_SECURITY_EXPECTED_POST ${projected.fingerprint}`);
