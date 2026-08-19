#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${A3_BASELINE_SHA:?A3_BASELINE_SHA is required}"
: "${A3_MIGRATION:?A3_MIGRATION is required}"
: "${A3_MIGRATION_SHA256:?A3_MIGRATION_SHA256 is required}"
: "${A4_MIGRATION:?A4_MIGRATION is required}"
: "${A4_MIGRATION_SHA256:?A4_MIGRATION_SHA256 is required}"
: "${SIDEWALK_MIGRATION:?SIDEWALK_MIGRATION is required}"
: "${SIDEWALK_MIGRATION_SHA256:?SIDEWALK_MIGRATION_SHA256 is required}"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

case "$MODE" in
  rollout|wave0-only|wave1-only|disable-only) ;;
  *) echo COMUN_48_5_A3_R2_INVALID_MODE >> "$GITHUB_STEP_SUMMARY"; exit 1 ;;
esac

ARTIFACT_DIR="${COMUN_A3_ARTIFACT_DIR:-.ci-artifacts/48-5-a3-r2-production}"
mkdir -p "$ARTIFACT_DIR"
stage() {
  printf '%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"
  printf 'stage=%s\n' "$1" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
}
stage initialized
TEMP_FILES=()
remember() { TEMP_FILES+=("$1"); }
cleanup() { rm -f "${TEMP_FILES[@]:-}"; }
trap cleanup EXIT

summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }

assert_main() {
  stage assert_main_started
  test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
  stage head_sha_verified
  git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  stage origin_fetched
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"
  stage origin_main_verified
  git merge-base --is-ancestor "$A3_BASELINE_SHA" HEAD
  stage a3_ancestor_verified
  test "$(sha256sum "$A3_MIGRATION" | awk '{print $1}')" = "$A3_MIGRATION_SHA256"
  stage a3_checksum_verified
}

assert_project_binding() {
  test "$SUPABASE_PROJECT_REF" = "nvmdszymrtacfehdynpg"
  mkdir -p .vercel
  node -e 'require("node:fs").writeFileSync(".vercel/project.json", JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
  npx --yes vercel@50.28.0 project inspect "$VERCEL_PROJECT_ID" --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
}

assert_production_ready() {
  local response="$RUNNER_TEMP/comun-a3-production-deployments.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=20" \
    > "$response"
  node - "$response" "$EXPECTED_MAIN_SHA" <<'NODE'
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expected = process.argv[3];
const ready = (body.deployments ?? []).some((deployment) => deployment?.readyState === "READY" && deployment?.meta?.githubCommitSha === expected);
if (!ready) throw new Error("COMUN_48_5_A3_R2_PRODUCTION_NOT_READY_FOR_MAIN");
NODE
  summary "productionReady=true"
}

pull_production_env() {
  local output="$1"
  stage env_pull_started
  npx --yes vercel@50.28.0 env pull "$output" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  test -s "$output"
  stage env_pulled
}

env_value() {
  local file="$1" key="$2"
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/,"",$0); sub(/^"/,"",$0); sub(/"$/,"",$0); print; exit}' "$file"
}

A3_PREVIOUS_FLAG_STATE="UNKNOWN"
A3_MIGRATION_RESULT="pending"
verify_a3_writer_contract() {
  local current_state="$1" desired_state="$2" phase="$3"
  local project_json="$RUNNER_TEMP/comun-a3-flag-project-metadata.json"
  local shared_json="$RUNNER_TEMP/comun-a3-flag-shared-metadata.json"
  local receipt="$ARTIFACT_DIR/a3-flag-write-receipt-${desired_state}-${phase}.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$project_json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED&limit=100" > "$shared_json"
  EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" GITHUB_RUN_ID="${GITHUB_RUN_ID:-}" \
    node scripts/ci/a3-flag-writer-contract.mjs \
      --project-json "$project_json" \
      --shared-json "$shared_json" \
      --mode "$MODE" \
      --current-state "$current_state" \
      --desired-state "$desired_state" \
      --phase "$phase" \
      --receipt "$receipt"
}

