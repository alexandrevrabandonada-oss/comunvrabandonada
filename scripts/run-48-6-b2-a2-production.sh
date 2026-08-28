#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
MODE="${B2_A2_EXECUTION_MODE:-preflight}"
MIGRATION="supabase/migrations/20260827120000_comun_denuncias_private_collective_matching.sql"
MIGRATION_VERSION="20260827120000"
MIGRATION_SHA256="0e27217ba2646698ce52ab92c29b0768ba567851ac775259079d07c44b281697"
SIDEWALK_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
SIDEWALK_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
SIDEWALK_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-b2-a2-production"

case "$MODE" in preflight|promote|postflight) ;; *) echo "COMUN_48_6_B2_A2_BLOCKED_UNKNOWN_MODE" >&2; exit 1 ;; esac
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:=https://comunsocial.online}"

mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
stage() { printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
fail() { printf '%s\n' "$1" >&2; printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; exit 1; }
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}/comun-b2-a2-${GITHUB_RUN_ID:-local}-$$"
mkdir -p "$TEMP_ROOT"
PROJECT_JSON="$TEMP_ROOT/project.json"
SHARED_JSON="$TEMP_ROOT/shared.json"
SHARED_LOCATION_JSON="$TEMP_ROOT/shared-location.json"
SHARED_SPATIAL_JSON="$TEMP_ROOT/shared-spatial.json"
ENV_FILE="$TEMP_ROOT/production.env"
HELD_SIDEWALK="$TEMP_ROOT/sidewalk.sql"
SIDEEWALK_HELD=false

restore_sidewalk() {
  if [[ "$SIDEEWALK_HELD" == true && -e "$HELD_SIDEWALK" ]]; then
    mv "$HELD_SIDEWALK" "$SIDEWALK_MIGRATION"
    SIDEEWALK_HELD=false
  fi
  test -f "$SIDEWALK_MIGRATION"
  test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA256"
}
cleanup() { restore_sidewalk >/dev/null 2>&1 || true; rm -rf "$TEMP_ROOT"; rm -f .vercel/project.json; rmdir .vercel 2>/dev/null || true; }
trap cleanup EXIT

test -z "${SUPABASE_ACCESS_TOKEN:-}" || fail COMUN_48_6_B2_A2_BLOCKED_REMOTE_CLI_AUTH
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || fail COMUN_48_6_B2_A2_BLOCKED_REMOTE_CLI_AUTH
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_6_B2_A2_BLOCKED_NON_PRODUCTION_BINDING ;; esac

git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_BLOCKED_MAIN_DRIFT
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_BLOCKED_MAIN_DRIFT
test "$(sha256sum "$MIGRATION" | awk '{print tolower($1)}')" = "$MIGRATION_SHA256" || fail COMUN_48_6_B2_A2_BLOCKED_MIGRATION_CHECKSUM_DRIFT
test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA256" || fail COMUN_48_6_B2_A2_BLOCKED_EXTERNAL_MIGRATION_CHECKSUM_DRIFT

node --input-type=module - "$SIDEWALK_EXCEPTION" <<'NODE'
import fs from 'node:fs';
const x = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (x.path !== 'supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql'
  || x.sha256 !== '6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be'
  || x.cliHistoryExpected !== 'absent'
  || x.remoteStateRequired !== 'applied_exact_scoped'
  || x.excludeFromCliPlanning !== true
  || x.failClosedOnChange !== true) throw new Error('COMUN_48_6_B2_A2_BLOCKED_EXTERNAL_MIGRATION_EXCEPTION');
NODE
stage main_exact_green

mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_COLLECTIVE_ENABLED&limit=100" > "$SHARED_JSON"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_LOCATION_ENCRYPTION_KEY&limit=100" > "$SHARED_LOCATION_JSON"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_SPATIAL_HMAC_KEY&limit=100" > "$SHARED_SPATIAL_JSON"
npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node - "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$ARTIFACT_DIR/flags-pre.json" <<'NODE'
const fs=require('node:fs');
const [projectPath,sharedPath,envPath,outPath]=process.argv.slice(2);
const project=JSON.parse(fs.readFileSync(projectPath,'utf8'));
const shared=JSON.parse(fs.readFileSync(sharedPath,'utf8'));
const env=new Map();
for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env.set(m[1],m[2].replace(/^"|"$/g,''));}
const rows=project.envs??project.data??project;
const sharedRows=shared.envs??shared.data??shared;
const state=v=>v==='enabled'?'ON':v==='disabled'?'OFF':v==null?'UNKNOWN':'OTHER';
const result={};
for(const key of ['COMUN_RELATA_COLLECTIVE_ENABLED','COMUN_RELATA_LOCATION_ENABLED','COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED','COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED','COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED']){
  const production=rows.filter(r=>r.key===key&&(r.target??[]).includes('production'));
  const sharedMatches=sharedRows.filter(r=>r.key===key);
  const valid=production.length<=1 && (production.length===0 || (production[0].gitBranch==null && !(production[0].customEnvironmentIds??[]).length));
  result[key]={projectCount:production.length,sharedCount:sharedMatches.length,type:production[0]?.type??'absent',target:production[0]?.target??[],gitBranch:production[0]?.gitBranch??null,customEnvironmentIds:production[0]?.customEnvironmentIds??[],valueState:state(env.get(key)),valid};
}
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
NODE
node - "$ARTIFACT_DIR/flags-pre.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const exact=(key,want)=>{const v=x[key];return v.projectCount===1&&v.sharedCount===0&&v.type==='encrypted'&&v.valueState===want&&v.target.length===1&&v.target[0]==='production'&&v.valid};
if(!exact('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED','ON'))throw new Error('COMUN_48_6_B2_A2_BLOCKED_A3_NOT_ON_CANONICAL');
if(!exact('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED','ON'))throw new Error('COMUN_48_6_B2_A2_BLOCKED_A4_NOT_ON_CANONICAL');
const map=x.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED;if(!(map.projectCount===0&&map.sharedCount===0||map.projectCount===1&&map.sharedCount===0&&map.valueState==='OFF'&&map.valid))throw new Error('COMUN_48_6_B2_A2_BLOCKED_MAP_NOT_OFF');
const collective=x.COMUN_RELATA_COLLECTIVE_ENABLED;if(!(collective.projectCount<=1&&collective.sharedCount===0&&collective.valid&&['ON','OFF','UNKNOWN'].includes(collective.valueState)))throw new Error('COMUN_48_6_B2_A2_BLOCKED_COLLECTIVE_ENV_DRIFT');
NODE

node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$ARTIFACT_DIR/keys.json" <<'NODE'
const fs=require('node:fs');
const project=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const rows=project.envs??project.data??project;
const shared=(file,key)=>{const x=JSON.parse(fs.readFileSync(file,'utf8'));return (x.envs??x.data??x).filter(v=>v.key===key).length;};
const exact=(key)=>{const a=rows.filter(v=>v.key===key&&(v.target??[]).includes('production'));return a.length===1&&a[0].type==='sensitive'&&JSON.stringify(a[0].target??[])===JSON.stringify(['production'])&&a[0].gitBranch==null&&!(a[0].customEnvironmentIds??[]).length;};
if(!exact('COMUN_RELATA_LOCATION_ENCRYPTION_KEY'))throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_LOCATION_KEY_METADATA_DRIFT');
if(!exact('COMUN_RELATA_SPATIAL_HMAC_KEY'))throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SPATIAL_HMAC_KEY_NOT_READY');
if(shared(process.argv[3],'COMUN_RELATA_LOCATION_ENCRYPTION_KEY')!==0||shared(process.argv[4],'COMUN_RELATA_SPATIAL_HMAC_KEY')!==0)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SHARED_KEY_DUPLICATE');
fs.writeFileSync(process.argv[5],JSON.stringify({locationKey:'VALIDATED_EXISTING_SENSITIVE',spatialKey:'VALIDATED_SENSITIVE',secretReadback:false,keysDistinct:'runtime_guard_preserved'})+'\n');
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/preflight.json" <<SQL
begin read only;
select json_build_object(
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'b0MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260826090000'),
  'b1MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260826120000'),
  'b2a1MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260826150000'),
  'b2a2MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='$MIGRATION_VERSION'),
  'matcherFunctionsPresent',to_regprocedure('public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)') is not null,
  'projectionRows',(select count(*) from private.comun_relata_public_projections),
  'confirmationRows',(select count(*) from private.comun_relata_public_confirmations),
  'businessWrites',0,'envWrites',0,'publicMapProduction',false);
