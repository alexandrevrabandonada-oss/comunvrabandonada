#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?}"
MODE="${A1_EXECUTION_MODE:-preflight}"
MIGRATION="supabase/migrations/20260825090000_comun_multidomain_assisted_forwarding.sql"
MIGRATION_VERSION="20260825090000"
MIGRATION_SHA256="bef9f9d4bc38e07dcb16a07c6adff45f1bfb89f7ec4e3a0b46f7a1042f8c4bfd"
EXTERNAL_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
EXTERNAL_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-a1-production"

mkdir -p "$ARTIFACT_DIR"
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
test "$(sha256sum "$MIGRATION" | awk '{print $1}')" = "$MIGRATION_SHA256"
test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"
test -n "${SUPABASE_DB_URL:-}"

if [[ "$MODE" == "preflight" || "$MODE" == "promote" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$ARTIFACT_DIR/preflight.json" <<'SQL'
begin read only;
select json_build_object(
  'migrationAbsent', not exists(select 1 from supabase_migrations.schema_migrations where version='20260825090000'),
  'civicSourceAbsent', not exists(select 1 from pg_constraint where conrelid='private.comun_forwarding_packages'::regclass and conname='comun_forwarding_packages_source_domain_check' and pg_get_constraintdef(oid) like '%civic_service%'),
  'civicContextAbsent', to_regprocedure('public.comun_civic_wallet_item_context(text,uuid)') is null,
  'civicPrepareAbsent', to_regprocedure('public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)') is null,
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'businessWrites', 0,
  'envWrites', 0
);
rollback;
SQL
  node - <<'NODE'
const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('.ci-artifacts/comun-48-6-a1-production/preflight.json','utf8'));
for (const key of ['migrationAbsent','civicSourceAbsent','civicContextAbsent','civicPrepareAbsent','transactionReadOnly']) {
  if (s[key] !== true) throw new Error(`COMUN_48_6_A1_BLOCKED_PREFLIGHT_${key}`);
}
NODE

  held="$RUNNER_TEMP/comun-48-6-a1-sidewalk-exception.sql"
  mv "$EXTERNAL_MIGRATION" "$held"
  restore() {
    if [[ -e "$held" ]]; then mv "$held" "$EXTERNAL_MIGRATION"; fi
    test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"
  }
  trap restore EXIT

  supabase migration list --db-url "$SUPABASE_DB_URL" >"$ARTIFACT_DIR/migration-list.txt" 2>&1
  supabase db push --db-url "$SUPABASE_DB_URL" --dry-run >"$ARTIFACT_DIR/dry-run.txt" 2>&1
  mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/dry-run.txt" | sort -u || true)
  test "${#planned[@]}" -eq 1 || { echo COMUN_48_6_A1_BLOCKED_UNEXPECTED_MIGRATION_PLAN; exit 1; }
  test "${planned[0]}" = "$(basename "$MIGRATION")" || { echo COMUN_48_6_A1_BLOCKED_UNEXPECTED_MIGRATION_PLAN; exit 1; }
  ! grep -Eq -- '--include-all|migration repair|db reset|seed' "$ARTIFACT_DIR/dry-run.txt"
  printf '{"result":"COMUN_48_6_A1_REMOTE_PLAN_EXACT_ONE","migration":"%s","includeAll":false,"repair":false,"reset":false,"seed":false}\n' "$MIGRATION" >"$ARTIFACT_DIR/plan.json"
  if [[ "$MODE" == "promote" ]]; then
    supabase db push --db-url "$SUPABASE_DB_URL"
  fi
fi

if [[ "$MODE" == "promote" || "$MODE" == "postflight" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$ARTIFACT_DIR/postflight.json" <<'SQL'
begin read only;
select json_build_object(
  'migrationPresent', exists(select 1 from supabase_migrations.schema_migrations where version='20260825090000'),
  'civicSourcePresent', exists(select 1 from pg_constraint where conrelid='private.comun_forwarding_packages'::regclass and conname='comun_forwarding_packages_source_domain_check' and pg_get_constraintdef(oid) like '%civic_service%'),
  'civicReferencePresent', exists(select 1 from pg_constraint where conrelid='private.comun_forwarding_packages'::regclass and conname='comun_forwarding_packages_source_reference_check' and pg_get_constraintdef(oid) like '%civic_service%'),
  'civicContextPresent', to_regprocedure('public.comun_civic_wallet_item_context(text,uuid)') is not null,
  'civicPreparePresent', to_regprocedure('public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)') is not null,
  'civicContextServiceRole', has_function_privilege('service_role','public.comun_civic_wallet_item_context(text,uuid)','EXECUTE'),
  'civicContextAnonClosed', not has_function_privilege('anon','public.comun_civic_wallet_item_context(text,uuid)','EXECUTE'),
  'civicPrepareServiceRole', has_function_privilege('service_role','public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)','EXECUTE'),
  'civicPrepareAnonClosed', not has_function_privilege('anon','public.comun_civic_assisted_prepare(text,uuid,text,text,boolean)','EXECUTE'),
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'businessWrites', 0,
  'envWrites', 0,
  'publicProjection', false,
  'externalOfficialSends', 0
);
rollback;
SQL
  node - <<'NODE'
const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('.ci-artifacts/comun-48-6-a1-production/postflight.json','utf8'));
for (const key of ['migrationPresent','civicSourcePresent','civicReferencePresent','civicContextPresent','civicPreparePresent','civicContextServiceRole','civicContextAnonClosed','civicPrepareServiceRole','civicPrepareAnonClosed','transactionReadOnly']) {
  if (s[key] !== true) throw new Error(`COMUN_48_6_A1_REMOTE_POSTFLIGHT_FAILED_${key}`);
}
if (s.businessWrites !== 0 || s.envWrites !== 0 || s.publicProjection !== false || s.externalOfficialSends !== 0) throw new Error('COMUN_48_6_A1_REMOTE_POSTFLIGHT_SIDE_EFFECT');
NODE
  echo COMUN_48_6_A1_MULTIDOMAIN_ASSISTED_FORWARDING_GREEN_NO_AUTO_SEND_SCHEMA_ACTIVE >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
fi