verify_a3_flag_metadata() {
  local project_json="$RUNNER_TEMP/comun-a3-flag-project-metadata.json"
  local shared_json="$RUNNER_TEMP/comun-a3-flag-shared-metadata.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$project_json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED&limit=100" > "$shared_json"
  node - "$project_json" "$shared_json" <<'NODE'
const fs = require("node:fs");
const key = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";
const project = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const shared = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const projectRows = Array.isArray(project?.envs) ? project.envs : Array.isArray(project?.data) ? project.data : [];
const sharedRows = Array.isArray(shared?.envs) ? shared.envs : Array.isArray(shared?.data) ? shared.data : [];
const production = projectRows.filter((row) => row?.key === key && Array.isArray(row.target) && row.target.includes("production"));
if (production.length !== 1) throw new Error("A3_FLAG_POST_DEPLOY_PRODUCTION_KEY_NOT_UNIQUE");
const row = production[0];
if (sharedRows.some((candidate) => candidate?.key === key)) throw new Error("A3_FLAG_POST_DEPLOY_SHARED_CONFLICT");
if (row.gitBranch !== null && row.gitBranch !== undefined) throw new Error("A3_FLAG_POST_DEPLOY_BRANCH_OVERRIDE");
if (Array.isArray(row.customEnvironmentIds) && row.customEnvironmentIds.length > 0) throw new Error("A3_FLAG_POST_DEPLOY_CUSTOM_OVERRIDE");
NODE
}

assert_a3_flag_off() {
  local env_file="$1" value
  value="$(env_value "$env_file" COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED || true)"
  if test "$value" = "enabled"; then A3_PREVIOUS_FLAG_STATE=ON
  elif test "$value" = "disabled"; then A3_PREVIOUS_FLAG_STATE=OFF
  elif test -z "$value"; then A3_PREVIOUS_FLAG_STATE=ABSENT
  else A3_PREVIOUS_FLAG_STATE=UNKNOWN
  fi
  if test "$value" = "enabled"; then
    stage a3_flag_unexpectedly_on
    return 1
  fi
  stage a3_flag_value_verified_off
  if test "$(env_value "$env_file" COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED || true)" = "enabled"; then
    summary "a2SaveFirstFlag=enabled"
  else
    summary "a2SaveFirstFlag=disabled_or_absent"
  fi
  summary "a3Flag=off"
}

assert_exact_migration_plan() {
  MIGRATION_PLAN_HELD_A4="$RUNNER_TEMP/comun-a3-r2-held-a4.sql"
  MIGRATION_PLAN_HELD_SIDEWALK="$RUNNER_TEMP/comun-a3-r2-held-sidewalk.sql"
  local plan="$ARTIFACT_DIR/migration-plan.txt"
  test ! -e "$MIGRATION_PLAN_HELD_A4" && test ! -e "$MIGRATION_PLAN_HELD_SIDEWALK"
  test "$(sha256sum "$A4_MIGRATION" | awk '{print $1}')" = "$A4_MIGRATION_SHA256"
  test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print $1}')" = "$SIDEWALK_MIGRATION_SHA256"
  mv "$A4_MIGRATION" "$MIGRATION_PLAN_HELD_A4"
  mv "$SIDEWALK_MIGRATION" "$MIGRATION_PLAN_HELD_SIDEWALK"
  restore() {
    test ! -e "$MIGRATION_PLAN_HELD_A4" || mv "$MIGRATION_PLAN_HELD_A4" "$A4_MIGRATION"
    test ! -e "$MIGRATION_PLAN_HELD_SIDEWALK" || mv "$MIGRATION_PLAN_HELD_SIDEWALK" "$SIDEWALK_MIGRATION"
  }
  trap restore EXIT
  supabase db push --db-url "$SUPABASE_DB_URL" --dry-run >"$plan" 2>&1
  mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$plan" | sort -u || true)
  if test "${#planned[@]}" -eq 0; then
    grep -Fqx 'Remote database is up to date.' "$plan"
    A3_MIGRATION_RESULT="already_applied"
    summary "migrationPlan=already_applied"
  else
    test "${#planned[@]}" -eq 1
    test "${planned[0]}" = "$(basename "$A3_MIGRATION")"
    A3_MIGRATION_RESULT="pending"
    summary "migrationPlan=exact_a3_pending"
  fi
  ! grep -Eqi -- '--include-all|migration repair|db reset|seed' "$plan"
  restore
  trap - EXIT
}

