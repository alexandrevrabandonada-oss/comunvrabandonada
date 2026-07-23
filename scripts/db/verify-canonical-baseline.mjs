import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MAX_VERSIONED_BASELINE_BYTES = 5 * 1024 * 1024;
const BASELINE = new URL("../../reports/current/comun-remote-schema-baseline.json", import.meta.url);
const SAFE_DEFINER_EXECUTE = new Set([
  // Every exception must be reviewed and justified in the findings report.
]);

export const query = String.raw`
with app_relations as (
  select n.nspname as schema, c.relname as name, c.relkind as kind,
    pg_get_userbyid(c.relowner) as owner, c.relrowsecurity as rls,
    c.relforcerowsecurity as force_rls, coalesce(c.reloptions, array[]::text[]) as options,
    c.relpersistence as persistence, c.relreplident as replica_identity,
    case when c.relkind in ('v','m') then regexp_replace(pg_get_viewdef(c.oid, true), '\s+', ' ', 'g') end as definition
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p','v','m','S')
), payload as (
select jsonb_build_object(
  'canonical', jsonb_build_object(
    'relations', coalesce((select jsonb_agg(to_jsonb(r) order by schema,name) from app_relations r), '[]'::jsonb),
    'columns', coalesce((select jsonb_agg(jsonb_build_object(
      'table', table_name, 'name', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default
    ) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'), '[]'::jsonb),
    'constraints', coalesce((select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', x.conname, 'type', x.contype,
      'definition', pg_get_constraintdef(x.oid)
    ) order by c.relname,x.conname) from pg_constraint x join pg_class c on c.oid=x.conrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', indexname, 'definition', regexp_replace(indexdef, '\s+', ' ', 'g')
    ) order by tablename,indexname) from pg_indexes where schemaname='public'), '[]'::jsonb),
    'policies', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname, 'permissive', permissive,
      'roles', roles, 'command', cmd, 'using', qual, 'check', with_check
    ) order by schemaname,tablename,policyname) from pg_policies
      where schemaname='public' or (schemaname='storage' and tablename='objects')), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'identityArguments', pg_get_function_identity_arguments(p.oid),
      'specificName', p.proname || '_' || p.oid,
      'result', pg_get_function_result(p.oid), 'owner', pg_get_userbyid(p.proowner),
      'securityDefiner', p.prosecdef, 'config', coalesce(p.proconfig,array[]::text[]),
      'definition', regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g')
    ) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'), '[]'::jsonb),
    'tableGrants', coalesce((select jsonb_agg(jsonb_build_object(
      'table', table_name, 'grantee', grantee, 'privilege', privilege_type
    ) order by table_name,grantee,privilege_type) from information_schema.role_table_grants
      where table_schema='public'), '[]'::jsonb),
    'sequenceGrants', coalesce((select jsonb_agg(jsonb_build_object(
      'sequence', object_name, 'grantee', grantee, 'privilege', privilege_type
    ) order by object_name,grantee,privilege_type) from information_schema.role_usage_grants
      where object_schema='public' and object_type='SEQUENCE'), '[]'::jsonb),
    'routineGrants', coalesce((select jsonb_agg(jsonb_build_object(
      'routine', routine_name, 'specificName', specific_name, 'grantee', grantee, 'privilege', privilege_type
    ) order by routine_name,specific_name,grantee,privilege_type) from information_schema.role_routine_grants
      where routine_schema='public'), '[]'::jsonb),
    'schemaGrants', coalesce((select jsonb_agg(jsonb_build_object(
      'grantee', case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,
      'privilege', x.privilege_type
    ) order by case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end,x.privilege_type)
      from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n',n.nspowner))) x
      where n.nspname='public'), '[]'::jsonb),
    'defaultPrivileges', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', coalesce(n.nspname,'*'), 'owner', pg_get_userbyid(d.defaclrole),
      'objectType', d.defaclobjtype, 'acl', d.defaclacl::text
    ) order by coalesce(n.nspname,'*'),pg_get_userbyid(d.defaclrole),d.defaclobjtype)
      from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
      where n.nspname='public' or n.nspname is null), '[]'::jsonb),
    'triggers', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
      'definition', regexp_replace(pg_get_triggerdef(t.oid), '\s+', ' ', 'g')
    ) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and (
        n.nspname='public' or (n.nspname='auth' and
          (t.tgname ilike '%comun%' or pg_get_triggerdef(t.oid) ilike '%public.%'))
      )), '[]'::jsonb),
    'buckets', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'public', public, 'fileSizeLimit', file_size_limit,
      'allowedMimeTypes', allowed_mime_types
    ) order by id) from storage.buckets
      where id like 'comun-%' or id in ('archive-private-originals','archive-public-derivatives')), '[]'::jsonb),
    'migrations', coalesce((select jsonb_agg(version order by version)
      from supabase_migrations.schema_migrations), '[]'::jsonb)
  ),
  'platform', jsonb_build_object(
    'authRelations', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='auth' and c.relkind in ('r','p','v','m')),
    'storageRelations', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='storage' and c.relkind in ('r','p','v','m')),
    'authFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='auth'),
    'storageFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='storage'),
    'storagePolicies', (select count(*) from pg_policies where schemaname='storage'),
    'postgresVersion', current_setting('server_version_num')::int
  )
) as value
)
select value::text from payload;`;

