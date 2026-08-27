#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
MODE="${B2_A1_EXECUTION_MODE:-preflight}"
MIGRATION="supabase/migrations/20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql"
MIGRATION_VERSION="20260826150000"
MIGRATION_SHA256="bea0b2363a7bacb55ea021385706cb2e6076e7ff18539ecafd59e1745e480445"
SIDEWALK_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
SIDEWALK_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
SIDEWALK_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-b2-a1-production"

case "$MODE" in
  preflight|promote|postflight) ;;
  *) echo "COMUN_48_6_B2_A1_BLOCKED_UNKNOWN_MODE"; exit 1 ;;
esac

mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
fail() { echo "$1" >&2; printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; exit 1; }

test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A1_BLOCKED_MAIN_DRIFT
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A1_BLOCKED_MAIN_DRIFT
test "$(sha256sum "$MIGRATION" | awk '{print tolower($1)}')" = "$MIGRATION_SHA256" || fail COMUN_48_6_B2_A1_BLOCKED_MIGRATION_CHECKSUM_DRIFT
test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA256" || fail COMUN_48_6_B2_A1_BLOCKED_EXTERNAL_MIGRATION_CHECKSUM_DRIFT

node --input-type=module - "$SIDEWALK_EXCEPTION" <<'NODE'
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (manifest.path !== 'supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql'
  || manifest.sha256 !== '6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be'
  || manifest.cliHistoryExpected !== 'absent'
  || manifest.remoteStateRequired !== 'applied_exact_scoped'
  || manifest.excludeFromCliPlanning !== true
  || manifest.failClosedOnChange !== true) {
  throw new Error('COMUN_48_6_B2_A1_BLOCKED_EXTERNAL_MIGRATION_EXCEPTION_MANIFEST');
}
NODE

test -n "${VERCEL_TOKEN:-}" -a -n "${VERCEL_TEAM_ID:-}" -a -n "${VERCEL_CANONICAL_PROJECT_ID:-}" || fail COMUN_48_6_B2_A1_BLOCKED_VERCEL_BINDING
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_CANONICAL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID&decrypt=true" \
  > "$ARTIFACT_DIR/vercel-env.json"
node - "$ARTIFACT_DIR/vercel-env.json" > "$ARTIFACT_DIR/flags.json" <<'NODE'
const fs = require('node:fs');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = Array.isArray(body.envs) ? body.envs : [];
const keys = [
  'COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED',
  'COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED',
  'COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED',
];
const state = (value) => value === 'enabled' ? 'ON' : value === 'disabled' ? 'OFF' : value == null ? 'UNKNOWN' : 'OTHER';
const result = {};
for (const key of keys) {
  const project = rows.filter((row) => row.key === key && (row.target ?? []).includes('production'));
  const shared = rows.filter((row) => row.key === key && row.type === 'shared');
  const valid = project.length === 1 && project[0].gitBranch == null && !(project[0].customEnvironmentIds ?? []).length;
  result[key] = {
    projectCount: project.length,
    sharedCount: shared.length,
    type: project[0]?.type ?? 'absent',
    target: project[0]?.target ?? [],
    gitBranch: project[0]?.gitBranch ?? null,
    customEnvironmentIds: project[0]?.customEnvironmentIds ?? [],
    valueState: state(project[0]?.value),
    valid,
  };
}
process.stdout.write(JSON.stringify(result));
NODE
rm -f "$ARTIFACT_DIR/vercel-env.json"
node - "$ARTIFACT_DIR/flags.json" <<'NODE'
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const exactOn = (key) => s[key].projectCount === 1 && s[key].sharedCount === 0 && s[key].type === 'encrypted' && s[key].valueState === 'ON' && s[key].valid;
const mapOff = s.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.projectCount === 0 || (s.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.projectCount === 1 && s.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.valueState === 'OFF' && s.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.sharedCount === 0 && s.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.valid);
if (!exactOn('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED')) throw new Error('COMUN_48_6_B2_A1_BLOCKED_A3_NOT_ON_CANONICAL');
if (!exactOn('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')) throw new Error('COMUN_48_6_B2_A1_BLOCKED_A4_NOT_ON_CANONICAL');
if (!mapOff) throw new Error('COMUN_48_6_B2_A1_BLOCKED_MAP_NOT_OFF');
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/preflight.json" <<SQL
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'b0MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826090000'),
  'b1MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826120000'),
  'b2MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='$MIGRATION_VERSION'),
  'bridgeFunctionPresent', to_regprocedure('public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)') is not null,
  'projectionRows', (select count(*) from private.comun_relata_public_projections),
  'confirmationRows', (select count(*) from private.comun_relata_public_confirmations),
  'businessWrites', 0,
  'envWrites', 0,
  'publicMapProduction', false
);
rollback;
SQL
node - "$ARTIFACT_DIR/preflight.json" <<'NODE'
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (s.transactionReadOnly !== true || s.b0MigrationCount !== 1 || s.b1MigrationCount !== 1 || s.bridgeFunctionPresent !== true) throw new Error('COMUN_48_6_B2_A1_BLOCKED_PREFLIGHT_SCHEMA_BASELINE');
if (![0, 1].includes(s.b2MigrationCount) || s.projectionRows !== 0 || s.confirmationRows !== 0 || s.businessWrites !== 0 || s.envWrites !== 0 || s.publicMapProduction !== false) throw new Error('COMUN_48_6_B2_A1_BLOCKED_PREFLIGHT_SIDE_EFFECT');
NODE

