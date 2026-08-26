#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"

case "$SUPABASE_DB_URL" in
  *localhost*|*127.0.0.1*|*::1*)
    echo 'COMUN_48_6_B0_BLOCKED_INVALID_PRODUCTION_TRANSPORT'
    exit 1
    ;;
esac

test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"
git merge-base --is-ancestor "$EXPECTED_MAIN_SHA" HEAD

artifact_dir="${B0_ARTIFACT_DIR:-.ci-artifacts/48-6-b0-preflight}"
mkdir -p "$artifact_dir"

# This query is deliberately metadata-only. It never selects from a business
# table and is wrapped in an explicit read-only transaction.
psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$artifact_dir/schema.json" <<'SQL'
begin read only;
with legacy_local_functions(signature) as (
  values
    ('public.comun_relata_public_list'),
    ('public.comun_relata_public_get'),
    ('public.comun_relata_public_confirm')
), expected_roots(schema_name, object_name) as (
  values
    ('public','comun_relata_collective_cases'),
    ('public','comun_relata_case_memberships'),
    ('private','comun_relata_private_locations'),
    ('public','comun_relata_evidence_consents'),
    ('public','comun_relata_public_snapshots')
), scoped_tables(schema_name, table_name) as (
  values
    ('public','comun_relata_collective_cases'),
    ('public','comun_relata_case_memberships'),
    ('public','comun_relata_evidence_consents'),
    ('public','comun_relata_public_snapshots'),
    ('private','comun_relata_private_locations')
)
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'legacyLocalMapFunctions', coalesce((
    select json_agg(json_build_object(
      'name', f.signature,
      'present', exists(
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = split_part(f.signature, '.', 1)
          and p.proname = split_part(f.signature, '.', 2)
      )
    ) order by f.signature)
    from legacy_local_functions f
  ), '[]'::json),
  'roots', coalesce((
    select json_agg(json_build_object(
      'schema', r.schema_name,
      'object', r.object_name,
      'present', to_regclass(format('%I.%I', r.schema_name, r.object_name)) is not null
    ) order by r.schema_name, r.object_name)
    from expected_roots r
  ), '[]'::json),
  'tables', coalesce((
    select json_agg(json_build_object(
      'schema', t.schema_name,
      'table', t.table_name,
      'present', c.oid is not null,
      'rlsEnabled', coalesce(c.relrowsecurity, false),
      'forceRls', coalesce(c.relforcerowsecurity, false)
    ) order by t.schema_name, t.table_name)
    from scoped_tables t
    left join pg_class c on c.oid = to_regclass(format('%I.%I', t.schema_name, t.table_name))
  ), '[]'::json),
  'relevantColumns', coalesce((
    select json_agg(json_build_object(
      'schema', c.table_schema,
      'table', c.table_name,
      'column', c.column_name,
      'type', c.data_type,
      'nullable', c.is_nullable
    ) order by c.table_schema, c.table_name, c.ordinal_position)
    from information_schema.columns c
    where (c.table_schema, c.table_name) in (
      select schema_name, table_name from scoped_tables
    )
  ), '[]'::json),
  'relevantConstraints', coalesce((
    select json_agg(json_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', con.conname,
      'type', con.contype,
      'definition', pg_get_constraintdef(con.oid)
    ) order by n.nspname, c.relname, con.conname)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where (n.nspname, c.relname) in (
      select schema_name, table_name from scoped_tables
    )
  ), '[]'::json),
  'relevantIndexes', coalesce((
    select json_agg(json_build_object(
      'schema', i.schemaname,
      'table', i.tablename,
      'name', i.indexname,
      'definition', i.indexdef
    ) order by i.schemaname, i.tablename, i.indexname)
    from pg_indexes i
    where (i.schemaname, i.tablename) in (
      select schema_name, table_name from scoped_tables
    )
  ), '[]'::json),
  'relevantPolicies', coalesce((
    select json_agg(json_build_object(
      'schema', p.schemaname,
      'table', p.tablename,
      'name', p.policyname,
      'roles', p.roles,
      'command', p.cmd
    ) order by p.schemaname, p.tablename, p.policyname)
    from pg_policies p
    where (p.schemaname, p.tablename) in (
      select schema_name, table_name from scoped_tables
    )
  ), '[]'::json),
  'relevantGrants', coalesce((
    select json_agg(json_build_object(
      'schema', g.table_schema,
      'table', g.table_name,
      'grantee', g.grantee,
      'privilege', g.privilege_type
    ) order by g.table_schema, g.table_name, g.grantee, g.privilege_type)
    from information_schema.role_table_grants g
    where (g.table_schema, g.table_name) in (
      select schema_name, table_name from scoped_tables
    )
      and g.grantee in ('anon','authenticated','service_role')
  ), '[]'::json),
  'migrationHistory', coalesce((
    select json_agg(json_build_object('version', version) order by version)
    from supabase_migrations.schema_migrations
    where version like '20260803%'
       or version like '20260805%'
       or version like '20260823%'
  ), '[]'::json),
  'b0MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826090000'),
  'b0SchemaTables', coalesce((
    select json_agg(json_build_object(
      'schema', t.schema_name,
      'table', t.table_name,
      'present', to_regclass(format('%I.%I', t.schema_name, t.table_name)) is not null
    ) order by t.schema_name, t.table_name)
    from (values
      ('public','comun_relata_collective_cases'),
      ('public','comun_relata_case_memberships'),
      ('private','comun_relata_case_match_keys'),
      ('public','comun_relata_case_match_events'),
      ('private','comun_relata_public_projection_consents'),
      ('private','comun_relata_public_projection_candidates'),
      ('private','comun_relata_public_projections'),
      ('private','comun_relata_public_projection_events'),
      ('private','comun_relata_public_confirmations'),
      ('private','comun_relata_public_confirmation_events')
    ) as t(schema_name, table_name)
  ), '[]'::json),
  'b0PublicFunctions', coalesce((
    select json_agg(json_build_object(
      'name', f.signature,
      'present', to_regprocedure(f.signature) is not null
    ) order by f.signature)
    from (values
      ('public.comun_denuncias_public_list(text,integer)'),
      ('public.comun_denuncias_public_get(uuid)')
    ) as f(signature)
  ), '[]'::json),
  'businessContentRead', false
);
rollback;
SQL

