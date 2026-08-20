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

ARTIFACT_DIR=.ci-artifacts/48-5-a4-r2-d0-r2
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
trap 'rm -rf "$TEMP_ROOT/a4-d0-r2-"*' EXIT
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
api() { curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "$1"; }
project_envs() { api "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$1"; }
shared_envs() { api "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$1"; }
deployments() { api "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&limit=100" > "$1"; }

test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"

ACTIVE="$TEMP_ROOT/a4-d0-r2-active.json"
curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/alexandrevrabandonada-oss/comunvrabandonada/actions/runs?status=in_progress&per_page=100" > "$ACTIVE"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" node - "$ACTIVE" <<'NODE'
const fs=require('node:fs'); const own=Number(process.env.GITHUB_RUN_ID||0); const runs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).workflow_runs||[];
if (runs.some((run)=>run.id!==own && (/48\.5-A4-R2/.test(run.name||'') || /(production|deploy|rollout|activation)/i.test(run.name||'')))) throw new Error('A4_D0_R2_CONCURRENT_PRODUCTION_OPERATION');
NODE

T0_DEPLOYS="$TEMP_ROOT/a4-d0-r2-t0-deployments.json"
deployments "$T0_DEPLOYS"
T0_MS="$(date +%s%3N)"
EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" T0_MS="$T0_MS" node - "$T0_DEPLOYS" "$ARTIFACT_DIR/a4-replace-t0.json" <<'NODE'
const fs=require('node:fs'); const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).deployments||[]; const sha=process.env.EXPECTED_MAIN_SHA;
if (all.some((d)=>['BUILDING','QUEUED','INITIALIZING'].includes(d?.readyState||d?.state))) throw new Error('A4_D0_R2_PRODUCTION_DEPLOYMENT_ACTIVE');
const current=all.find((d)=>(d?.readyState||d?.state)==='READY' && d?.meta?.githubCommitSha===sha);
if (!current) throw new Error('A4_D0_R2_PRODUCTION_NOT_READY_FOR_MAIN');
const fp=(v)=>v?`sha256:${require('node:crypto').createHash('sha256').update(v).digest('hex').slice(0,16)}`:null;
fs.writeFileSync(process.argv[3], JSON.stringify({phase:'a4_replace_pre',runId:process.env.GITHUB_RUN_ID||null,mainSha:sha,t0:Number(process.env.T0_MS),productionDeploymentFingerprint:fp(current.id),productionCreatedAt:current.createdAt??null},null,2)+'\n');
NODE

