import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { buildDocuments } from "./verify-canonical-baseline.mjs";

const source = JSON.parse(
  await readFile("reports/current/comun-remote-schema-baseline.json", "utf8"),
);
if (source.fingerprint !== "f8834c3a673d66cc35b71a25fa878cc123c8741281273ba7e75a03d051a79793") {
  throw new Error("COMUN_HARDENING_PRE_FINGERPRINT_MISMATCH");
}

const canonical = structuredClone(source.canonical);
const view = canonical.relations.find((item) => item.name === "comun_public_reports");
view.options = ["security_invoker=true"];
canonical.tableGrants = canonical.tableGrants.filter(
  (grant) =>
    grant.table !== "comun_public_reports" ||
    !["anon", "authenticated"].includes(grant.grantee) ||
    grant.privilege === "SELECT",
);
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
  } else if (privilege.owner === "supabase_admin" && privilege.objectType === "r") {
    privilege.acl =
      "{postgres=arwdDxtm/supabase_admin,service_role=arwdDxtm/supabase_admin}";
  } else if (privilege.owner === "supabase_admin" && privilege.objectType === "S") {
    privilege.acl = "{postgres=rwU/supabase_admin,service_role=rwU/supabase_admin}";
  } else if (privilege.owner === "supabase_admin" && privilege.objectType === "f") {
    privilege.acl = "{postgres=X/supabase_admin,service_role=X/supabase_admin}";
  }
}

const projected = buildDocuments(
  { canonical, platform: source.platformInformationalSnapshot },
  "EXPECTED_AFTER_PROMOTION",
).compact;
if (projected.security.findings.length !== 0) {
  throw new Error(`COMUN_HARDENING_PROJECTED_FINDINGS:${projected.security.findings.length}`);
}

const migration = "supabase/migrations/20260723220112_comun_canonical_security_hardening.sql";
const migrationBytes = await readFile(migration);
const release = {
  release: "20260723220112-canonical-security-hardening",
  migration,
  migrationSha256: createHash("sha256").update(migrationBytes).digest("hex"),
  expectedPreFingerprint: source.fingerprint,
  expectedPostFingerprint: projected.fingerprint,
  destructiveSql: false,
  requiresPromotion: true,
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
    "supabase_admin defaults in public",
  ],
};

await writeFile(
  "reports/current/comun-remote-schema-baseline.json",
  `${JSON.stringify(projected, null, 2)}\n`,
);
await writeFile(
  "supabase/releases/20260723220112-canonical-security-hardening.json",
  `${JSON.stringify(release, null, 2)}\n`,
);
console.log(`COMUN_SECURITY_EXPECTED_POST ${projected.fingerprint}`);
