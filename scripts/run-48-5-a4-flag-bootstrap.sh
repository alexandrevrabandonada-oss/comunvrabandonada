#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${A4_FUNCTIONAL_ANCESTOR:?A4_FUNCTIONAL_ANCESTOR is required}"
: "${A4_MIGRATION:?A4_MIGRATION is required}"
: "${A4_MIGRATION_SHA256:?A4_MIGRATION_SHA256 is required}"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

test "$SUPABASE_PROJECT_REF" = "nvmdszymrtacfehdynpg"
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) echo COMUN_48_5_A4_R2_D0_REMOTE_DB_URL_INVALID; exit 1;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

ARTIFACT_DIR="${COMUN_A4_D0_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-r2-d0}"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage() { printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
stage initialized

ENV_FILE="$TEMP_ROOT/comun-a4-d0-production.env"
PROJECT_JSON="$TEMP_ROOT/comun-a4-d0-project-env.json"
SHARED_JSON="$TEMP_ROOT/comun-a4-d0-shared-env.json"
CREATE_RESPONSE="$TEMP_ROOT/comun-a4-d0-create-response.json"
CREATE_BODY="$TEMP_ROOT/comun-a4-d0-create-body.json"
cleanup() { rm -f "$ENV_FILE" "$PROJECT_JSON" "$SHARED_JSON" "$CREATE_RESPONSE" "$CREATE_BODY"; }
trap cleanup EXIT

assert_main_and_schema_pending() {
  test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
  git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"
  git merge-base --is-ancestor "$A4_FUNCTIONAL_ANCESTOR" HEAD
  test "$(sha256sum "$A4_MIGRATION" | awk '{print $1}')" = "$A4_MIGRATION_SHA256"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/migration-preflight.json" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'a3Applied', exists(select 1 from supabase_migrations.schema_migrations where version = '20260818120000'),
  'a4Pending', not exists(select 1 from supabase_migrations.schema_migrations where version = '20260819130000')
);
rollback;
SQL
  node - "$ARTIFACT_DIR/migration-preflight.json" <<'NODE'
const fs = require('node:fs');
const state = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (state.transactionReadOnly !== true || state.a3Applied !== true || state.a4Pending !== true) throw new Error('COMUN_48_5_A4_R2_D0_MIGRATION_PRECHECK_BLOCKED');
NODE
  summary "main=$EXPECTED_MAIN_SHA"
  summary "migrationA4=pending"
  stage main_and_migration_preflight_green
}

assert_no_concurrent_a4_writer() {
  local runs="$TEMP_ROOT/comun-a4-d0-active-runs.json"
  curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/alexandrevrabandonada-oss/comunvrabandonada/actions/runs?status=in_progress&per_page=100" > "$runs"
  GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" node - "$runs" <<'NODE'
const fs = require('node:fs');
const own = String(process.env.GITHUB_RUN_ID ?? '');
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const writers = (body.workflow_runs ?? []).filter((run) => run?.id !== Number(own) && /48\.5-A4-R2 (Wave 0|D0)/.test(run?.name ?? ''));
if (writers.length > 0) throw new Error('COMUN_48_5_A4_R2_D0_CONCURRENT_WRITER');
NODE
  summary "concurrentA4Writers=0"
  stage no_concurrent_a4_writer
}

assert_production_ready() {
  local deployments="$TEMP_ROOT/comun-a4-d0-deployments.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=50" > "$deployments"
  EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$deployments" <<'NODE'
const fs = require('node:fs');
const expected = process.env.EXPECTED_MAIN_SHA;
const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!(body.deployments ?? []).some((item) => item?.readyState === 'READY' && item?.meta?.githubCommitSha === expected)) throw new Error('COMUN_48_5_A4_R2_D0_PRODUCTION_NOT_READY_FOR_MAIN');
NODE
  summary "productionReady=true"
}

pull_and_list_env() {
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$SHARED_JSON"
  mkdir -p .vercel
  node -e 'require("node:fs").writeFileSync(".vercel/project.json", JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
}

write_receipt() {
  local phase="$1" output="$2"
  node scripts/ci/a4-flag-writer-contract.mjs \
    --phase "$phase" --project-json "$PROJECT_JSON" --shared-json "$SHARED_JSON" --env-file "$ENV_FILE" --output "$output"
}