PROJECT="$TEMP_ROOT/a4-d0-r2-project.json"; SHARED="$TEMP_ROOT/a4-d0-r2-shared.json"; ENVFILE="$TEMP_ROOT/a4-d0-r2.env"; TEAM="$TEMP_ROOT/a4-d0-r2-team.json"
project_envs "$PROJECT"; shared_envs "$SHARED"; api "https://api.vercel.com/v2/teams/$VERCEL_ORG_ID" > "$TEAM"
mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$ARTIFACT_DIR/a4-replace-pre.json" <<'NODE'
import fs from 'node:fs'; import {assertRepairPreconditions,fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [p,s,e,t,out]=process.argv.slice(2); const input={project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))}; const result=assertRepairPreconditions(input); const row=input.project.envs.find((x)=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'&&x?.target?.length===1&&x.target[0]==='production');
fs.writeFileSync(out,JSON.stringify({phase:'a4_replace_pre',oldEnvIdFingerprint:fingerprint(row.id),oldType:'sensitive',oldState:'OPAQUE',target:'production',a3:result.a3.valueState,migrationA4:'pending',rawValuePersisted:false},null,2)+'\n');
NODE
OLD_ID="$(node -e 'const x=require(process.argv[1]);const r=x.envs.find(y=>y.key==="COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED"&&y.target?.length===1&&y.target[0]==="production");if(!r?.id)process.exit(1);process.stdout.write(r.id)' "$PROJECT")"

DELETE_BODY="$TEMP_ROOT/a4-d0-r2-delete-body.json"; DELETE_HEADERS="$TEMP_ROOT/a4-d0-r2-delete-headers.txt"; DELETE_STATUS="$TEMP_ROOT/a4-d0-r2-delete-status.txt"
curl -sS -D "$DELETE_HEADERS" -o "$DELETE_BODY" -w '%{http_code}' -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$OLD_ID?teamId=$VERCEL_ORG_ID" > "$DELETE_STATUS"
node --input-type=module - "$DELETE_STATUS" "$DELETE_BODY" "$DELETE_HEADERS" "$ARTIFACT_DIR/a4-replace-delete-receipt.json" <<'NODE'
import fs from 'node:fs'; import {sanitizePatchResult} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs'; let payload={};try{payload=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))}catch{} const r=sanitizePatchResult({status:fs.readFileSync(process.argv[2],'utf8').trim(),payload,headers:fs.readFileSync(process.argv[4],'utf8')});fs.writeFileSync(process.argv[5],JSON.stringify(r,null,2)+'\n');if(!r.successful)throw new Error(`A4_D0_R2_DELETE_FAILED_HTTP_${r.httpStatus}`);
NODE
project_envs "$PROJECT"; shared_envs "$SHARED"
node - "$PROJECT" "$SHARED" "$ARTIFACT_DIR/a4-replace-absent.json" <<'NODE'
const fs=require('node:fs');const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).envs||[];const s=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).envs||[];const key='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED';const a=p.filter(x=>x?.key===key&&x?.target?.includes('production'));const shared=s.filter(x=>x?.key===key);if(a.length||shared.length)throw new Error('A4_D0_R2_ABSENT_PROOF_FAILED');fs.writeFileSync(process.argv[4],JSON.stringify({projectProductionMatches:0,sharedMatches:0},null,2)+'\n');
NODE

CREATE_REQUEST="$TEMP_ROOT/a4-d0-r2-create-request.json"; CREATE_BODY="$TEMP_ROOT/a4-d0-r2-create-body.json"; CREATE_HEADERS="$TEMP_ROOT/a4-d0-r2-create-headers.txt"; CREATE_STATUS="$TEMP_ROOT/a4-d0-r2-create-status.txt"
node --input-type=module - "$CREATE_REQUEST" "$CREATE_BODY" <<'NODE'
import fs from 'node:fs'; import {replacementCreatePayload} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs'; const body=replacementCreatePayload();fs.writeFileSync(process.argv[2],JSON.stringify(body));fs.writeFileSync(process.argv[3],JSON.stringify({payloadShape:['key','type','value','target'],valueState:'OFF'},null,2)+'\n');
NODE
curl -sS -D "$CREATE_HEADERS" -o "$CREATE_BODY.response" -w '%{http_code}' -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' --data-binary "@$CREATE_BODY" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" > "$CREATE_STATUS"
node --input-type=module - "$CREATE_STATUS" "$CREATE_BODY.response" "$CREATE_HEADERS" "$ARTIFACT_DIR/a4-replace-create-receipt.json" <<'NODE'
import fs from 'node:fs'; import {sanitizePatchResult} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';let payload={};try{payload=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))}catch{}const r=sanitizePatchResult({status:fs.readFileSync(process.argv[2],'utf8').trim(),payload,headers:fs.readFileSync(process.argv[4],'utf8')});fs.writeFileSync(process.argv[5],JSON.stringify(r,null,2)+'\n');
NODE
project_envs "$PROJECT"; shared_envs "$SHARED"
CREATE_STATUS="$CREATE_STATUS" node - "$PROJECT" "$SHARED" "$ARTIFACT_DIR/a4-replace-create-followup.json" <<'NODE'
const fs=require('node:fs');const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).envs||[];const s=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).envs||[];const key='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED';const rows=p.filter(x=>x?.key===key&&x?.target?.includes('production'));const status=Number(fs.readFileSync(process.env.CREATE_STATUS,'utf8').trim());fs.writeFileSync(process.argv[4],JSON.stringify({httpStatus:status,projectProductionMatches:rows.length,sharedMatches:s.filter(x=>x?.key===key).length},null,2)+'\n');if(status<200||status>=300){if(rows.length===0)throw new Error('COMUN_48_5_A4_R2_FLAG_REPLACEMENT_ABSENT_BLOCKED_PRODUCTION_PRESERVED');throw new Error('A4_D0_R2_CREATE_AMBIGUOUS_OR_DUPLICATE');}
NODE
npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$OLD_ID" "$ARTIFACT_DIR/a4-replace-post-create.json" <<'NODE'
import fs from 'node:fs';import {inspect,fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';const [p,s,e,t,old,out]=process.argv.slice(2);const view=inspect({project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))});const row=view.a4.projectMatches[0];if(view.a4.projectMatches.length!==1||view.a4.sharedMatches!==0||row?.type!=='encrypted'||view.a4.valueState!=='OFF'||view.a3.valueState!=='ON')throw new Error('A4_D0_R2_POSTCREATE_NOT_CANONICAL');if(row.id===fingerprint(old))throw new Error('A4_D0_R2_NEW_ID_NOT_DISTINCT');fs.writeFileSync(out,JSON.stringify({...view,newEnvId:row.id,oldEnvId:fingerprint(old),oldAndNewDistinct:true},null,2)+'\n');
NODE
POST_CREATE_DEPLOYS="$TEMP_ROOT/a4-d0-r2-post-create-deployments.json"; deployments "$POST_CREATE_DEPLOYS"
T0_MS="$T0_MS" node - "$POST_CREATE_DEPLOYS" <<'NODE'
const fs=require('node:fs');const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).deployments||[];if(rows.some(d=>Number(d.created||d.createdAt||0)>Number(process.env.T0_MS)))throw new Error('A4_D0_R2_DEPLOYMENT_WINDOW_VIOLATION');
NODE

