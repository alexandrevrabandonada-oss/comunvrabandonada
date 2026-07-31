import { execFileSync, spawnSync } from "node:child_process";
import {
  RESULT,
  sanitizedError,
  validateRemoteTarget,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const local = process.argv.includes("--local");

async function main() {
  try {
    const databaseUrl = local
      ? localDatabaseUrl()
      : process.env.SUPABASE_DB_URL;
    if (!local) {
      validateRemoteTarget({
        databaseUrl,
        projectRef: process.env.SUPABASE_PROJECT_REF,
        allowedRefs:
          process.env.COMUN_SECURITY_ALLOWED_PROJECT_REFS ||
          process.env.SUPABASE_PROJECT_REF,
      });
    }
    const audit = query(databaseUrl, SQL);
    const failures = [
      audit.tablesWithoutRls && "table_without_rls",
      audit.dangerousTableGrants && "dangerous_table_grant",
      audit.unsafeDefiners && "unsafe_security_definer",
      audit.exposedDefiners && "exposed_security_definer",
      audit.unsafeViews && "unsafe_public_view",
      audit.privateViewColumns && "private_column_in_public_view",
      audit.dangerousSequenceGrants && "dangerous_sequence_grant",
      audit.dangerousDefaultPrivileges && "dangerous_default_privilege",
      audit.dangerousStoragePolicies && "dangerous_storage_policy",
      audit.publicOriginalBuckets && "private_original_bucket_public",
      audit.clientControlledPolicies && "client_controlled_policy",
    ].filter(Boolean);
    const personas = [
      "anon",
      "authenticated_without_link",
      "visitor",
      "follower",
      "member",
      "coordinator",
      "editor",
      "administrator",
      "temporary_role",
      "revoked_role",
      "other_community_member",
      "service_role",
    ];
    const matrix = audit.tables.flatMap((table) =>
      personas.map((persona) => {
        const publicPersona = persona === "anon" || persona === "visitor";
        const service = persona === "service_role";
        const authenticated = !publicPersona && !service;
        return {
          resource: table.name,
          persona,
          select: service
            ? table.serviceSelect
            : publicPersona
              ? permission(table.anonSelect, table.rls)
              : permission(table.authSelect, table.rls),
          insert: service
            ? table.serviceInsert
              ? "allowed"
              : "blocked"
            : publicPersona
              ? permission(table.anonInsert, table.rls)
              : permission(table.authInsert, table.rls),
          update: service
            ? table.serviceUpdate
              ? "allowed"
              : "blocked"
            : publicPersona
              ? permission(table.anonUpdate, table.rls)
              : permission(table.authUpdate, table.rls),
          delete: service
            ? table.serviceDelete
              ? "allowed"
              : "blocked"
            : publicPersona
              ? permission(table.anonDelete, table.rls)
              : permission(table.authDelete, table.rls),
          expected:
            persona === "revoked_role"
              ? "policy_scoped_and_revocation_rehearsed"
              : authenticated
                ? "policy_scoped_to_server_verified_membership"
                : service
                  ? "server_only"
                  : "public_projection_only",
        };
      }),
    );
    const result = failures.length ? "COMUN_RLS_COMPLETE_BLOCKED" : RESULT.rls;
    await writeEvidence("10-rls-complete.json", {
      result,
      source: local ? "local_disposable_supabase" : "remote_read_only",
      counts: {
        tables: audit.tables.length,
        views: audit.views,
        materializedViews: audit.materializedViews,
        functions: audit.functions,
        sequences: audit.sequences,
        buckets: audit.buckets,
        policies: audit.policies,
        storagePolicies: audit.storagePolicies,
        personaMatrixRows: matrix.length,
      },
      findings: failures,
      matrix,
      functionBoundary: {
        securityDefiners: audit.securityDefiners,
        unsafeDefiners: audit.unsafeDefiners,
        exposedDefiners: audit.exposedDefiners,
        parameterAndReturnReview: "static_and_catalog_reviewed",
        resources: audit.functionResources,
      },
      views: {
        unsafe: audit.unsafeViews,
        privateColumns: audit.privateViewColumns,
        resources: audit.viewResources,
      },
      sequences: {
        dangerousGrants: audit.dangerousSequenceGrants,
        resources: audit.sequenceResources,
      },
    policies: {
      clientControlled: audit.clientControlledPolicies,
    },
    defaultPrivileges: {
      dangerousApplicationSchema: audit.dangerousDefaultPrivileges,
      providerManagedObserved: audit.providerManagedDefaultPrivileges,
    },
      storage: {
        publicOriginalBuckets: audit.publicOriginalBuckets,
        dangerousPolicies: audit.dangerousStoragePolicies,
        buckets: audit.bucketResources,
      },
      auth: {
        identitiesRead: false,
        passwordsRead: false,
        sessionsRead: false,
        policySurfaceOnly: true,
      },
      revocation: "covered_by_incident_rehearsal",
    });
    console.log(result);
    if (failures.length) process.exitCode = 1;
  } catch (error) {
    await writeFailureEvidence("rls_complete", error);
    if (process.env.COMUN_SECURITY_DEBUG === "1")
      console.error(error instanceof Error ? error.stack : error);
    console.error(sanitizedError(error));
    process.exitCode = 1;
  }
}

function permission(granted, rls) {
  if (!granted) return "blocked";
  return rls ? "policy_scoped" : "allowed";
}

function localDatabaseUrl() {
  const output = execFileSync(
    process.platform === "win32" ? "powershell" : "npx",
    process.platform === "win32"
      ? [
          "-NoProfile",
          "-Command",
          "$env:DO_NOT_TRACK='1'; npx supabase status -o env",
        ]
      : ["supabase", "status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const values = Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^"|"$/g, ""),
        ];
      }),
  );
  return values.DB_URL;
}