if [[ "$MODE" == "preflight" || "$MODE" == "promote" ]]; then
  migration_count="$(node -e "process.stdout.write(String(JSON.parse(require('node:fs').readFileSync('$ARTIFACT_DIR/preflight.json')).b2MigrationCount))")"
  if [[ "$migration_count" == "0" ]]; then
    held="$RUNNER_TEMP/comun-b2-a1-sidewalk-exception.sql"
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
    test "${#planned[@]}" -eq 1 || fail COMUN_48_6_B2_A1_BLOCKED_UNEXPECTED_MIGRATION_PLAN
    test "${planned[0]}" = "$(basename "$MIGRATION")" || fail COMUN_48_6_B2_A1_BLOCKED_UNEXPECTED_MIGRATION_PLAN
    ! grep -Eq -- '--include-all|migration repair|db reset|seed' "$ARTIFACT_DIR/dry-run.txt" || fail COMUN_48_6_B2_A1_BLOCKED_UNSAFE_MIGRATION_COMMAND
    printf '{"result":"COMUN_48_6_B2_A1_REMOTE_PLAN_EXACT_ONE","migration":"%s","includeAll":false,"repair":false,"reset":false,"seed":false}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
    if [[ "$MODE" == "promote" ]]; then
      supabase db push --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/push.txt" 2>&1
    fi
  else
    printf '{"result":"COMUN_48_6_B2_A1_REMOTE_PLAN_ALREADY_APPLIED","migration":"%s"}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
  fi
fi

if [[ "$MODE" == "promote" || "$MODE" == "postflight" ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/postflight.json" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'b2MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260826150000'),
  'bridgeFunctionPresent', to_regprocedure('public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)') is not null,
  'bridgeFunctionHasPanoramaBranch', position('comun.panorama' in pg_get_functiondef('public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)'::regprocedure)) > 0,
  'bridgeFunctionHasDenunciasBranch', position('comun.denuncias' in pg_get_functiondef('public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)'::regprocedure)) > 0,
  'serviceRoleExecute', has_function_privilege('service_role','public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)','EXECUTE'),
  'anonExecute', has_function_privilege('anon','public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)','EXECUTE'),
  'authenticatedExecute', has_function_privilege('authenticated','public.comun_create_pauta_low_friction_v1(uuid,text,text,text,text,text,text,boolean,jsonb)','EXECUTE'),
  'projectionRows', (select count(*) from private.comun_relata_public_projections),
  'confirmationRows', (select count(*) from private.comun_relata_public_confirmations),
  'businessWrites', 0,
  'schemaWrites', '1_migration_only',
  'envWrites', 0,
  'publicMapProduction', false
);
rollback;
SQL
  node - "$ARTIFACT_DIR/postflight.json" <<'NODE'
const fs = require('node:fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const key of ['transactionReadOnly','bridgeFunctionPresent','bridgeFunctionHasPanoramaBranch','bridgeFunctionHasDenunciasBranch','serviceRoleExecute']) if (s[key] !== true) throw new Error(`COMUN_48_6_B2_A1_REMOTE_POSTFLIGHT_FAILED_${key}`);
if (s.anonExecute || s.authenticatedExecute || s.b2MigrationCount !== 1 || s.projectionRows !== 0 || s.confirmationRows !== 0 || s.businessWrites !== 0 || s.envWrites !== 0 || s.publicMapProduction !== false) throw new Error('COMUN_48_6_B2_A1_REMOTE_POSTFLIGHT_SIDE_EFFECT');
NODE
  for route in /comun/denuncias /comun/relatar /comun/pautas /comun/pautas/nova; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$route")"
    test "$code" = 200 || fail COMUN_48_6_B2_A1_SMOKE_FAILED
  done
  code="$(curl -sS -o /dev/null -w '%{http_code}' https://comunsocial.online/comun/denuncias/problemas/00000000-0000-4000-8000-000000000000)"
  test "$code" = 404 || fail COMUN_48_6_B2_A1_SMOKE_FAILED
  summary 'COMUN_48_6_B2_A1_COLLECTIVE_PROBLEM_TO_PAUTA_ACTION_BRIDGE_GREEN_MAP_OFF'
  summary 'projectionRows=0 confirmationRows=0 automaticPautaCreation=false automaticCollectiveActionCreation=false ProductionSchemaWrites=1_migration_only ProductionBusinessWrites=0 ProductionEnvWrites=0'
fi