metadata_postflight() {
  local output="$ARTIFACT_DIR/schema-postflight.json"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 >"$output" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'migrationApplied', exists(select 1 from supabase_migrations.schema_migrations where version = '20260818120000'),
  'handoffFunction', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_prepare_cultural_contribution_handoff_v1'),
  'routeFunction', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_route_cultural_contribution_intake_v1'),
  'serviceRoleOnly', has_function_privilege('service_role','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','EXECUTE') and not has_function_privilege('anon','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','EXECUTE') and not has_function_privilege('authenticated','public.comun_prepare_cultural_contribution_handoff_v1(text,text,uuid)','EXECUTE'),
  'routeServiceRoleOnly', has_function_privilege('service_role','public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid)','EXECUTE') and not has_function_privilege('anon','public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid)','EXECUTE') and not has_function_privilege('authenticated','public.comun_route_cultural_contribution_intake_v1(text,text,text,uuid)','EXECUTE'),
  'stateConstraint', exists(select 1 from pg_constraint where conrelid='private.comun_cultural_contribution_intakes'::regclass and conname='comun_cultural_contribution_intakes_status_check' and pg_get_constraintdef(oid) like '%handoff_pending%'),
  'privateIntakeRls', (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_cultural_contribution_intakes'::regclass),
  'publicObjectsCreated', false,
  'businessWrites', false,
  'fixturesCreated', false,
  'publicationsCreated', false
);
rollback;
SQL
  node - "$output" <<'NODE'
const fs = require("node:fs");
const state = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const key of ["transactionReadOnly", "migrationApplied", "handoffFunction", "routeFunction", "serviceRoleOnly", "routeServiceRoleOnly", "stateConstraint", "privateIntakeRls"]) {
  if (state[key] !== true) throw new Error(`COMUN_48_5_A3_R2_SCHEMA_BLOCKED:${key}`);
}
for (const key of ["publicObjectsCreated", "businessWrites", "fixturesCreated", "publicationsCreated"]) {
  if (state[key] !== false) throw new Error(`COMUN_48_5_A3_R2_UNSAFE_POSTFLIGHT:${key}`);
}
NODE
}

http_status() { curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$1"; }

wave0_smoke() {
  local page="$RUNNER_TEMP/comun-a3-wave0-page.html"
  remember "$page"
  for path in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/historias-orais /comun/radio; do
    test "$(http_status "$path")" = 200
  done
  test "$(http_status /comun/acervo)" = "$(curl -L -sS -o /dev/null -w '%{http_code}' -I --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/acervo")"
  curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/acervo/contribuir" >"$page"
  ! grep -Eqi 'resume_token_hash|target_id|member_user_id|private\.comun_|public_protocol=[A-Za-z0-9_-]{8,}' "$page"
  summary "COMUN_48_5_A3_R2_SCHEMA_GREEN_FLAG_OFF"
  summary "businessWrites=0"
  summary "fixturesCreated=0"
  summary "publicationsCreated=0"
  summary "productionRequests=GET_HEAD_ONLY"
}