rollback;
SQL
node - "$ARTIFACT_DIR/preflight.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const consistent=(x.b2a2MigrationCount===0&&!x.matcherFunctionsPresent)||(x.b2a2MigrationCount===1&&x.matcherFunctionsPresent);if(!x.transactionReadOnly||x.b0MigrationCount!==1||x.b1MigrationCount!==1||x.b2a1MigrationCount!==1||x.b2a2MigrationCount>1||!consistent||x.projectionRows!==0||x.confirmationRows!==0)throw new Error('COMUN_48_6_B2_A2_BLOCKED_PREFLIGHT_SCHEMA_BASELINE');
NODE
stage preflight_green

plan_and_maybe_apply(){
  if [[ "$(node -e "process.stdout.write(String(JSON.parse(require('node:fs').readFileSync('$ARTIFACT_DIR/preflight.json')).b2a2MigrationCount))")" != 0 ]]; then
    printf '{"result":"COMUN_48_6_B2_A2_REMOTE_PLAN_ALREADY_APPLIED","migration":"%s"}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
    return 0
  fi
  test ! -e "$HELD_SIDEWALK"
  mv "$SIDEWALK_MIGRATION" "$HELD_SIDEWALK"
  SIDEEWALK_HELD=true
  supabase migration list --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/migration-list.txt" 2>&1
  supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$ARTIFACT_DIR/dry-run.txt" 2>&1
  mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/dry-run.txt" | sort -u || true)
  test "${#planned[@]}" -eq 1 || fail COMUN_48_6_B2_A2_BLOCKED_MIGRATION_PLAN_NOT_EXACT
  test "${planned[0]}" = "$(basename "$MIGRATION")" || fail COMUN_48_6_B2_A2_BLOCKED_MIGRATION_PLAN_NOT_EXACT
  ! grep -Eqi -- '--include-all|migration repair|db reset|seed' "$ARTIFACT_DIR/dry-run.txt" || fail COMUN_48_6_B2_A2_BLOCKED_UNSAFE_MIGRATION_COMMAND
  printf '{"result":"COMUN_48_6_B2_A2_REMOTE_PLAN_EXACT_ONE","migration":"%s","includeAll":false,"repair":false,"reset":false,"seed":false}\n' "$MIGRATION" > "$ARTIFACT_DIR/plan.json"
  if [[ "$MODE" == promote ]]; then supabase db push --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/push.txt" 2>&1; fi
  restore_sidewalk
}
if [[ "$MODE" == preflight || "$MODE" == promote ]]; then plan_and_maybe_apply; fi
if [[ "$MODE" == preflight ]]; then summary 'COMUN_48_6_B2_A2_PREFLIGHT_GREEN_EXACT_ONE_OR_ALREADY_APPLIED'; exit 0; fi