const normalize = (value) => JSON.parse(JSON.stringify(value));
export const fingerprintCanonical = (canonical) =>
  createHash("sha256").update(JSON.stringify(normalize(canonical))).digest("hex");

const finding = (classification, rule, object, detail) => ({ classification, rule, object, detail });

export function evaluateSecurity(canonical) {
  const findings = [];
  const relations = canonical.relations || [];
  const tableGrants = canonical.tableGrants || [];
  const exposedRoles = new Set(["PUBLIC", "anon", "authenticated"]);
  const exposedTables = new Set(tableGrants.filter((g) => exposedRoles.has(g.grantee)).map((g) => g.table));

  for (const relation of relations.filter((r) => ["r", "p"].includes(r.kind) && exposedTables.has(r.name))) {
    if (!relation.rls) findings.push(finding("EXCESS_PRIVILEGE", "RLS_ENABLED", `public.${relation.name}`, "exposed relation has RLS disabled"));
  }
  for (const grant of tableGrants) {
    if (["anon", "authenticated"].includes(grant.grantee) && ["TRUNCATE", "TRIGGER", "MAINTAIN"].includes(grant.privilege)) {
      findings.push(finding("EXCESS_PRIVILEGE", "DANGEROUS_RELATION_GRANT", `public.${grant.table}`, `${grant.grantee}:${grant.privilege}`));
    }
  }
  for (const grant of canonical.schemaGrants || []) {
    if (exposedRoles.has(grant.grantee) && grant.privilege === "CREATE") {
      findings.push(finding("EXCESS_PRIVILEGE", "PUBLIC_SCHEMA_CREATE", "schema public", grant.grantee));
    }
  }
  const routineGrants = canonical.routineGrants || [];
  for (const fn of canonical.functions || []) {
    const identity = `public.${fn.name}(${fn.identityArguments})`;
    const searchPath = (fn.config || []).find((entry) => entry.startsWith("search_path="));
    if (fn.securityDefiner && (!searchPath || /(^|,)\s*public\s*(,|$)/.test(searchPath.slice(12)))) {
      findings.push(finding("FUNCTION_SECURITY_RISK", "DEFINER_SEARCH_PATH", identity, searchPath || "search_path not fixed"));
    }
    if (fn.securityDefiner && !SAFE_DEFINER_EXECUTE.has(identity)) {
      for (const grant of routineGrants.filter((g) => g.specificName === fn.specificName && exposedRoles.has(g.grantee))) {
        findings.push(finding("FUNCTION_SECURITY_RISK", "DEFINER_EXECUTE", identity, grant.grantee));
      }
    }
  }
  for (const view of relations.filter((r) => ["v", "m"].includes(r.kind) && exposedTables.has(r.name))) {
    const invoker = (view.options || []).includes("security_invoker=true");
    if (!invoker) findings.push(finding("VIEW_SECURITY_RISK", "VIEW_SECURITY_INVOKER", `public.${view.name}`, "exposed view is not security_invoker"));
  }
  for (const bucket of canonical.buckets || []) {
    if (/private|original/i.test(bucket.id) && bucket.public) {
      findings.push(finding("EXCESS_PRIVILEGE", "PRIVATE_BUCKET", `storage.${bucket.id}`, "bucket is public"));
    }
  }
  for (const policy of canonical.policies || []) {
    const expression = `${policy.using || ""} ${policy.check || ""}`;
    if (policy.schema === "storage" && (policy.roles || []).some((role) => exposedRoles.has(role)) &&
        /exact_(latitude|longitude)|object_key|private-original/i.test(expression)) {
      findings.push(finding("EXCESS_PRIVILEGE", "STORAGE_POLICY_EXPOSURE", `storage.${policy.table}.${policy.name}`, "sensitive locator referenced by exposed policy"));
    }
  }
  for (const privilege of canonical.defaultPrivileges || []) {
    const acl = privilege.acl || "";
    const dangerousNamed = /(anon|authenticated).*(TRUNCATE|TRIGGER|MAINTAIN|CREATE)/i.test(acl);
    const dangerousAclLetters = /(?:anon|authenticated)=[^,}]*(?:D|x|t|m)/.test(acl);
    if (dangerousNamed || dangerousAclLetters) {
      findings.push(finding("DEFAULT_PRIVILEGE_RISK", "DANGEROUS_DEFAULT_PRIVILEGE", `${privilege.schema}:${privilege.objectType}`, privilege.acl));
    }
  }
  return findings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function buildDocuments(raw, capturedAt = new Date().toISOString()) {
  const canonical = normalize(raw.canonical);
  const platform = normalize(raw.platform);
  const findings = evaluateSecurity(canonical);
  const fingerprint = fingerprintCanonical(canonical);
  const counts = Object.fromEntries(Object.entries(canonical).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));
  const compact = {
    formatVersion: 2,
    capturedAt,
    fingerprint,
    fingerprintAlgorithm: "sha256-app-canonical-security-v2",
    scope: "APP_CANONICAL_SECURITY_BASELINE",
    counts,
    canonical,
    security: { status: findings.length ? "COMUN_BASELINE_SECURITY_FINDINGS" : "COMUN_BASELINE_SECURITY_OK", findings },
    platformInformationalSnapshot: platform,
  };
  const detailed = {
    ...compact,
    artifactScope: "sanitized catalog metadata; no application rows, user identifiers, filenames, object keys, coordinates or secrets",
  };
  return { compact, detailed };
}