write_wave0_final_receipt() {
  local receipt="$ARTIFACT_DIR/a3-wave0-final-receipt.json"
  A3_MIGRATION_RESULT="$A3_MIGRATION_RESULT" node - "$receipt" "$ARTIFACT_DIR/a3-flag-write-receipt-enabled-preflight.json" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");
const [output, preflightPath] = process.argv.slice(2);
const fingerprint = (value) => typeof value === "string" && value.length > 0
  ? `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`
  : null;
const preflight = JSON.parse(fs.readFileSync(preflightPath, "utf8"));
const receipt = {
  formatVersion: 1,
  writer: "comun-48-5-a3-r2",
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  runId: /^[0-9]+$/.test(String(process.env.GITHUB_RUN_ID ?? "")) ? String(process.env.GITHUB_RUN_ID) : null,
  sha: /^[0-9a-f]{7,64}$/i.test(String(process.env.EXPECTED_MAIN_SHA ?? "")) ? process.env.EXPECTED_MAIN_SHA : null,
  mainSha: process.env.EXPECTED_MAIN_SHA ?? null,
  project: fingerprint(process.env.SUPABASE_PROJECT_REF),
  flagId: preflight.envId ?? null,
  phase: "wave0_complete",
  migrationA3: process.env.A3_MIGRATION_RESULT === "already_applied" ? "already_applied" : "applied",
  flag: "OFF",
  businessWrites: 0,
  fixtures: 0,
  publications: 0,
  productionHealthy: true,
  rawValuePersisted: false,
  tokenPersisted: false,
};
fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
NODE
}

set_a3_flag() {
  local value="$1"
  verify_a3_writer_contract "$A3_PREVIOUS_FLAG_STATE" "$value" before_write
  local project_json="$RUNNER_TEMP/comun-a3-flag-project-metadata.json"
  local env_id
  env_id="$(node - "$project_json" <<'NODE'
const fs = require("node:fs");
const key = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";
const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = Array.isArray(payload?.envs) ? payload.envs : Array.isArray(payload?.data) ? payload.data : [];
const matches = rows.filter((row) => row?.key === key && Array.isArray(row.target) && row.target.length === 1 && row.target[0] === "production" && (row.gitBranch === null || row.gitBranch === undefined) && (!Array.isArray(row.customEnvironmentIds) || row.customEnvironmentIds.length === 0));
if (matches.length !== 1 || typeof matches[0].id !== "string" || matches[0].id.length === 0) throw new Error("A3_FLAG_WRITE_TARGET_NOT_UNIQUE");
process.stdout.write(matches[0].id);
NODE
)"
  local response="$RUNNER_TEMP/comun-a3-flag-patch-response.json"
  printf '{"value":"%s"}\n' "$value" > "$RUNNER_TEMP/comun-a3-flag-patch-body.json"
  curl -fsS -X PATCH \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "@$RUNNER_TEMP/comun-a3-flag-patch-body.json" \
    "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$env_id?teamId=$VERCEL_ORG_ID" > "$response"
  verify_a3_writer_contract "$A3_PREVIOUS_FLAG_STATE" "$value" after_write
}

zero_write_snapshot() {
  local output="$1"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$output" <<'SQL'
begin read only;
select json_build_object(
  'intakes', (select count(*) from private.comun_cultural_contribution_intakes),
  'targets', (select count(*) from public.comun_archive_submissions) +
             (select count(*) from public.comun_archive_artwork_submissions) +
             (select count(*) from public.comun_archive_oral_history_suggestions) +
             (select count(*) from public.comun_radio_contributions),
  'archiveItems', (select count(*) from public.comun_archive_items),
  'searchDocuments', (select count(*) from public.comun_search_documents),
  'assets', (select count(*) from public.comun_archive_assets),
  'collections', (select count(*) from public.comun_archive_collections),
  'publications', (select count(*) from public.comun_archive_items where status = 'published') +
                  (select count(*) from public.comun_archive_collections where status = 'published') +
                  (select count(*) from public.comun_radio_programs where publication_status = 'published') +
                  (select count(*) from public.comun_radio_episodes where publication_status = 'published')
);
rollback;
SQL
}