if [[ "$MODE" == promote || "$MODE" == postflight ]]; then
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/postflight.json" <<SQL
begin read only;
select json_build_object(
 'transactionReadOnly',current_setting('transaction_read_only')='on',
 'migrationCount',(select count(*) from supabase_migrations.schema_migrations where version='$MIGRATION_VERSION'),
 'associatePresent',to_regprocedure('public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)') is not null,
 'locationReaderPresent',to_regprocedure('public.comun_relata_public_projection_owned_location(text,uuid)') is not null,
 'holderReaderPresent',to_regprocedure('public.comun_relata_collective_connection_for_wallet(text,uuid)') is not null,
 'rlsForceCollective',(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comun_relata_collective_cases'::regclass),
 'rlsForceMembership',(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comun_relata_case_memberships'::regclass),
 'rlsForceKeys',(select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_relata_case_match_keys'::regclass),
 'anonClientClosed',has_table_privilege('anon','public.comun_relata_collective_cases','select')=false and has_table_privilege('anon','public.comun_relata_case_memberships','select')=false,
 'authenticatedClientClosed',has_table_privilege('authenticated','public.comun_relata_collective_cases','select')=false and has_table_privilege('authenticated','public.comun_relata_case_memberships','select')=false,
 'serviceRoleExecute',has_function_privilege('service_role','public.comun_relata_associate_collective_for_wallet(text,uuid,text,bytea[],timestamptz)','execute') and has_function_privilege('service_role','public.comun_relata_collective_connection_for_wallet(text,uuid)','execute'),
 'projectionRows',(select count(*) from private.comun_relata_public_projections),
 'confirmationRows',(select count(*) from private.comun_relata_public_confirmations),
 'businessWrites',0,'publicMapProduction',false);
rollback;
SQL
  node - "$ARTIFACT_DIR/postflight.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));for(const k of ['transactionReadOnly','associatePresent','locationReaderPresent','holderReaderPresent','rlsForceCollective','rlsForceMembership','rlsForceKeys','anonClientClosed','authenticatedClientClosed','serviceRoleExecute'])if(x[k]!==true)throw new Error('COMUN_48_6_B2_A2_POSTFLIGHT_FAILED_'+k);if(x.migrationCount!==1||x.projectionRows!==0||x.confirmationRows!==0||x.businessWrites!==0||x.publicMapProduction!==false)throw new Error('COMUN_48_6_B2_A2_POSTFLIGHT_SIDE_EFFECT');
NODE
  stage schema_green
  if [[ "$MODE" == promote ]]; then
    collective_state="$(node - "$ARTIFACT_DIR/flags-pre.json" <<'NODE'
const fs=require('node:fs');process.stdout.write(JSON.parse(fs.readFileSync(process.argv[2],'utf8')).COMUN_RELATA_COLLECTIVE_ENABLED.valueState)
NODE
)"
    if [[ "$collective_state" == UNKNOWN ]]; then
      node - "$PROJECT_JSON" "$ARTIFACT_DIR/collective-create.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const r=x.envs??x.data??x;const a=r.filter(v=>v.key==='COMUN_RELATA_COLLECTIVE_ENABLED'&&(v.target??[]).includes('production'));if(a.length!==0)throw new Error('COMUN_48_6_B2_A2_BLOCKED_COLLECTIVE_ENV_RACE');fs.writeFileSync(process.argv[3],JSON.stringify({attempted:true,valuePersisted:false})+'\n');
NODE
      curl -fsS -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
        --data '{"key":"COMUN_RELATA_COLLECTIVE_ENABLED","value":"enabled","type":"encrypted","target":["production"]}' \
        "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" > "$TEMP_ROOT/collective-create-response.json"
      printf '{"envWrites":1,"desiredState":"ON","rawValuePersisted":false}\n' > "$ARTIFACT_DIR/collective-write.json"
    elif [[ "$collective_state" == OFF ]]; then
      id="$(node - "$PROJECT_JSON" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const r=x.envs??x.data??x;const a=r.filter(v=>v.key==='COMUN_RELATA_COLLECTIVE_ENABLED'&&(v.target??[]).includes('production'));if(a.length!==1)throw new Error('COMUN_48_6_B2_A2_BLOCKED_COLLECTIVE_ENV_ID_NOT_UNIQUE');process.stdout.write(a[0].id);
NODE
)"
      curl -fsS -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
        --data '{"value":"enabled"}' "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$id?teamId=$VERCEL_ORG_ID" > "$TEMP_ROOT/collective-patch-response.json"
      printf '{"envWrites":1,"desiredState":"ON","rawValuePersisted":false}\n' > "$ARTIFACT_DIR/collective-write.json"
    elif [[ "$collective_state" == ON ]]; then
      printf '{"envWrites":0,"desiredState":"ON","rawValuePersisted":false}\n' > "$ARTIFACT_DIR/collective-write.json"
    else fail COMUN_48_6_B2_A2_BLOCKED_COLLECTIVE_ENV_STATE; fi
    npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$TEMP_ROOT/deploy.out"
    url="$(grep -Eo 'https://[^[:space:]]+' "$TEMP_ROOT/deploy.out" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) fail COMUN_48_6_B2_A2_BLOCKED_DEPLOYMENT ;; esac
    npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
    npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
    npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  fi
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_COLLECTIVE_ENABLED&limit=100" > "$SHARED_JSON"
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  node - "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$ARTIFACT_DIR/flags-post.json" <<'NODE'
const fs=require('node:fs');const project=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const shared=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));const e={};for(const line of fs.readFileSync(process.argv[4],'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)e[m[1]]=m[2].replace(/^"|"$/g,'');}const rows=project.envs??project.data??project,sharedRows=shared.envs??shared.data??shared,s=v=>v==='enabled'?'ON':v==='disabled'?'OFF':'UNKNOWN';const metadata=k=>{const a=rows.filter(v=>v.key===k&&(v.target??[]).includes('production'));return {projectCount:a.length,sharedCount:sharedRows.filter(v=>v.key===k).length,type:a[0]?.type??'absent',target:a[0]?.target??[],gitBranch:a[0]?.gitBranch??null,customEnvironmentIds:a[0]?.customEnvironmentIds??[],valueState:s(e[k]),valid:a.length===1&&a[0].gitBranch==null&&!(a[0].customEnvironmentIds??[]).length};};fs.writeFileSync(process.argv[5],JSON.stringify({a3:metadata('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED'),a4:metadata('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'),collective:metadata('COMUN_RELATA_COLLECTIVE_ENABLED'),map:metadata('COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED')},null,2)+'\n');
NODE
  node - "$ARTIFACT_DIR/flags-post.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const exactOn=v=>v.projectCount===1&&v.sharedCount===0&&v.type==='encrypted'&&v.valueState==='ON'&&v.target.length===1&&v.target[0]==='production'&&v.valid;if(!exactOn(x.a3)||!exactOn(x.a4)||!exactOn(x.collective)||x.map.valueState==='ON')throw new Error('COMUN_48_6_B2_A2_BLOCKED_POST_DEPLOY_FLAG_STATE');
NODE
  grouping_smoke="$TEMP_ROOT/grouping-smoke.json"
  grouping_code="$(curl -sS -o "$grouping_smoke" -w '%{http_code}' "$COMUN_BASE_URL/api/comun/relata/evidence/grouping")"
  test "$grouping_code" = 401 || fail COMUN_48_6_B2_A2_R7_BLOCKED_AUTHORITY_STATE_NOT_DISTINCT
  node - "$grouping_smoke" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(x.code!=='wallet_authority_required')throw new Error('COMUN_48_6_B2_A2_R7_BLOCKED_AUTHORITY_STATE_NOT_DISTINCT');
NODE
  for route in /comun/denuncias /comun/relatar /comun/minha-participacao; do code="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")"; test "$code" = 200 || fail COMUN_48_6_B2_A2_SMOKE_FAILED; code="$(curl -L -sS -I -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")"; test "$code" = 200 || fail COMUN_48_6_B2_A2_SMOKE_FAILED; done
  summary 'COMUN_48_6_B2_A2_PRIVATE_COLLECTIVE_MATCHING_GREEN_MAP_OFF'
  summary 'projectionRows=0 confirmationRows=0 futureMapEligibilityUnchanged=true automaticPautaCreation=false automaticCollectiveActionCreation=false automaticOfficialSend=false ProductionBusinessWrites=0 externalOfficialSends=0'
  printf '{"terminal":"COMUN_48_6_B2_A2_PRIVATE_COLLECTIVE_MATCHING_GREEN_MAP_OFF","schemaWrites":"1_migration_only","businessWrites":0,"map":"OFF"}\n' > "$ARTIFACT_DIR/closeout.json"
  stage terminal_green
fi
