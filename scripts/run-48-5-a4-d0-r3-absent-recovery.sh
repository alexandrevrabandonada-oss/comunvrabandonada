#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
test -z "${SUPABASE_DB_URL:-}" && test -z "${SUPABASE_ACCESS_TOKEN:-}" && test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

A4_KEY=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED
A3_KEY=COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED
ARTIFACT_DIR=.ci-artifacts/48-5-a4-r2-d0-r3
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
trap 'rm -rf "$TEMP_ROOT/a4-d0-r3-"*' EXIT
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
api() { curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "$1"; }
project_envs() { api "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$1"; }
shared_envs() { api "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=$A4_KEY&limit=100" > "$1"; }
deployments() { api "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&limit=100" > "$1"; }
smoke() { for p in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$p")" = 200; test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "https://comunsocial.online$p")" = 200; done; }
fail_marker() { summary "$1"; summary flagA4=OFF; summary flagA3=ON; summary migrationA4=pending; summary businessWrites=0; }

test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"

ACTIVE="$TEMP_ROOT/a4-d0-r3-active.json"
curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/alexandrevrabandonada-oss/comunvrabandonada/actions/runs?status=in_progress&per_page=100" > "$ACTIVE"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" node - "$ACTIVE" <<'NODE'
const fs=require('node:fs'), own=Number(process.env.GITHUB_RUN_ID||0);
const runs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).workflow_runs||[];
if(runs.some(r=>r.id!==own&&(/48\.5-A4-R2/.test(r.name||'')||/(production|deploy|rollout|activation)/i.test(r.name||'')))) throw new Error('A4_D0_R3_CONCURRENT_PRODUCTION_OPERATION');
NODE

# This deployment was built after A4 became absent. Its runtime therefore proves the app's fail-closed ABSENT => OFF behavior before the one permitted POST.
DEPLOYS="$TEMP_ROOT/a4-d0-r3-deployments.json"; deployments "$DEPLOYS"
EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$DEPLOYS" "$ARTIFACT_DIR/a4-runtime-barrier.json" <<'NODE'
const fs=require('node:fs'), all=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).deployments||[], sha=process.env.EXPECTED_MAIN_SHA;
if(all.some(d=>['BUILDING','QUEUED','INITIALIZING'].includes(d.readyState||d.state))) throw new Error('A4_D0_R3_PRODUCTION_DEPLOYMENT_ACTIVE');
const d=all.find(d=>(d.readyState||d.state)==='READY'&&d.meta?.githubCommitSha===sha); if(!d) throw new Error('A4_D0_R3_RUNTIME_BARRIER_NOT_READY');
fs.writeFileSync(process.argv[3],JSON.stringify({phase:'runtime_barrier_absent_off',deploymentIdFingerprint:require('node:crypto').createHash('sha256').update(d.uid||d.id||'').digest('hex').slice(0,16),sha,ready:true,a4RuntimeState:'OFF',rawValuePersisted:false},null,2)+'\n');
NODE