export function assertVersionedBaseline(document) {
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_VERSIONED_BASELINE_BYTES) throw new Error("VERSIONED_BASELINE_EXCEEDS_5_MIB");
  if (/"(email|phone|user_id|object_key|exact_latitude|exact_longitude)"\s*:/i.test(serialized)) {
    throw new Error("BASELINE_FORBIDDEN_DATA_FIELD");
  }
  return serialized;
}

async function readRemote(connection) {
  const result = spawnSync("psql", [connection, "--no-psqlrc", "--tuples-only", "--no-align", "--quiet", "-c", query], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Read-only baseline query failed: ${(result.stderr || "").trim()}`);
  return JSON.parse(result.stdout.trim());
}

async function main() {
  const connection = process.env.SUPABASE_DB_URL;
  if (!connection) throw new Error("SUPABASE_DB_URL is required");
  const capture = process.argv.includes("--capture");
  const outputArg = process.argv.find((value) => value.startsWith("--output="));
  const compactArg = process.argv.find((value) => value.startsWith("--compact-output="));
  const documents = buildDocuments(await readRemote(connection));

  if (capture) {
    const detailedTarget = outputArg?.slice("--output=".length) || "comun-remote-schema-detailed.json";
    await writeFile(detailedTarget, `${JSON.stringify(documents.detailed, null, 2)}\n`);
    if (compactArg) await writeFile(compactArg.slice("--compact-output=".length), assertVersionedBaseline(documents.compact));
    console.log(`${documents.compact.security.status} ${documents.compact.security.findings.length}`);
    console.log(`COMUN_REMOTE_SCHEMA_BASELINE_CAPTURED ${documents.compact.fingerprint}`);
    return;
  }

  const approved = JSON.parse(await readFile(BASELINE, "utf8"));
  if ((await stat(BASELINE)).size > MAX_VERSIONED_BASELINE_BYTES) throw new Error("VERSIONED_BASELINE_EXCEEDS_5_MIB");
  if (documents.compact.security.findings.length) {
    const approvedFindings = JSON.stringify(approved.security?.findings || []);
    const currentFindings = JSON.stringify(documents.compact.security.findings);
    if (!process.argv.includes("--allow-approved-findings") || approvedFindings !== currentFindings) {
      console.error(`COMUN_BASELINE_SECURITY_FINDINGS ${documents.compact.security.findings.length}`);
      process.exit(1);
    }
    console.log(`COMUN_BASELINE_SECURITY_FINDINGS ${documents.compact.security.findings.length} APPROVED_FOR_DRIFT_ONLY`);
  }
  if (approved.fingerprint !== documents.compact.fingerprint) {
    console.error(`COMUN_REMOTE_SCHEMA_DRIFT expected=${approved.fingerprint} actual=${documents.compact.fingerprint}`);
    process.exit(1);
  }
  if (!documents.compact.security.findings.length) console.log("COMUN_BASELINE_SECURITY_OK");
  console.log(`COMUN_REMOTE_SCHEMA_BASELINE_OK ${documents.compact.fingerprint}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
