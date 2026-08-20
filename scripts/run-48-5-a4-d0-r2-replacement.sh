#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
test -z "${SUPABASE_DB_URL:-}"
test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

A4_KEY="COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED"
ARTIFACT_DIR=.ci-artifacts/48-5-a4-r2-d0-r2
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
trap 'rm -rf "$TEMP_ROOT/a4-d0-r2-"*' EXIT
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
api() { curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "$1"; }
project_envs() { api "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$1"; }
shared_envs() { api "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=$A4_KEY&limit=100" > "$1"; }
deployments() { api "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&limit=100" > "$1"; }

fail_marker() {
  summary "$1"
  summary flagA3=ON
  summary migrationA4=pending
  summary businessWrites=0
}

deploy_prod() {
  local output="$1"; shift
  npx --yes vercel@50.28.0 deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" "$@" > "$output"
  local url
  url="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$output" | tail -n1 | tr -d '\r')"
  case "$url" in https://*.vercel.app) ;; *) echo A4_D0_R2_DEPLOYMENT_URL_INVALID >&2; return 1;; esac
  npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=8m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  printf '%s' "$url"
}

smoke_routes() {
  for route in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir; do
    test "$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$route")" = 200
    test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "https://comunsocial.online$route")" = 200
  done
}

test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"

ACTIVE="$TEMP_ROOT/a4-d0-r2-active.json"
curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/alexandrevrabandonada-oss/comunvrabandonada/actions/runs?status=in_progress&per_page=100" > "$ACTIVE"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" node - "$ACTIVE" <<'NODE'
const fs=require('node:fs');
const own=Number(process.env.GITHUB_RUN_ID||0);
const runs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).workflow_runs||[];
if (runs.some((run)=>run.id!==own && (/48\.5-A4-R2/.test(run.name||'') || /(production|deploy|rollout|activation)/i.test(run.name||'')))) {
  throw new Error('A4_D0_R2_CONCURRENT_PRODUCTION_OPERATION');
}
NODE

# Wait only for the Git/Vercel deployment of this exact main to settle before starting the isolated operation.
READY_FILE="$TEMP_ROOT/a4-d0-r2-ready.json"
ready=0
for _ in $(seq 1 40); do
  deployments "$READY_FILE"
  if EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$READY_FILE" <<'NODE'
const fs=require('node:fs');
const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).deployments||[];
const sha=process.env.EXPECTED_MAIN_SHA;
const active=all.some((d)=>['BUILDING','QUEUED','INITIALIZING'].includes(d?.readyState||d?.state));
const exact=all.some((d)=>(d?.readyState||d?.state)==='READY' && d?.meta?.githubCommitSha===sha);
process.exit(!active && exact ? 0 : 1);
NODE
  then ready=1; break; fi
  sleep 15
done
if [ "$ready" -ne 1 ]; then fail_marker COMUN_48_5_A4_R2_REPLACEMENT_BLOCKED_PRODUCTION_NOT_SETTLED; exit 1; fi