DEPLOY_OUTPUT="$TEMP_ROOT/a4-d0-r2-deploy.txt"
npx --yes vercel@50.28.0 deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$DEPLOY_OUTPUT"
URL="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -n1 | tr -d '\r')"; case "$URL" in https://*.vercel.app) ;; *) echo A4_D0_R2_DEPLOYMENT_URL_INVALID; exit 1;; esac
npx --yes vercel@50.28.0 inspect "$URL" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
printf '%s\n' "$URL" > "$ARTIFACT_DIR/production-deployment-url.txt"
project_envs "$PROJECT"; shared_envs "$SHARED"; npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$TEAM" "$ARTIFACT_DIR/a4-replace-post-deploy.json" <<'NODE'
import fs from 'node:fs'; import {inspect} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs'; const [p,s,e,t,out]=process.argv.slice(2);const view=inspect({project:JSON.parse(fs.readFileSync(p,'utf8')),shared:JSON.parse(fs.readFileSync(s,'utf8')),envFile:e,team:JSON.parse(fs.readFileSync(t,'utf8'))});if(view.a4.projectMatches.length!==1||view.a4.projectMatches[0]?.type!=='encrypted'||view.a4.valueState!=='OFF'||view.a4.sharedMatches!==0||view.a3.valueState!=='ON')throw new Error('A4_D0_R2_POSTDEPLOY_PROOF_FAILED');fs.writeFileSync(out,JSON.stringify(view,null,2)+'\n');
NODE
for ROUTE in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$ROUTE")" = 200; test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "https://comunsocial.online$ROUTE")" = 200; done
summary COMUN_48_5_A4_R2_FLAG_REPLACED_ENCRYPTED_EXPLICIT_OFF_READY_FOR_WAVE0
summary flagA4=OFF; summary flagA4Type=encrypted; summary flagA4Unique=true; summary flagA3=ON; summary migrationA4=pending; summary businessWrites=0; summary productionHealthy=true