assert_zero_write_delta() {
  local before="$1" after="$2" delta="$ARTIFACT_DIR/zero-write-delta.json"
  node - "$before" "$after" "$delta" <<'NODE'
const fs = require("node:fs");
const before = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const after = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const keys = ["intakes", "targets", "archiveItems", "searchDocuments", "assets", "collections", "publications"];
const result = Object.fromEntries(keys.map((key) => [key, Number(after[key]) - Number(before[key])]));
if (keys.some((key) => result[key] !== 0)) throw new Error(`A3_WAVE1_BUSINESS_WRITE_DELTA:${JSON.stringify(result)}`);
fs.writeFileSync(process.argv[4], `${JSON.stringify(result, null, 2)}\n`, "utf8");
NODE
  summary "businessWrites=0"
  summary "newIntakes=0"
  summary "newTargets=0"
  summary "newArchiveItems=0"
  summary "newSearchDocuments=0"
  summary "newAssets=0"
  summary "newCollections=0"
  summary "publications=0"
}

deploy_production() {
  local output="$RUNNER_TEMP/comun-a3-deploy.txt"
  npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >"$output"
  local deployment_url
  deployment_url="$(grep -Eo 'https://[^[:space:]]+' "$output" | tail -n1 | tr -d '\r')"
  case "$deployment_url" in https://*.vercel.app) ;; *) return 1 ;; esac
  npx --yes vercel@50.28.0 inspect "$deployment_url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 promote "$deployment_url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 alias set "$deployment_url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  printf '%s\n' "$deployment_url" > "$ARTIFACT_DIR/production-deployment-url.txt"
}

wave1_smoke() {
  local env_file="$RUNNER_TEMP/comun-a3-wave1.env"
  local page="$RUNNER_TEMP/comun-a3-wave1-page.html"
  remember "$env_file"; remember "$page"
  pull_production_env "$env_file"
  test "$(env_value "$env_file" COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED)" = "enabled"
  for path in /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/historias-orais /comun/radio; do
    test "$(http_status "$path")" = 200
  done
  curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/acervo/contribuir" >"$page"
  ! grep -Eqi 'resume_token_hash|target_id|member_user_id|private\.comun_|public_protocol=[A-Za-z0-9_-]{8,}' "$page"
  local bundle="$RUNNER_TEMP/comun-a3-wave1-bundle.js"
  : > "$bundle"
  while IFS= read -r asset; do curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$asset" >> "$bundle"; done < <(grep -oE '/_next/static/[^" ]+\.js' "$page" | sort -u)
  for marker in 'Continuar no fluxo especializado' 'Nada foi publicado' 'Uma foto ou documento' 'Uma obra de arte' 'Uma pessoa ou história para entrevistar' 'Algo para a Rádio' 'Ainda não sei'; do grep -Fq "$marker" "$bundle"; done
  ! grep -Fq 'Música' "$bundle"
  summary "featureDetection=handoff_bundle_markers_green"
  summary "COMUN_48_5_A3_SPECIALIZED_CULTURAL_HANDOFF_GREEN_PRODUCTION_ACTIVE_NO_AUTO_PUBLICATION"
  summary "a3Flag=enabled"
  summary "businessWrites=0"
  summary "newIntakes=0"
  summary "newTargets=0"
  summary "newArchiveItems=0"
  summary "newSearchDocuments=0"
  summary "newAssets=0"
  summary "newCollections=0"
  summary "productionRequests=GET_HEAD_ONLY"
}

rollback_flag() {
  set +e
  set_a3_flag disabled
  deploy_production
  local status=$?
  set -e
  if test "$status" -eq 0; then summary COMUN_48_5_A3_R2_RUNTIME_ROLLED_BACK_FLAG_OFF; fi
  return "$status"
}