PROJECT="$TEMP_ROOT/a4-d0-r2-project.json"
SHARED="$TEMP_ROOT/a4-d0-r2-shared.json"
ENVFILE="$TEMP_ROOT/a4-d0-r2.env"
TEAM="$TEMP_ROOT/a4-d0-r2-team.json"
project_envs "$PROJECT"
shared_envs "$SHARED"
api "https://api.vercel.com/v2/teams/$VERCEL_ORG_ID" > "$TEAM"
mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$ARTIFACT_DIR/a4-replace-pre.json" <<'NODE'
import fs from 'node:fs';
import {assertRepairPreconditions,fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [p,s,e,t,out]=process.argv.slice(2);
const input={project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))};
const result=assertRepairPreconditions(input);
const row=input.project.envs.find((x)=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'&&x?.target?.length===1&&x.target[0]==='production');
fs.writeFileSync(out,JSON.stringify({phase:'a4_replace_pre',oldEnvIdFingerprint:fingerprint(row.id),oldType:'sensitive',oldState:'OPAQUE',target:'production',a3:result.a3.valueState,migrationA4:'pending',rawValuePersisted:false},null,2)+'\n');
NODE
OLD_ID="$(node -e 'const x=require(process.argv[1]);const r=x.envs.find(y=>y.key==="COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED"&&y.target?.length===1&&y.target[0]==="production");if(!r?.id)process.exit(1);process.stdout.write(r.id)' "$PROJECT")"

# Barrier 1: promote a deployment whose build AND runtime are explicitly A4=disabled.
# Vercel CLI --build-env controls build-time and --env controls runtime for this deployment only.
CONTAINMENT_OUT="$TEMP_ROOT/a4-d0-r2-containment-deploy.txt"
if ! CONTAINMENT_URL="$(deploy_prod "$CONTAINMENT_OUT" --build-env "$A4_KEY=disabled" --env "$A4_KEY=disabled" --meta a4ReplacementPhase=containment --meta a4ReplacementRun="${GITHUB_RUN_ID:-unknown}")"; then
  fail_marker COMUN_48_5_A4_R2_REPLACEMENT_BLOCKED_BEFORE_DELETE
  exit 1
fi
printf '%s\n' "$CONTAINMENT_URL" > "$ARTIFACT_DIR/containment-production-deployment-url.txt"
smoke_routes
node - "$ARTIFACT_DIR/a4-containment-receipt.json" <<'NODE'
const fs=require('node:fs');
fs.writeFileSync(process.argv[2],JSON.stringify({phase:'containment',a4BuildOverride:'OFF',a4RuntimeOverride:'OFF',productionPromoted:true,businessWrites:0},null,2)+'\n');
NODE

# Only after the OFF containment deployment is live may the opaque project-level env be removed.
DELETE_BODY="$TEMP_ROOT/a4-d0-r2-delete-body.json"
DELETE_HEADERS="$TEMP_ROOT/a4-d0-r2-delete-headers.txt"
DELETE_STATUS="$TEMP_ROOT/a4-d0-r2-delete-status.txt"
curl -sS -D "$DELETE_HEADERS" -o "$DELETE_BODY" -w '%{http_code}' -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$OLD_ID?teamId=$VERCEL_ORG_ID" > "$DELETE_STATUS"
if ! node --input-type=module - "$DELETE_STATUS" "$DELETE_BODY" "$DELETE_HEADERS" "$ARTIFACT_DIR/a4-replace-delete-receipt.json" <<'NODE'
import fs from 'node:fs';
import {sanitizePatchResult} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
let payload={}; try{payload=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))}catch{}
const r=sanitizePatchResult({status:fs.readFileSync(process.argv[2],'utf8').trim(),payload,headers:fs.readFileSync(process.argv[4],'utf8')});
fs.writeFileSync(process.argv[5],JSON.stringify(r,null,2)+'\n');
if(!r.successful) process.exit(1);
NODE
then
  fail_marker COMUN_48_5_A4_R2_REPLACEMENT_DELETE_BLOCKED_RUNTIME_CONTAINED_OFF
  exit 1
fi

project_envs "$PROJECT"; shared_envs "$SHARED"
node - "$PROJECT" "$SHARED" "$ARTIFACT_DIR/a4-replace-absent.json" <<'NODE'
const fs=require('node:fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).envs||[];
const s=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).envs||[];
const key='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED';
const rows=p.filter(x=>x?.key===key&&x?.target?.includes('production'));
const shared=s.filter(x=>x?.key===key);
if(rows.length||shared.length) throw new Error('A4_D0_R2_ABSENT_PROOF_FAILED');
fs.writeFileSync(process.argv[4],JSON.stringify({projectProductionMatches:0,sharedMatches:0,runtimeContainment:'OFF'},null,2)+'\n');
NODE