create_a4_flag_once() {
  cat > "$CREATE_BODY" <<'JSON'
[{"key":"COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED","value":"disabled","type":"sensitive","target":["production"],"comment":"managed-by=comun-48-5-a4-r2; phase=a4-r2-d0; state=off"}]
JSON
  curl -fsS -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    --data-binary "@$CREATE_BODY" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" > "$CREATE_RESPONSE"
  test -s "$CREATE_RESPONSE"
  node --input-type=module - "$CREATE_RESPONSE" "$ARTIFACT_DIR/a4-flag-create-response-receipt.json" <<'NODE'
const fs = require('node:fs');
const { sanitizeA4CreateResponse } = await import('./scripts/ci/a4-flag-writer-contract.mjs');
const receipt = sanitizeA4CreateResponse(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
fs.writeFileSync(process.argv[3], `${JSON.stringify({ formatVersion: 1, phase: 'create-response', ...receipt }, null, 2)}\n`);
NODE
  stage a4_flag_created_absent_to_disabled
}

deploy_production() {
  local output="$TEMP_ROOT/comun-a4-d0-deploy.txt"
  npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$output"
  local deployment_url
  deployment_url="$(grep -Eo 'https://[^[:space:]]+' "$output" | tail -n1 | tr -d '\r')"
  case "$deployment_url" in https://*.vercel.app) ;; *) echo COMUN_48_5_A4_R2_D0_DEPLOYMENT_URL_INVALID; exit 1;; esac
  npx --yes vercel@50.28.0 inspect "$deployment_url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 promote "$deployment_url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 alias set "$deployment_url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  printf '%s\n' "$deployment_url" > "$ARTIFACT_DIR/production-deployment-url.txt"
  summary "productionDeployment=READY"
  stage production_deployment_materialized
}

business_snapshot() {
  local output="$1"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$output" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'intakes', (select count(*) from private.comun_cultural_contribution_intakes),
  'targets', (select count(*) from public.comun_archive_submissions) + (select count(*) from public.comun_archive_artwork_submissions) + (select count(*) from public.comun_archive_oral_history_suggestions) + (select count(*) from public.comun_radio_contributions),
  'archiveItems', (select count(*) from public.comun_archive_items),
  'assets', (select count(*) from public.comun_archive_assets),
  'searchWrites', (select count(*) from public.comun_search_documents),
  'collections', (select count(*) from public.comun_archive_collections),
  'publications', (select count(*) from public.comun_archive_items where status = 'published') + (select count(*) from public.comun_archive_collections where status = 'published') + (select count(*) from public.comun_radio_programs where publication_status = 'published') + (select count(*) from public.comun_radio_episodes where publication_status = 'published')
);
rollback;
SQL
}

assert_zero_business_delta() {
  node - "$1" "$2" "$ARTIFACT_DIR/business-write-delta.json" <<'NODE'
const fs = require('node:fs');
const before = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const after = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
for (const key of ['intakes', 'targets', 'archiveItems', 'assets', 'searchWrites', 'collections', 'publications']) {
  if (Number(after[key]) !== Number(before[key])) throw new Error(`COMUN_48_5_A4_R2_D0_BUSINESS_WRITE_DELTA:${key}`);
}
fs.writeFileSync(process.argv[4], `${JSON.stringify(Object.fromEntries(['intakes', 'targets', 'archiveItems', 'assets', 'searchWrites', 'collections', 'publications'].map((key) => [key, 0])), null, 2)}\n`);
NODE
  summary "businessWrites=0"
  summary "fixtures=0"
  summary "targets=0"
  summary "archiveItems=0"
  summary "assets=0"
  summary "searchWrites=0"
  summary "collections=0"
  summary "publications=0"
}

readonly_smoke() {
  local routes=(/comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir)
  local body="$TEMP_ROOT/comun-a4-d0-smoke.html"
  for route in "${routes[@]}"; do
    test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 6 --retry-delay 2 "$COMUN_BASE_URL$route")" = 200
    test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' --retry 6 --retry-delay 2 "$COMUN_BASE_URL$route")" = 200
    curl -L -fsS --retry 6 --retry-delay 2 "$COMUN_BASE_URL$route" > "$body"
    ! grep -Eqi 'resume_token_hash|member_user_id|target_id|private\.comun_|supabase_service_role|service_role_key' "$body"
  done
  summary "smokeRoutes=8"
  summary "smokeMethods=GET_HEAD_ONLY"
  stage readonly_smoke_green
}

assert_main_and_schema_pending
assert_no_concurrent_a4_writer
assert_production_ready
pull_and_list_env
write_receipt bootstrap-pre "$ARTIFACT_DIR/a4-flag-bootstrap-pre-receipt.json"
stage a4_flag_absent_preflight_green
business_snapshot "$ARTIFACT_DIR/business-before.json"
create_a4_flag_once
pull_and_list_env
write_receipt bootstrap-post "$ARTIFACT_DIR/a4-flag-bootstrap-post-receipt.json"
node - "$ARTIFACT_DIR/a4-flag-create-response-receipt.json" "$ARTIFACT_DIR/a4-flag-bootstrap-post-receipt.json" <<'NODE'
const fs = require('node:fs');
const create = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const post = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
if (create.envId !== post.envId) throw new Error('COMUN_48_5_A4_R2_D0_CREATED_ENV_ID_MISMATCH');
NODE
stage a4_flag_off_metadata_green
deploy_production
assert_production_ready
pull_and_list_env
write_receipt bootstrap-post "$ARTIFACT_DIR/a4-flag-runtime-post-receipt.json"
stage a4_flag_off_runtime_green
readonly_smoke
business_snapshot "$ARTIFACT_DIR/business-after.json"
assert_zero_business_delta "$ARTIFACT_DIR/business-before.json" "$ARTIFACT_DIR/business-after.json"
summary COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_GREEN_EXPLICIT_OFF_READY_FOR_WAVE0
summary "flagA4=OFF"
summary "flagA3=enabled"
summary "migrationA4=pending"
summary "productionHealthy=true"
stage terminal_green
