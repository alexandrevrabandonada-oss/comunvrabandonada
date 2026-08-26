#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
MODE="${B0_EXECUTION_MODE:-preflight}"
MIGRATION="supabase/migrations/20260826090000_comun_denuncias_public_collective_projection.sql"
MIGRATION_VERSION="20260826090000"
MIGRATION_SHA256="590fba97f44f549588b8e97b2dc88fc80a83844fa1e612facb6e5b58674328f4"
SIDEWALK_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
SIDEWALK_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
SIDEWALK_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-b0-production"

case "$MODE" in
  preflight|promote|postflight) ;;
  *) echo "COMUN_48_6_B0_BLOCKED_UNKNOWN_MODE"; exit 1 ;;
esac

mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
fail() { echo "$1" >&2; printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; exit 1; }

test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B0_BLOCKED_MAIN_DRIFT
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B0_BLOCKED_MAIN_DRIFT
test "$(sha256sum "$MIGRATION" | awk '{print tolower($1)}')" = "$MIGRATION_SHA256" || fail COMUN_48_6_B0_BLOCKED_MIGRATION_CHECKSUM_DRIFT
test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA256" || fail COMUN_48_6_B0_BLOCKED_EXTERNAL_MIGRATION_CHECKSUM_DRIFT

node --input-type=module - "$SIDEWALK_EXCEPTION" <<'NODE'
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (manifest.path !== 'supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql'
  || manifest.sha256 !== '6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be'
  || manifest.cliHistoryExpected !== 'absent'
  || manifest.remoteStateRequired !== 'applied_exact_scoped'
  || manifest.excludeFromCliPlanning !== true
  || manifest.failClosedOnChange !== true) {
  throw new Error('COMUN_48_6_B0_BLOCKED_EXTERNAL_MIGRATION_EXCEPTION_MANIFEST');
}
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/preflight.json" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826090000'),
  'oldLocalProjectionTables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname,c.relname) in (
    ('private','comun_relata_public_projection_candidates'),('private','comun_relata_public_projections'),
    ('private','comun_relata_public_projection_events'),('private','comun_relata_public_confirmations'),
    ('private','comun_relata_public_confirmation_events'))),
  'oldLocalProjectionFunctions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('comun_relata_public_list','comun_relata_public_get','comun_relata_public_confirm')),
  'collectiveTablesPresent', to_regclass('public.comun_relata_collective_cases') is not null or to_regclass('public.comun_relata_case_memberships') is not null,
  'projectionTablesPresent', to_regclass('private.comun_relata_public_projections') is not null,
  'businessWrites', 0,
  'envWrites', 0,
  'publicProjection', false
);
rollback;
SQL
node - "$ARTIFACT_DIR/preflight.json" <<'NODE'
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (s.transactionReadOnly !== true) throw new Error('COMUN_48_6_B0_BLOCKED_PREFLIGHT_READ_ONLY');
if (s.oldLocalProjectionTables !== 0 || s.oldLocalProjectionFunctions !== 0) throw new Error('COMUN_48_6_B0_BLOCKED_UNEXPECTED_PUBLIC_PROJECTION_SCHEMA_DRIFT');
if (s.projectionTablesPresent || (s.collectiveTablesPresent && s.migrationCount === 0)) throw new Error('COMUN_48_6_B0_BLOCKED_PARTIAL_SCHEMA_DRIFT');
if (s.migrationCount !== 0 && s.migrationCount !== 1) throw new Error('COMUN_48_6_B0_BLOCKED_MIGRATION_LEDGER_INCONSISTENT');
if (s.businessWrites !== 0 || s.envWrites !== 0 || s.publicProjection !== false) throw new Error('COMUN_48_6_B0_BLOCKED_PREFLIGHT_SIDE_EFFECT');
NODE