# Create exactly one canonical encrypted OFF variable. If this fails, Production remains on the OFF containment deployment.
CREATE_BODY="$TEMP_ROOT/a4-d0-r2-create-body.json"
CREATE_RESPONSE="$TEMP_ROOT/a4-d0-r2-create-response.json"
CREATE_HEADERS="$TEMP_ROOT/a4-d0-r2-create-headers.txt"
CREATE_STATUS="$TEMP_ROOT/a4-d0-r2-create-status.txt"
node --input-type=module - "$CREATE_BODY" <<'NODE'
import fs from 'node:fs';
import {replacementCreatePayload} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
fs.writeFileSync(process.argv[2],JSON.stringify(replacementCreatePayload()));
NODE
curl -sS -D "$CREATE_HEADERS" -o "$CREATE_RESPONSE" -w '%{http_code}' -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' --data-binary "@$CREATE_BODY" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" > "$CREATE_STATUS"
node --input-type=module - "$CREATE_STATUS" "$CREATE_RESPONSE" "$CREATE_HEADERS" "$ARTIFACT_DIR/a4-replace-create-receipt.json" <<'NODE'
import fs from 'node:fs';
import {sanitizePatchResult} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
let payload={}; try{payload=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))}catch{}
const r=sanitizePatchResult({status:fs.readFileSync(process.argv[2],'utf8').trim(),payload,headers:fs.readFileSync(process.argv[4],'utf8')});
fs.writeFileSync(process.argv[5],JSON.stringify(r,null,2)+'\n');
NODE
project_envs "$PROJECT"; shared_envs "$SHARED"
if ! CREATE_STATUS="$CREATE_STATUS" node - "$PROJECT" "$SHARED" <<'NODE'
const fs=require('node:fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).envs||[];
const s=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).envs||[];
const key='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED';
const status=Number(fs.readFileSync(process.env.CREATE_STATUS,'utf8').trim());
const rows=p.filter(x=>x?.key===key&&x?.target?.length===1&&x.target[0]==='production');
if(status<200||status>=300||rows.length!==1||rows[0]?.type!=='encrypted'||s.some(x=>x?.key===key)) process.exit(1);
NODE
then
  fail_marker COMUN_48_5_A4_R2_FLAG_REPLACEMENT_CREATE_BLOCKED_RUNTIME_CONTAINED_OFF_ENV_ABSENT
  exit 1
fi

npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
if ! node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$OLD_ID" "$ARTIFACT_DIR/a4-replace-post-create.json" <<'NODE'
import fs from 'node:fs';
import {inspect,fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [p,s,e,t,old,out]=process.argv.slice(2);
const view=inspect({project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))});
const row=view.a4.projectMatches[0];
if(view.a4.projectMatches.length!==1||view.a4.sharedMatches!==0||row?.type!=='encrypted'||view.a4.valueState!=='OFF'||view.a3.valueState!=='ON') process.exit(1);
if(row.id===fingerprint(old)) process.exit(1);
fs.writeFileSync(out,JSON.stringify({...view,newEnvId:row.id,oldEnvId:fingerprint(old),oldAndNewDistinct:true,runtimeContainment:'OFF'},null,2)+'\n');
NODE
then
  fail_marker COMUN_48_5_A4_R2_FLAG_REPLACEMENT_POSTCREATE_BLOCKED_RUNTIME_CONTAINED_OFF
  exit 1
fi

# Barrier 2: materialize the canonical project-level encrypted OFF value without deployment overrides.
FINAL_OUT="$TEMP_ROOT/a4-d0-r2-final-deploy.txt"
if ! FINAL_URL="$(deploy_prod "$FINAL_OUT" --meta a4ReplacementPhase=canonical --meta a4ReplacementRun="${GITHUB_RUN_ID:-unknown}")"; then
  fail_marker COMUN_48_5_A4_R2_FLAG_REPLACED_PROJECT_OFF_FINAL_DEPLOY_BLOCKED_RUNTIME_CONTAINED_OFF
  exit 1
fi
printf '%s\n' "$FINAL_URL" > "$ARTIFACT_DIR/production-deployment-url.txt"

project_envs "$PROJECT"; shared_envs "$SHARED"
npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$ARTIFACT_DIR/a4-replace-post-deploy.json" <<'NODE'
import fs from 'node:fs';
import {inspect} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [p,s,e,t,out]=process.argv.slice(2);
const view=inspect({project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))});
if(view.a4.projectMatches.length!==1||view.a4.projectMatches[0]?.type!=='encrypted'||view.a4.valueState!=='OFF'||view.a4.sharedMatches!==0||view.a3.valueState!=='ON') throw new Error('A4_D0_R2_POSTDEPLOY_PROOF_FAILED');
fs.writeFileSync(out,JSON.stringify({...view,canonicalDeployment:true},null,2)+'\n');
NODE
smoke_routes

summary COMUN_48_5_A4_R2_FLAG_REPLACED_ENCRYPTED_EXPLICIT_OFF_READY_FOR_WAVE0
summary flagA4=OFF
summary flagA4Type=encrypted
summary flagA4Unique=true
summary flagA3=ON
summary migrationA4=pending
summary businessWrites=0
summary productionHealthy=true