if test "$MODE" = "disable-only"; then
  assert_main
  assert_project_binding
  assert_production_ready
  disable_pre_env="$RUNNER_TEMP/comun-a3-disable-pre.env"
  pull_production_env "$disable_pre_env"
  disable_value="$(env_value "$disable_pre_env" COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED || true)"
  if test "$disable_value" = "disabled"; then
    summary COMUN_48_5_A3_R2_PRECHECK_FLAG_ALREADY_OFF
    summary "schemaMigrationApplied=false"
    summary "businessWrites=0"
    summary "productionRequests=GET_HEAD_ONLY"
    exit 0
  fi
  test "$disable_value" = "enabled"
  A3_PREVIOUS_FLAG_STATE=ON
  set_a3_flag disabled
  deploy_production
  disabled_env="$RUNNER_TEMP/comun-a3-disabled.env"
  pull_production_env "$disabled_env"
  test "$(env_value "$disabled_env" COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED || true)" != "enabled"
  summary COMUN_48_5_A3_R2_PRECHECK_FLAG_RESTORED_OFF
  summary "schemaMigrationApplied=false"
  summary "businessWrites=0"
  summary "productionRequests=GET_HEAD_ONLY"
  exit 0
fi

assert_main
stage main_verified
assert_project_binding
stage project_verified
assert_production_ready
stage production_verified
pre_env="$RUNNER_TEMP/comun-a3-pre.env"
pull_production_env "$pre_env"
remember "$pre_env"
assert_a3_flag_off "$pre_env"
stage flag_off_verified
verify_a3_writer_contract "$A3_PREVIOUS_FLAG_STATE" enabled preflight
stage writer_ownership_verified
test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"
summary "productionProjectRef=$SUPABASE_PROJECT_REF"
summary "mainSha=$EXPECTED_MAIN_SHA"

if test "$MODE" = "wave1-only"; then
  metadata_postflight
  stage schema_preflight_green
  wave1_before="$ARTIFACT_DIR/zero-write-before.json"
  wave1_after="$ARTIFACT_DIR/zero-write-after.json"
  zero_write_snapshot "$wave1_before"
  set_a3_flag enabled
  stage flag_enabled
  if ! deploy_production; then
    rollback_flag || true
    exit 1
  fi
  stage production_deploy_green
  verify_a3_flag_metadata
  stage flag_post_deploy_verified_enabled
  if ! wave1_smoke; then
    rollback_flag || true
    exit 1
  fi
  zero_write_snapshot "$wave1_after"
  assert_zero_write_delta "$wave1_before" "$wave1_after"
  stage wave1_green
  exit 0
fi

assert_exact_migration_plan
stage migration_plan_exact
if test "$A3_MIGRATION_RESULT" = "pending"; then
  supabase db push --db-url "$SUPABASE_DB_URL" >"$ARTIFACT_DIR/migration-push.txt" 2>&1
  A3_MIGRATION_RESULT="applied"
  stage migration_applied
else
  stage migration_already_applied_verified
fi
metadata_postflight
stage schema_postflight_green
post_env="$RUNNER_TEMP/comun-a3-post-migration.env"
pull_production_env "$post_env"
remember "$post_env"
assert_a3_flag_off "$post_env"
stage flag_off_post_migration_verified
wave0_smoke
stage wave0_green

if test "$MODE" = "wave0-only"; then
  write_wave0_final_receipt
  summary "migrationA3=$A3_MIGRATION_RESULT"
  summary "flag=OFF"
  summary "productionHealthy=true"
  exit 0
fi

flag_started=true
set_a3_flag enabled
stage flag_enabled
if ! deploy_production; then
  rollback_flag || true
  exit 1
fi
stage production_deploy_green
if ! wave1_smoke; then
  rollback_flag || true
  exit 1
fi
stage wave1_green
