import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const BASELINE = new URL("../../reports/current/comun-remote-schema-baseline.json", import.meta.url);
const capture = process.argv.includes("--capture");
const outputArg = process.argv.find((value) => value.startsWith("--output="));
const connection = process.env.SUPABASE_DB_URL;

if (!connection) {
  throw new Error("SUPABASE_DB_URL is required");
}

const query = String.raw`
with payload as (
  select jsonb_build_object(
    'schemas', coalesce((select jsonb_agg(nspname order by nspname)
      from pg_namespace where nspname in ('public','auth','storage','supabase_migrations')), '[]'::jsonb),
    'relations', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', c.relname, 'kind', c.relkind
    ) order by n.nspname,c.relname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','auth','storage') and c.relkind in ('r','p','v','m')), '[]'::jsonb),
    'columns', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', table_schema, 'table', table_name, 'name', column_name,
      'type', data_type, 'nullable', is_nullable, 'default', column_default
    ) order by table_schema,table_name,ordinal_position)
      from information_schema.columns where table_schema in ('public','auth','storage')), '[]'::jsonb),
    'constraints', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', con.conname,
      'type', con.contype, 'definition', pg_get_constraintdef(con.oid)
    ) order by n.nspname,c.relname,con.conname)
      from pg_constraint con join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage')), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', indexname, 'definition', indexdef
    ) order by schemaname,tablename,indexname)
      from pg_indexes where schemaname in ('public','auth','storage')), '[]'::jsonb),
    'policies', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname,
      'permissive', permissive, 'roles', roles, 'command', cmd,
      'using', qual, 'check', with_check
    ) order by schemaname,tablename,policyname)
      from pg_policies where schemaname in ('public','auth','storage')), '[]'::jsonb),
    'functions', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'identityArguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid), 'securityDefiner', p.prosecdef
    ) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','auth','storage')), '[]'::jsonb),
    'grants', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', table_schema, 'table', table_name, 'grantee', grantee, 'privilege', privilege_type
    ) order by table_schema,table_name,grantee,privilege_type)
      from information_schema.role_table_grants where table_schema in ('public','auth','storage')), '[]'::jsonb),
    'defaultPrivileges', coalesce((select jsonb_agg(jsonb_build_object(
      'schema', coalesce(n.nspname,'*'), 'owner', pg_get_userbyid(d.defaclrole),
      'objectType', d.defaclobjtype, 'acl', d.defaclacl::text
    ) order by coalesce(n.nspname,'*'),pg_get_userbyid(d.defaclrole),d.defaclobjtype)
      from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace), '[]'::jsonb),
    'authTriggers', coalesce((select jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', t.tgname, 'definition', pg_get_triggerdef(t.oid)
    ) order by c.relname,t.tgname)
      from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='auth' and not t.tgisinternal), '[]'::jsonb),
    'buckets', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'public', public, 'fileSizeLimit', file_size_limit,
      'allowedMimeTypes', allowed_mime_types
    ) order by id) from storage.buckets), '[]'::jsonb),
    'migrations', coalesce((select jsonb_agg(version order by version)
      from supabase_migrations.schema_migrations), '[]'::jsonb)
  ) as value
)
select value::text from payload;`;

const result = spawnSync("psql", [connection, "--no-psqlrc", "--tuples-only", "--no-align", "--quiet", "-c", query], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (result.status !== 0) {
  throw new Error(`Read-only baseline query failed: ${(result.stderr || "").trim()}`);
}

const metadata = JSON.parse(result.stdout.trim());
const canonical = JSON.stringify(metadata);
const fingerprint = createHash("sha256").update(canonical).digest("hex");
const document = {
  formatVersion: 1,
  capturedAt: new Date().toISOString(),
  scope: "catalog metadata only; no application rows or object keys",
  fingerprintAlgorithm: "sha256-json-canonical-order-v1",
  fingerprint,
  metadata,
};

if (capture) {
  const target = outputArg ? outputArg.slice("--output=".length) : new URL("comun-remote-schema-baseline.json", `file://${process.cwd()}/`);
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`COMUN_REMOTE_SCHEMA_BASELINE_CAPTURED ${fingerprint}`);
} else {
  const approved = JSON.parse(await readFile(BASELINE, "utf8"));
  if (approved.fingerprint !== fingerprint) {
    console.error(`COMUN_REMOTE_SCHEMA_DRIFT expected=${approved.fingerprint} actual=${fingerprint}`);
    process.exit(1);
  }
  console.log(`COMUN_REMOTE_SCHEMA_BASELINE_OK ${fingerprint}`);
}