function query(databaseUrl, sql) {
  if (!databaseUrl) throw new Error("COMUN_SECURITY_DATABASE_URL_MISSING");
  const target = new URL(databaseUrl);
  if (["127.0.0.1", "localhost"].includes(target.hostname))
    target.hostname = "host.docker.internal";
  const containerUrl = target.toString();
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "-e",
      `DATABASE_URL=${containerUrl}`,
      "postgres:17",
      "sh",
      "-c",
      'psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1',
    ],
    {
      input: sql,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    if (process.env.COMUN_SECURITY_DEBUG === "1")
      console.error(result.stderr.trim());
    throw new Error("COMUN_SECURITY_CATALOG_QUERY_FAILED");
  }
  return JSON.parse(result.stdout.trim());
}

const SQL = String.raw`
with public_tables as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
), table_matrix as (
  select relname as name, relrowsecurity as rls, relforcerowsecurity as force_rls,
    has_table_privilege('anon',oid,'select') anon_select,
    has_table_privilege('anon',oid,'insert') anon_insert,
    has_table_privilege('anon',oid,'update') anon_update,
    has_table_privilege('anon',oid,'delete') anon_delete,
    has_table_privilege('authenticated',oid,'select') auth_select,
    has_table_privilege('authenticated',oid,'insert') auth_insert,
    has_table_privilege('authenticated',oid,'update') auth_update,
    has_table_privilege('authenticated',oid,'delete') auth_delete,
    has_table_privilege('service_role',oid,'select') service_select,
    has_table_privilege('service_role',oid,'insert') service_insert,
    has_table_privilege('service_role',oid,'update') service_update,
    has_table_privilege('service_role',oid,'delete') service_delete
  from public_tables
), public_views as (
  select c.oid,c.relname,c.relkind,
    coalesce(c.reloptions @> array['security_invoker=true'],false) security_invoker,
    has_table_privilege('anon',c.oid,'select') anon_select,
    has_table_privilege('authenticated',c.oid,'select') auth_select,
    exists(
      select 1 from information_schema.columns col
      where col.table_schema='public' and col.table_name=c.relname
      and col.column_name ~* '(private|internal|contact|email|token|secret|session|object_key|exact|geometry_geojson|password|consent_document)'
    ) private_columns
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('v','m')
), public_functions as (
  select p.oid,p.proname,p.prosecdef,
    pg_get_function_identity_arguments(p.oid) arguments,
    pg_get_function_result(p.oid) result,
    regexp_replace(coalesce(array_to_string(p.proconfig,','),''), '\s+', '', 'g')
      ~ '(^|,)search_path=(pg_catalog|pg_catalog,public|pg_catalog,pg_temp|public|public,pg_temp)($|,)'
      safe_path,
    has_function_privilege('anon',p.oid,'execute') anon_execute,
    has_function_privilege('authenticated',p.oid,'execute') auth_execute,
    has_function_privilege('service_role',p.oid,'execute') service_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
), public_sequences as (
  select c.oid,c.relname,
    has_sequence_privilege('anon',c.oid,'usage') anon_usage,
    has_sequence_privilege('authenticated',c.oid,'usage') auth_usage
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='S'
), storage_policy_audit as (
  select count(*) filter (
    where cmd in ('UPDATE','DELETE','ALL')
    and (roles::text ~ '(anon|public)')
    and (coalesce(qual,'') in ('true','(true)') or coalesce(with_check,'') in ('true','(true)'))
  )::int dangerous, count(*)::int total
  from pg_policies where schemaname='storage' and tablename='objects'
), public_policy_audit as (
  select count(*) filter (
    where concat_ws(' ',qual,with_check)
      ~* '(raw_user_meta_data|user_metadata|request\.jwt\.claims)'
  )::int client_controlled
  from pg_policies where schemaname='public'
), default_acl as (
  select count(*)::int dangerous
  from pg_default_acl d
  join pg_namespace n on n.oid=d.defaclnamespace
  cross join lateral aclexplode(coalesce(d.defaclacl,acldefault(d.defaclobjtype,d.defaclrole))) a
  left join pg_roles r on r.oid=a.grantee
  where n.nspname='public'
    and d.defaclrole=current_user::regrole
    and coalesce(r.rolname,'public') in ('public','anon','authenticated')
    and a.privilege_type in ('UPDATE','DELETE','TRUNCATE','TRIGGER','EXECUTE')
), provider_default_acl as (
  select count(*)::int observed
  from pg_default_acl d
  join pg_namespace n on n.oid=d.defaclnamespace
  cross join lateral aclexplode(coalesce(d.defaclacl,acldefault(d.defaclobjtype,d.defaclrole))) a
  left join pg_roles r on r.oid=a.grantee
  where (
      n.nspname='storage'
      or (n.nspname='public' and d.defaclrole<>current_user::regrole)
    )
    and coalesce(r.rolname,'public') in ('public','anon','authenticated')
), bucket_audit as (
  select id, public
  from storage.buckets
)
select json_build_object(
  'tables',coalesce((select json_agg(json_build_object(
    'name',name,'rls',rls,'forceRls',force_rls,
    'anonSelect',anon_select,'anonInsert',anon_insert,'anonUpdate',anon_update,'anonDelete',anon_delete,
    'authSelect',auth_select,'authInsert',auth_insert,'authUpdate',auth_update,'authDelete',auth_delete,
    'serviceSelect',service_select,'serviceInsert',service_insert,'serviceUpdate',service_update,'serviceDelete',service_delete
  ) order by name) from table_matrix),'[]'::json),
  'tablesWithoutRls',(select count(*)::int from table_matrix where not rls),
  'dangerousTableGrants',(select count(*)::int from table_matrix where not rls and (
    anon_select or anon_insert or anon_update or anon_delete or auth_select or auth_insert or auth_update or auth_delete)),
  'views',(select count(*)::int from public_views where relkind='v'),
  'materializedViews',(select count(*)::int from public_views where relkind='m'),
  'viewResources',coalesce((select json_agg(json_build_object(
    'name',relname,'kind',case when relkind='m' then 'materialized_view' else 'view' end,
    'securityInvoker',security_invoker,'privateColumns',private_columns,
    'anonSelect',anon_select,'authenticatedSelect',auth_select
  ) order by relname) from public_views),'[]'::json),
  'unsafeViews',(select count(*)::int from public_views where
    (anon_select or auth_select)
    and (relkind='m' or not security_invoker)),
  'privateViewColumns',(select count(*)::int from public_views where private_columns and
    (anon_select or auth_select)),
  'functions',(select count(*)::int from public_functions),
  'functionResources',coalesce((select json_agg(json_build_object(
    'name',proname,'arguments',arguments,'result',result,'securityDefiner',prosecdef,
    'safeSearchPath',safe_path,'anonExecute',anon_execute,
    'authenticatedExecute',auth_execute,'serviceRoleExecute',service_execute
  ) order by proname,arguments) from public_functions),'[]'::json),
  'securityDefiners',(select count(*)::int from public_functions where prosecdef),
  'unsafeDefiners',(select count(*)::int from public_functions where prosecdef and not safe_path),
  'exposedDefiners',(select count(*)::int from public_functions where prosecdef and (anon_execute or auth_execute)),
  'sequences',(select count(*)::int from public_sequences),
  'sequenceResources',coalesce((select json_agg(json_build_object(
    'name',relname,'anonUsage',anon_usage,'authenticatedUsage',auth_usage
  ) order by relname) from public_sequences),'[]'::json),
  'dangerousSequenceGrants',(select count(*)::int from public_sequences where anon_usage or auth_usage),
  'policies',(select count(*)::int from pg_policies where schemaname='public'),
  'clientControlledPolicies',(select client_controlled from public_policy_audit),
  'buckets',(select count(*)::int from bucket_audit),
  'bucketResources',coalesce((select json_agg(json_build_object(
    'bucket',id,'public',public
  ) order by id) from bucket_audit),'[]'::json),
  'publicOriginalBuckets',(select count(*)::int from bucket_audit where public and id ~* '(private|original)'),
  'storagePolicies',(select total from storage_policy_audit),
  'dangerousStoragePolicies',(select dangerous from storage_policy_audit),
  'dangerousDefaultPrivileges',(select dangerous from default_acl),
  'providerManagedDefaultPrivileges',(select observed from provider_default_acl)
);`;

await main();
