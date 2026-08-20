#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-diagnose-only}"
case "$MODE" in diagnose-only|repair-once) ;; *) echo COMUN_48_5_A4_R2_D0_R1_INVALID_MODE; exit 1;; esac
: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"

ARTIFACT_DIR="${COMUN_A4_D0_R1_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-r2-d0-r1}"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
PROJECT_JSON="$TEMP_ROOT/a4-d0-r1-project.json"
SHARED_JSON="$TEMP_ROOT/a4-d0-r1-shared.json"
TEAM_JSON="$TEMP_ROOT/a4-d0-r1-team.json"
ENV_FILE="$TEMP_ROOT/a4-d0-r1-production.env"
PATCH_BODY="$TEMP_ROOT/a4-d0-r1-patch.json"
PATCH_RESPONSE="$TEMP_ROOT/a4-d0-r1-patch-response.json"
PATCH_STATUS="$TEMP_ROOT/a4-d0-r1-patch-status.txt"
PATCH_HEADERS="$TEMP_ROOT/a4-d0-r1-patch-headers.txt"
trap 'rm -f "$PROJECT_JSON" "$SHARED_JSON" "$TEAM_JSON" "$ENV_FILE" "$PATCH_BODY" "$PATCH_RESPONSE" "$PATCH_STATUS" "$PATCH_HEADERS"' EXIT
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }

test -z "${SUPABASE_DB_URL:-}"
test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"

ACTIVE_RUNS="$TEMP_ROOT/a4-d0-r1-active-runs.json"
curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/alexandrevrabandonada-oss/comunvrabandonada/actions/runs?status=in_progress&per_page=100" > "$ACTIVE_RUNS"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" node - "$ACTIVE_RUNS" <<'NODE'
const fs = require('node:fs');
const own = Number(process.env.GITHUB_RUN_ID ?? 0);
const runs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).workflow_runs ?? [];
if (runs.some((run) => run.id !== own && /48\.5-A4-R2 (?:Wave 0|D0)/.test(run.name ?? ''))) throw new Error('A4_D0_R1_CONCURRENT_A4_WRITER');
NODE

DEPLOYMENTS_JSON="$TEMP_ROOT/a4-d0-r1-production-deployments.json"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=20" > "$DEPLOYMENTS_JSON"
EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$DEPLOYMENTS_JSON" <<'NODE'
const fs = require('node:fs');
const deployments = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).deployments ?? [];
if (!deployments.some((item) => item?.readyState === 'READY' && item?.meta?.githubCommitSha === process.env.EXPECTED_MAIN_SHA)) throw new Error('A4_D0_R1_PRODUCTION_NOT_READY_FOR_MAIN');
NODE

curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$SHARED_JSON"
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/teams/$VERCEL_ORG_ID" > "$TEAM_JSON"
mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json", JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node scripts/ci/a4-d0-r1-env-repair-contract.mjs "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$TEAM_JSON" "$ARTIFACT_DIR/a4-d0-r1-readonly-audit.json"

if test "$MODE" = diagnose-only; then
  summary "COMUN_48_5_A4_R2_D0_R1_DIAG_GREEN_READ_ONLY"
  summary "supabaseAccess=none"
  summary "businessWrites=0"
  exit 0
fi