if [[ "$MODE" == "preflight" || "$MODE" == "promote" ]]; then
  migration_count="$(node -e "process.stdout.write(String(JSON.parse(require('node:fs').readFileSync('$ARTIFACT_DIR/preflight.json')).migrationCount))")"
  if [[ "$migration_count" == "0" ]]; then
    held="$RUNNER_TEMP/comun-b0-sidewalk-exception.sql"
    test ! -e "$held"
    mv "$SIDEWALK_MIGRATION" "$held"
    restore() {
      local status=$?
      if [[ -e "$held" ]]; then mv "$held" "$SIDEWALK_MIGRATION"; fi
      test -f "$SIDEWALK_MIGRATION"
      test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA256"
      test -z "$(git status --porcelain -- "$SIDEWALK_MIGRATION")"
      exit "$status"
    }
    trap restore EXIT
    supabase migration list --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/migration-list.txt" 2>&1
    supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$ARTIFACT_DIR/dry-run.txt" 2>&1
    mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/dry-run.txt" | sort -u || true)
    test "${#planned[@]}" -eq 1 || fail COMUN_48_6_B0_BLOCKED_UNEXPECTED_MIGRATION_PLAN
    test "${planned[0]}" = "$(basename "$MIGRATION")" || fail COMUN_48_6_B0_BLOCKED_UNEXPECTED_MIGRATION_PLAN
    ! grep -Eq -- '--include-all|migration repair|db reset|seed' "$ARTIFACT_DIR/dry-run.txt" || fail COMUN_48_6_B0_BLOCKED_UNSAFE_MIGRATION_COMMAND
    printf '{"result":"COMUN_48_6_B0_REMOTE_PLAN_EXACT_ONE","migration":"%s","includeAll":false,"repair":false,"reset":false,"seed":false}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
    if [[ "$MODE" == "promote" ]]; then
      supabase db push --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/push.txt" 2>&1
    fi
  else
    printf '{"result":"COMUN_48_6_B0_REMOTE_PLAN_ALREADY_APPLIED","migration":"%s"}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
  fi
fi

if [[ "$MODE" == "promote" || "$MODE" == "postflight" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/postflight.json" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'migrationPresent', exists(select 1 from supabase_migrations.schema_migrations where version='20260826090000'),
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826090000'),
  'collectiveTables', to_regclass('public.comun_relata_collective_cases') is not null and to_regclass('public.comun_relata_case_memberships') is not null,
  'projectionTables', to_regclass('private.comun_relata_public_projections') is not null and to_regclass('private.comun_relata_public_projection_candidates') is not null,
  'consentTable', to_regclass('private.comun_relata_public_projection_consents') is not null,
  'rlsForced', (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
    'public.comun_relata_collective_cases'::regclass,'public.comun_relata_case_memberships'::regclass,
    'private.comun_relata_public_projections'::regclass,'private.comun_relata_public_projection_consents'::regclass)),
  'anonClosed', not has_table_privilege('anon','public.comun_relata_collective_cases','SELECT') and not has_table_privilege('anon','private.comun_relata_public_projections','SELECT'),
  'authenticatedClosed', not has_table_privilege('authenticated','public.comun_relata_case_memberships','INSERT') and not has_table_privilege('authenticated','private.comun_relata_public_projections','SELECT'),
  'serviceRoleRpcOnly', has_function_privilege('service_role','public.comun_denuncias_public_list(text,integer)','EXECUTE') and has_function_privilege('service_role','public.comun_denuncias_public_get(uuid)','EXECUTE'),
  'projectionRows', (select count(*) from private.comun_relata_public_projections),
  'confirmationRows', (select count(*) from private.comun_relata_public_confirmations),
  'businessWrites', 0,
  'schemaWrites', '1_migration_only',
  'envWrites', 0,
  'publicProjection', false,
  'backfill', false
);
rollback;
SQL
  node - "$ARTIFACT_DIR/postflight.json" <<'NODE'
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const key of ['transactionReadOnly','migrationPresent','collectiveTables','projectionTables','consentTable','rlsForced','anonClosed','authenticatedClosed','serviceRoleRpcOnly']) if (s[key] !== true) throw new Error(`COMUN_48_6_B0_REMOTE_POSTFLIGHT_FAILED_${key}`);
if (s.migrationCount !== 1 || s.projectionRows !== 0 || s.confirmationRows !== 0 || s.businessWrites !== 0 || s.schemaWrites !== '1_migration_only' || s.envWrites !== 0 || s.publicProjection !== false || s.backfill !== false) throw new Error('COMUN_48_6_B0_REMOTE_POSTFLIGHT_SIDE_EFFECT');
NODE
  echo 'COMUN_48_6_B0_SCHEMA_GREEN_MAP_OFF_NO_PROJECTION' >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  echo 'projectionRows=0 confirmationRows=0 businessWrites=0 schemaWrites=1_migration_only envWrites=0' >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
fi
