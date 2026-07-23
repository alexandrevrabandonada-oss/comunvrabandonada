import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const connection = process.env.SUPABASE_DB_URL;
const output = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
if (!connection || !output) throw new Error("SUPABASE_DB_URL and --output are required");

const query = String.raw`
select jsonb_build_object(
  'capturedAt', now(),
  'scope', 'COMUN_CANONICAL_SECURITY_HARDENING_PREFLIGHT',
  'view', (
    select jsonb_build_object(
      'schema', n.nspname, 'name', c.relname, 'owner', pg_get_userbyid(c.relowner),
      'options', coalesce(c.reloptions,array[]::text[]),
      'definition', regexp_replace(pg_get_viewdef(c.oid,true), '\s+', ' ', 'g'),
      'grants', coalesce((select jsonb_agg(jsonb_build_object(
        'grantee', grantee, 'privilege', privilege_type
      ) order by grantee,privilege_type) from information_schema.role_table_grants
        where table_schema='public' and table_name='comun_public_reports'), '[]'::jsonb),
      'dependencies', coalesce((select jsonb_agg(distinct jsonb_build_object(
        'schema', dn.nspname, 'relation', dc.relname, 'kind', dc.relkind,
        'rls', dc.relrowsecurity, 'forceRls', dc.relforcerowsecurity
      )) from pg_rewrite rw join pg_depend d on d.objid=rw.oid
        join pg_class dc on dc.oid=d.refobjid join pg_namespace dn on dn.oid=dc.relnamespace
        where rw.ev_class=c.oid and d.refobjid<>c.oid and dn.nspname='public'), '[]'::jsonb)
    ) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='comun_public_reports' and c.relkind='v'
  ),
  'dependencyPolicies', coalesce((select jsonb_agg(jsonb_build_object(
    'schema', schemaname, 'table', tablename, 'name', policyname, 'roles', roles,
    'command', cmd, 'using', qual, 'check', with_check
  ) order by tablename,policyname) from pg_policies where schemaname='public'
    and tablename in ('comun_reports')), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(jsonb_build_object(
    'name', p.proname, 'identityArguments', pg_get_function_identity_arguments(p.oid),
    'owner', pg_get_userbyid(p.proowner), 'config', coalesce(p.proconfig,array[]::text[]),
    'securityDefiner', p.prosecdef,
    'definition', regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'),
    'grants', coalesce((select jsonb_agg(jsonb_build_object(
      'grantee', grantee, 'privilege', privilege_type
    ) order by grantee,privilege_type) from information_schema.role_routine_grants
      where routine_schema='public' and specific_name=p.proname || '_' || p.oid), '[]'::jsonb)
  ) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (
      (p.proname='claim_next_archive_processing_job' and pg_get_function_identity_arguments(p.oid)='p_worker_id text')
      or (p.proname='handle_new_user' and pg_get_function_identity_arguments(p.oid)='')
    )), '[]'::jsonb),
  'authTriggers', coalesce((select jsonb_agg(jsonb_build_object(
    'name', t.tgname, 'table', c.relname, 'function', fn.nspname || '.' || p.proname,
    'definition', regexp_replace(pg_get_triggerdef(t.oid), '\s+', ' ', 'g')
  ) order by t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
    join pg_namespace fn on fn.oid=p.pronamespace where not t.tgisinternal
      and n.nspname='auth' and c.relname='users'
      and (t.tgname='on_auth_user_created' or (fn.nspname='public' and p.proname='handle_new_user'))), '[]'::jsonb),
  'defaultPrivileges', coalesce((select jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'owner', pg_get_userbyid(d.defaclrole),
    'objectType', d.defaclobjtype, 'acl', d.defaclacl::text
  ) order by pg_get_userbyid(d.defaclrole),d.defaclobjtype) from pg_default_acl d
    join pg_namespace n on n.oid=d.defaclnamespace where n.nspname='public'
      and pg_get_userbyid(d.defaclrole) in ('postgres','supabase_admin')), '[]'::jsonb)
);`;

const result = spawnSync("psql", [connection, "--no-psqlrc", "--tuples-only", "--no-align", "--quiet", "-c", query], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (result.status !== 0) throw new Error(`Read-only preflight failed: ${(result.stderr || "").trim()}`);
const document = JSON.parse(result.stdout.trim());
const serialized = `${JSON.stringify(document, null, 2)}\n`;
if (/"(email|phone|user_id|object_key|exact_latitude|exact_longitude)"\s*:/i.test(serialized)) {
  throw new Error("PREFLIGHT_FORBIDDEN_DATA_FIELD");
}
await writeFile(output, serialized);
console.log("COMUN_SECURITY_HARDENING_PREFLIGHT_CAPTURED");

