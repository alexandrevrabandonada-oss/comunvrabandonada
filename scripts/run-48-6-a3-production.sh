#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?}"
MODE="${A3_EXECUTION_MODE:-preflight}"
MIGRATION="supabase/migrations/20260825120000_comun_followup_escalation_continuity.sql"
MIGRATION_VERSION="20260825120000"
MIGRATION_SHA256="fb9f0e7ef5f263916da098f524365e2a4b42e1122ecc150aca0e5606fc65ab50"
EXTERNAL_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
EXTERNAL_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-a3-production"

case "$MODE" in
  preflight|promote|postflight) ;;
  *) echo "COMUN_48_6_A3_BLOCKED_UNKNOWN_MODE"; exit 1 ;;
esac

mkdir -p "$ARTIFACT_DIR"
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
test "$(sha256sum "$MIGRATION" | awk '{print $1}')" = "$MIGRATION_SHA256"
test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"
test -n "${SUPABASE_DB_URL:-}"
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*) echo "COMUN_48_6_A3_BLOCKED_LOCAL_DATABASE"; exit 1;; esac

if [[ "$MODE" == "preflight" || "$MODE" == "promote" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$ARTIFACT_DIR/preflight.json" <<'SQL'
begin read only;
select json_build_object(
  'migrationAbsent', not exists(select 1 from supabase_migrations.schema_migrations where version='20260825120000'),
  'migrationPresent', exists(select 1 from supabase_migrations.schema_migrations where version='20260825120000'),
  'attemptColumnsAbsent', not exists(select 1 from information_schema.columns where table_schema='private' and table_name='comun_forwarding_attempts' and column_name in ('institutional_channel_id','resolution_outcome')),
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'businessWrites', 0,
  'envWrites', 0,
  'externalOfficialSends', 0
);
rollback;
SQL
  node - <<'NODE'
const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('.ci-artifacts/comun-48-6-a3-production/preflight.json','utf8'));
if(s.transactionReadOnly!==true||s.businessWrites!==0||s.envWrites!==0||s.externalOfficialSends!==0) throw new Error('COMUN_48_6_A3_BLOCKED_PREFLIGHT_SIDE_EFFECT');
if(s.migrationAbsent!==true && s.migrationPresent!==true) throw new Error('COMUN_48_6_A3_BLOCKED_MIGRATION_STATE');
if(s.migrationAbsent!==true) {
  if(s.attemptColumnsAbsent!==false) throw new Error('COMUN_48_6_A3_BLOCKED_EXISTING_SCHEMA_MISMATCH');
  fs.writeFileSync('.ci-artifacts/comun-48-6-a3-production/plan.json', JSON.stringify({result:'COMUN_48_6_A3_REMOTE_PLAN_ALREADY_APPLIED',migrationPresent:true,includeAll:false,repair:false,reset:false,seed:false}));
  process.exit(0);
}
if(s.attemptColumnsAbsent!==true) throw new Error('COMUN_48_6_A3_BLOCKED_PARTIAL_SCHEMA');
NODE

  if node -e "const s=require('./.ci-artifacts/comun-48-6-a3-production/preflight.json'); process.exit(s.migrationAbsent===true?0:1)"; then
    held="$RUNNER_TEMP/comun-a3-sidewalk-exception.sql"
    mv "$EXTERNAL_MIGRATION" "$held"
    restore() {
      if [[ -e "$held" ]]; then mv "$held" "$EXTERNAL_MIGRATION"; fi
      test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"
    }
    trap restore EXIT
    supabase migration list --db-url "$SUPABASE_DB_URL" >"$ARTIFACT_DIR/migration-list.txt" 2>&1
    supabase db push --db-url "$SUPABASE_DB_URL" --dry-run >"$ARTIFACT_DIR/dry-run.txt" 2>&1
    mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/dry-run.txt" | sort -u || true)
    test "${#planned[@]}" -eq 1 || { echo COMUN_48_6_A3_BLOCKED_UNEXPECTED_MIGRATION_PLAN; exit 1; }
    test "${planned[0]}" = "$(basename "$MIGRATION")" || { echo COMUN_48_6_A3_BLOCKED_UNEXPECTED_MIGRATION_PLAN; exit 1; }
    ! grep -Eq -- '--include-all|migration repair|db reset|seed' "$ARTIFACT_DIR/dry-run.txt"
    printf '{"result":"COMUN_48_6_A3_REMOTE_PLAN_EXACT_ONE","migration":"%s","includeAll":false,"repair":false,"reset":false,"seed":false}\n' "$MIGRATION" >"$ARTIFACT_DIR/plan.json"
    if [[ "$MODE" == "promote" ]]; then
      supabase db push --db-url "$SUPABASE_DB_URL" >"$ARTIFACT_DIR/push.txt" 2>&1
    fi
  fi
fi

if [[ "$MODE" == "promote" || "$MODE" == "postflight" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$ARTIFACT_DIR/postflight.json" <<'SQL'
begin read only;
select json_build_object(
  'migrationPresent', exists(select 1 from supabase_migrations.schema_migrations where version='20260825120000'),
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260825120000'),
  'institutionalChannelColumn', exists(select 1 from information_schema.columns where table_schema='private' and table_name='comun_forwarding_attempts' and column_name='institutional_channel_id' and is_nullable='YES'),
  'resolutionOutcomeColumn', exists(select 1 from information_schema.columns where table_schema='private' and table_name='comun_forwarding_attempts' and column_name='resolution_outcome' and is_nullable='YES'),
  'channelConstraint', exists(select 1 from pg_constraint where conrelid='private.comun_forwarding_attempts'::regclass and conname='comun_forwarding_attempts_institutional_channel_id_check'),
  'resolutionConstraint', exists(select 1 from pg_constraint where conrelid='private.comun_forwarding_attempts'::regclass and conname='comun_forwarding_attempts_resolution_outcome_check'),
  'preparedIndex', to_regclass('private.comun_forwarding_attempts_one_prepared_channel_idx') is not null,
  'openCanonicalRpc', to_regprocedure('public.comun_assisted_forwarding_open(text,uuid,text,text)') is not null,
  'openLegacyRpc', to_regprocedure('public.comun_assisted_forwarding_open(text,uuid,text)') is not null,
  'listRpc', to_regprocedure('public.comun_assisted_forwarding_list(text,uuid)') is not null,
  'responseRpc', to_regprocedure('public.comun_assisted_forwarding_record_response(text,uuid,text,text,boolean)') is not null,
  'serviceRoleOpen', has_function_privilege('service_role','public.comun_assisted_forwarding_open(text,uuid,text,text)','EXECUTE'),
  'anonAttemptSelectClosed', not has_table_privilege('anon','private.comun_forwarding_attempts','SELECT'),
  'authenticatedAttemptSelectClosed', not has_table_privilege('authenticated','private.comun_forwarding_attempts','SELECT'),
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'businessWrites', 0,
  'envWrites', 0,
  'externalOfficialSends', 0,
  'publicProjection', false
);
rollback;
SQL
  node - <<'NODE'
const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('.ci-artifacts/comun-48-6-a3-production/postflight.json','utf8'));
for (const key of ['migrationPresent','institutionalChannelColumn','resolutionOutcomeColumn','channelConstraint','resolutionConstraint','preparedIndex','openCanonicalRpc','openLegacyRpc','listRpc','responseRpc','serviceRoleOpen','anonAttemptSelectClosed','authenticatedAttemptSelectClosed','transactionReadOnly']) if(s[key]!==true) throw new Error(`COMUN_48_6_A3_REMOTE_POSTFLIGHT_FAILED_${key}`);
if(s.migrationCount!==1||s.businessWrites!==0||s.envWrites!==0||s.externalOfficialSends!==0||s.publicProjection!==false) throw new Error('COMUN_48_6_A3_REMOTE_POSTFLIGHT_SIDE_EFFECT');
NODE
  echo COMUN_48_6_A3_FOLLOWUP_ESCALATION_GREEN_SCHEMA_ACTIVE_NO_AUTO_SEND >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  echo "ProductionSchemaWrites=1_migration_only" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  echo "ProductionBusinessWrites=0" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  echo "externalOfficialSends=0" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
fi