node --input-type=module - "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$TEAM_JSON" "$PATCH_BODY" <<'NODE'
import fs from 'node:fs';
import { assertRepairPreconditions, repairPayload } from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [projectFile, sharedFile, envFile, teamFile, bodyFile] = process.argv.slice(2);
const input = { project: JSON.parse(fs.readFileSync(projectFile, 'utf8')), shared: JSON.parse(fs.readFileSync(sharedFile, 'utf8')), envFile, team: JSON.parse(fs.readFileSync(teamFile, 'utf8')) };
const result = assertRepairPreconditions(input);
const row = input.project.envs.filter((item) => item?.key === 'COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED' && Array.isArray(item.target) && item.target.length === 1 && item.target[0] === 'production')[0];
if (typeof row?.id !== 'string') throw new Error('A4_D0_R1_ENV_ID_MISSING');
fs.writeFileSync(bodyFile, JSON.stringify({ envId: row.id, body: repairPayload() }));
fs.writeFileSync('.ci-artifacts/48-5-a4-r2-d0-r1/a4-d0-r1-preconditions.json', `${JSON.stringify({ a4: result.a4, a3: result.a3, teamSensitivePolicy: result.teamSensitivePolicy, rawValuePersisted: false }, null, 2)}\n`);
NODE
ENV_ID="$(node -e 'const x=require(process.argv[1]); process.stdout.write(x.envId)' "$PATCH_BODY")"
node -e 'const fs=require("node:fs"); const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); fs.writeFileSync(process.argv[2],JSON.stringify(x.body))' "$PATCH_BODY" "$PATCH_BODY.body"
mv "$PATCH_BODY.body" "$PATCH_BODY"
curl -sS -D "$PATCH_HEADERS" -o "$PATCH_RESPONSE" -w '%{http_code}' -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' --data-binary "@$PATCH_BODY" "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$ENV_ID?teamId=$VERCEL_ORG_ID" > "$PATCH_STATUS"
node --input-type=module - "$PATCH_STATUS" "$PATCH_RESPONSE" "$PATCH_HEADERS" "$ARTIFACT_DIR/a4-d0-r1-patch-receipt.json" <<'NODE'
import fs from 'node:fs';
import { sanitizePatchResult } from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const status = fs.readFileSync(process.argv[2], 'utf8').trim();
let payload = {}; try { payload = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); } catch {}
const headers = fs.readFileSync(process.argv[4], 'utf8');
const receipt = sanitizePatchResult({ status, payload, headers });
fs.writeFileSync(process.argv[5], `${JSON.stringify(receipt, null, 2)}\n`);
if (!receipt.successful) throw new Error(`COMUN_48_5_A4_R2_D0_R1_PATCH_FAILED_HTTP_${receipt.httpStatus}`);
NODE

curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node --input-type=module - "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$TEAM_JSON" "$ARTIFACT_DIR/a4-d0-r1-post-patch-audit.json" <<'NODE'
import fs from 'node:fs';
import { inspect } from './scripts/ci/a4-d0-r1-env-repair-contract.mjs';
const [projectFile, sharedFile, envFile, teamFile, output] = process.argv.slice(2);
const view = inspect({ project: JSON.parse(fs.readFileSync(projectFile, 'utf8')), shared: JSON.parse(fs.readFileSync(sharedFile, 'utf8')), envFile, team: JSON.parse(fs.readFileSync(teamFile, 'utf8')) });
if (view.a4.projectMatches.length !== 1 || view.a4.projectMatches[0].type !== 'encrypted' || view.a4.valueState !== 'OFF') throw new Error('A4_D0_R1_POSTPATCH_A4_NOT_EXPLICIT_OFF');
if (view.a3.valueState !== 'ON') throw new Error('A4_D0_R1_POSTPATCH_A3_DRIFT');
fs.writeFileSync(output, `${JSON.stringify(view, null, 2)}\n`);
NODE
DEPLOY_OUTPUT="$TEMP_ROOT/a4-d0-r1-production-deploy.txt"
npx --yes vercel@50.28.0 deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$DEPLOY_OUTPUT"
DEPLOYMENT_URL="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$DEPLOY_OUTPUT" | tail -n 1 | tr -d '\r')"
case "$DEPLOYMENT_URL" in https://*.vercel.app) ;; *) echo COMUN_48_5_A4_R2_D0_R1_DEPLOYMENT_URL_INVALID; exit 1;; esac
npx --yes vercel@50.28.0 inspect "$DEPLOYMENT_URL" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
printf '%s\n' "$DEPLOYMENT_URL" > "$ARTIFACT_DIR/production-deployment-url.txt"
summary "productionDeployment=READY"
for ROUTE in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir; do
  test "$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$ROUTE")" = 200
  test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "https://comunsocial.online$ROUTE")" = 200
done
summary "smokeMethods=GET_HEAD_ONLY"
summary "COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_GREEN_EXPLICIT_OFF_READY_FOR_WAVE0"
summary "flagA4=OFF"
summary "flagA3=enabled"
summary "supabaseAccess=none"
summary "businessWrites=0"