node --input-type=module <<'NODE'
import fs from 'node:fs';
const path = `${process.env.B0_ARTIFACT_DIR ?? '.ci-artifacts/48-6-b0-preflight'}/schema.json`;
const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
const legacyFunctions = schema.legacyLocalMapFunctions ?? [];
const b0Tables = schema.b0SchemaTables ?? [];
const b0Functions = schema.b0PublicFunctions ?? [];
const unexpectedLegacyObjects = [
  ...legacyFunctions.filter((entry) => entry.present).map((entry) => entry.name),
];
if (schema.transactionReadOnly !== true || schema.businessContentRead !== false) {
  throw new Error('COMUN_48_6_B0_BLOCKED_READ_ONLY_PREFLIGHT');
}
if (schema.b0MigrationCount !== 1 || b0Tables.some((entry) => entry.present !== true) || b0Functions.some((entry) => entry.present !== true)) {
  fs.writeFileSync(`${process.env.B0_ARTIFACT_DIR ?? '.ci-artifacts/48-6-b0-preflight'}/result.json`, JSON.stringify({
    result: 'COMUN_48_6_B0_BLOCKED_SCHEMA_NOT_RECONCILED',
    b0MigrationCount: schema.b0MigrationCount,
    b0Tables,
    b0Functions,
    businessContentRead: false,
  }) + '\n');
  throw new Error('COMUN_48_6_B0_BLOCKED_SCHEMA_NOT_RECONCILED');
}
if (unexpectedLegacyObjects.length > 0) {
  fs.writeFileSync(`${process.env.B0_ARTIFACT_DIR ?? '.ci-artifacts/48-6-b0-preflight'}/result.json`, JSON.stringify({
    result: 'COMUN_48_6_B0_BLOCKED_UNEXPECTED_PUBLIC_PROJECTION_SCHEMA_DRIFT',
    unexpectedLegacyObjects,
    businessContentRead: false,
  }) + '\n');
  throw new Error('COMUN_48_6_B0_BLOCKED_UNEXPECTED_PUBLIC_PROJECTION_SCHEMA_DRIFT');
}
fs.writeFileSync(`${process.env.B0_ARTIFACT_DIR ?? '.ci-artifacts/48-6-b0-preflight'}/result.json`, JSON.stringify({
  result: 'COMUN_48_6_B0_REMOTE_PREFLIGHT_GREEN',
  transactionReadOnly: true,
  b0MigrationApplied: true,
  b0SchemaReconciled: true,
  legacyLocalMapObjectsPresent: false,
  businessContentRead: false,
  collectiveSchemaPresenceRecorded: true,
}) + '\n');
NODE

echo 'COMUN_48_6_B0_REMOTE_PREFLIGHT_GREEN' >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