PROJECT="$TEMP_ROOT/a4-d0-r3-project.json"; SHARED="$TEMP_ROOT/a4-d0-r3-shared.json"; ENVFILE="$TEMP_ROOT/a4-d0-r3.env"
project_envs "$PROJECT"; shared_envs "$SHARED"; mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$ARTIFACT_DIR/a4-absent-precheck.json" <<'NODE'
import fs from 'node:fs'; import {fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [p,s,e,out]=process.argv.slice(2), envs=(JSON.parse(fs.readFileSync(p,'utf8')).envs||[]), shared=(JSON.parse(fs.readFileSync(s,'utf8')).envs||[]), text=fs.readFileSync(e,'utf8');
const prod=k=>envs.filter(x=>x?.key===k&&x?.target?.includes('production')), state=k=>{const x=text.split(/\r?\n/).find(l=>l.startsWith(`${k}=`));return !x?'ABSENT':x.slice(k.length+1).replace(/^"|"$/g,'')==='enabled'?'ON':x.slice(k.length+1).replace(/^"|"$/g,'')==='disabled'?'OFF':'UNKNOWN'};
const a4=prod('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'),a3=prod('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED');
if(a4.length||shared.some(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')) throw new Error('A4_D0_R3_A4_NOT_ABSENT');
if(a3.length!==1||a3[0].type!=='encrypted'||a3[0].target?.length!==1||a3[0].target[0]!=='production'||a3[0].gitBranch!=null||(a3[0].customEnvironmentIds||[]).length||shared.some(x=>x?.key==='COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED')||state('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED')!=='ON') throw new Error('A4_D0_R3_A3_NOT_CANONICAL_ON');
fs.writeFileSync(out,JSON.stringify({a4:{projectProductionMatches:0,sharedMatches:0,valueState:state('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')},a3:{id:fingerprint(a3[0].id),type:'encrypted',valueState:'ON'},migrationA4:'pending',businessWrites:0},null,2)+'\n');
NODE
smoke

CREATE_BODY="$TEMP_ROOT/a4-d0-r3-create.json"; CREATE_RESPONSE="$TEMP_ROOT/a4-d0-r3-create-response.json"; CREATE_HEADERS="$TEMP_ROOT/a4-d0-r3-create-headers.txt"; CREATE_STATUS="$TEMP_ROOT/a4-d0-r3-create-status.txt"
node --input-type=module - "$CREATE_BODY" <<'NODE'
import fs from 'node:fs'; import {replacementCreatePayload} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const body=replacementCreatePayload(); if(Array.isArray(body)||body.key!=='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'||body.type!=='encrypted'||body.value!=='disabled'||JSON.stringify(body.target)!=='["production"]') throw new Error('A4_D0_R3_CREATE_PAYLOAD_INVALID'); fs.writeFileSync(process.argv[2],JSON.stringify(body));
NODE
curl -sS -D "$CREATE_HEADERS" -o "$CREATE_RESPONSE" -w '%{http_code}' -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' --data-binary "@$CREATE_BODY" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" > "$CREATE_STATUS"
node --input-type=module - "$CREATE_STATUS" "$CREATE_RESPONSE" "$CREATE_HEADERS" "$ARTIFACT_DIR/a4-create-receipt.json" <<'NODE'
import fs from 'node:fs'; import {sanitizePatchResult} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs'; let p={};try{p=JSON.parse(fs.readFileSync(process.argv[3],'utf8'))}catch{};fs.writeFileSync(process.argv[5],JSON.stringify(sanitizePatchResult({status:fs.readFileSync(process.argv[2],'utf8').trim(),payload:p,headers:fs.readFileSync(process.argv[4],'utf8')}),null,2)+'\n');
NODE
project_envs "$PROJECT"; shared_envs "$SHARED"; npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
if ! node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$CREATE_STATUS" "$ARTIFACT_DIR/a4-post-create.json" <<'NODE'
import fs from 'node:fs'; import {fingerprint} from './scripts/ci/a4-d0-r1-env-repair-contract.mjs'; const [p,s,e,status,out]=process.argv.slice(2), envs=(JSON.parse(fs.readFileSync(p,'utf8')).envs||[]), shared=(JSON.parse(fs.readFileSync(s,'utf8')).envs||[]), text=fs.readFileSync(e,'utf8'), code=Number(fs.readFileSync(status,'utf8'));
const rows=envs.filter(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'&&x?.target?.includes('production')), value=(text.split(/\r?\n/).find(l=>l.startsWith('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED='))||'').split('=').slice(1).join('=').replace(/^"|"$/g,'');
if(code<200||code>=300||rows.length!==1||rows[0].type!=='encrypted'||rows[0].target?.length!==1||rows[0].target[0]!=='production'||rows[0].gitBranch!=null||(rows[0].customEnvironmentIds||[]).length||shared.some(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')||value!=='disabled') throw new Error('A4_D0_R3_CREATE_NOT_CANONICAL'); fs.writeFileSync(out,JSON.stringify({newEnvId:fingerprint(rows[0].id),type:'encrypted',valueState:'OFF',projectProductionMatches:1,sharedMatches:0},null,2)+'\n');
NODE
then
  STATUS="$(cat "$CREATE_STATUS")"; project_envs "$PROJECT"; shared_envs "$SHARED"
  if [ "$STATUS" -ge 400 ] && node - "$PROJECT" "$SHARED" <<'NODE'
const fs=require('node:fs'), p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).envs||[],s=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).envs||[]; process.exit(p.some(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'&&x?.target?.includes('production'))||s.some(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')?1:0);
NODE
  then fail_marker COMUN_48_5_A4_R2_FLAG_CREATE_BLOCKED_RUNTIME_EXPLICITLY_OFF_ENV_ABSENT; else fail_marker COMUN_48_5_A4_R2_FLAG_CREATE_AMBIGUOUS_STOP; fi
  exit 1
fi

FINAL="$TEMP_ROOT/a4-d0-r3-final-deploy.txt"
npx --yes vercel@50.28.0 deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$FINAL"
URL="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$FINAL"|tail -n1|tr -d '\r')"; npx --yes vercel@50.28.0 inspect "$URL" --wait --timeout=8m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
project_envs "$PROJECT"; shared_envs "$SHARED"; npx --yes vercel@50.28.0 env pull "$ENVFILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT" "$SHARED" "$ENVFILE" "$ARTIFACT_DIR/a4-post-deploy.json" <<'NODE'
import fs from 'node:fs'; const [p,s,e,out]=process.argv.slice(2), envs=(JSON.parse(fs.readFileSync(p,'utf8')).envs||[]), shared=(JSON.parse(fs.readFileSync(s,'utf8')).envs||[]), text=fs.readFileSync(e,'utf8');
const one=(k)=>envs.filter(x=>x?.key===k&&x?.target?.includes('production')), state=(k)=>{const l=text.split(/\r?\n/).find(x=>x.startsWith(`${k}=`));return l?.slice(k.length+1).replace(/^"|"$/g,'')}; const a4=one('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'),a3=one('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED');
if(a4.length!==1||a4[0].type!=='encrypted'||a4[0].target?.length!==1||a4[0].target[0]!=='production'||a4[0].gitBranch!=null||(a4[0].customEnvironmentIds||[]).length||a3.length!==1||a3[0].type!=='encrypted'||shared.some(x=>x?.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'||x?.key==='COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED')||state('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED')!=='disabled'||state('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED')!=='enabled') throw new Error('A4_D0_R3_POST_DEPLOY_AUDIT_FAILED');
fs.writeFileSync(out,JSON.stringify({a4:'OFF',a4Type:'encrypted',a4Unique:true,a3:'ON',sharedConflicts:0,businessWrites:0},null,2)+'\n');
NODE
smoke
summary COMUN_48_5_A4_R2_FLAG_RECOVERED_ENCRYPTED_EXPLICIT_OFF_READY_FOR_WAVE0
summary flagA4=OFF
summary flagA4Type=encrypted
summary flagA4Unique=true
summary flagA3=ON
summary migrationA4=pending
summary businessWrites=0
summary productionHealthy=true
