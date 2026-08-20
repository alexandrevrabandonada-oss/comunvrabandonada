#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-wave0-only}"
test "$MODE" = wave0-only
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

test "$SUPABASE_PROJECT_REF" = nvmdszymrtacfehdynpg
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) echo COMUN_48_5_A4_R2_REMOTE_DB_URL_INVALID; exit 1;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}"
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

ARTIFACT_DIR="${COMUN_A4_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-r2-wave0}"
EXTERNAL_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
EXTERNAL_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
EXTERNAL_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"
mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage() { printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
stage initialized

ENV_FILE="$TEMP_ROOT/comun-a4-wave0-production.env"
PROJECT_JSON="$TEMP_ROOT/comun-a4-wave0-project-env.json"
SHARED_JSON="$TEMP_ROOT/comun-a4-wave0-shared-env.json"
cleanup() { rm -f "$ENV_FILE" "$PROJECT_JSON" "$SHARED_JSON"; }
trap cleanup EXIT

assert_main() {
  stage assert_main_started
  test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
  git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"
  git merge-base --is-ancestor "$A4_FUNCTIONAL_ANCESTOR" HEAD
  test "$(sha256sum "$A4_MIGRATION" | awk '{print $1}')" = "$A4_MIGRATION_SHA256"
  stage main_and_migration_verified
  summary "main=$EXPECTED_MAIN_SHA"
  summary "a4FunctionalAncestor=$A4_FUNCTIONAL_ANCESTOR"
  summary "a4MigrationSha256=$A4_MIGRATION_SHA256"
}

assert_production_ready() {
  local response="$TEMP_ROOT/comun-a4-production-deployments.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=50" > "$response"
  EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$response" <<'NODE'
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expected = process.env.EXPECTED_MAIN_SHA;
const ready = (body.deployments ?? []).some((deployment) => deployment?.readyState === "READY" && deployment?.meta?.githubCommitSha === expected);
if (!ready) throw new Error("COMUN_48_5_A4_R2_PRODUCTION_NOT_READY_FOR_MAIN");
NODE
  summary "productionReady=true"
}

audit_flags() {
  local phase="$1"
  stage "flag_audit_${phase}_started"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$SHARED_JSON"
  mkdir -p .vercel
  node -e 'require("node:fs").writeFileSync(".vercel/project.json", JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  node scripts/ci/a4-wave0-flag-contract.mjs \
    --project-json "$PROJECT_JSON" --shared-json "$SHARED_JSON" --env-file "$ENV_FILE" \
    --output "$ARTIFACT_DIR/flag-audit-${phase}.json"
  stage "flag_audit_${phase}_green"
  summary "a4Flag=OFF"
  summary "a3Flag=ON_preserved"
}

capture_snapshot() {
  local phase="$1"
  local output="$ARTIFACT_DIR/${phase}-snapshot.json"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$output" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'a3MigrationApplied', exists(select 1 from supabase_migrations.schema_migrations where version = '20260818120000'),
  'a4MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version = '20260819130000'),
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
  'businessCounts', json_build_object(
    'intakes', (select count(*) from private.comun_cultural_contribution_intakes),
    'archiveSubmissions', (select count(*) from public.comun_archive_submissions),
    'artworkSubmissions', (select count(*) from public.comun_archive_artwork_submissions),
    'radioContributions', (select count(*) from public.comun_radio_contributions),
    'archiveItems', (select count(*) from public.comun_archive_items),
    'archiveAssets', (select count(*) from public.comun_archive_assets),
    'collections', (select count(*) from public.comun_archive_collections),
    'searchDocuments', (select count(*) from public.comun_search_documents),
    'publishedItems', (select count(*) from public.comun_archive_items where status = 'published')
  ),
  'publicObjectCount', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m','f','p')),
  'publicFunctionCount', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'storageBucketCount', (select count(*) from storage.buckets),
  'storagePolicyFingerprint', coalesce((select md5(string_agg(format('%s.%s.%s.%s.%s.%s', schemaname, tablename, policyname, roles, cmd, coalesce(qual,'') || coalesce(with_check,'')), '|' order by schemaname, tablename, policyname)) from pg_policies where schemaname = 'storage'), md5('none')),
  'targetRlsFingerprint', coalesce((select md5(string_agg(format('%s:%s:%s', c.relname, c.relrowsecurity, c.relforcerowsecurity), '|' order by c.relname)) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('comun_archive_submissions','comun_archive_artwork_submissions','comun_radio_contributions')), md5('none')),
  'targetTablesPresent', (select count(*) = 3 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('comun_archive_submissions','comun_archive_artwork_submissions','comun_radio_contributions'))
);
rollback;
SQL
  node - "$output" <<'NODE'
const fs = require("node:fs");
const state = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (state.transactionReadOnly !== true) throw new Error("COMUN_48_5_A4_R2_SNAPSHOT_NOT_READ_ONLY");
if (state.a3MigrationApplied !== true || state.targetTablesPresent !== true) throw new Error("COMUN_48_5_A4_R2_DEPENDENCY_MISSING");
NODE
  stage "snapshot_${phase}_green"
}

assert_exact_pending_plan() {
  node scripts/solo/validate-sidewalk-external-ledger-exception.mjs "$EXTERNAL_EXCEPTION"
  test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"
  local held="$TEMP_ROOT/comun-a4-external-ledger.sql"
  mv "$EXTERNAL_MIGRATION" "$held"
  restore_external() { test ! -e "$held" || mv "$held" "$EXTERNAL_MIGRATION"; test "$(sha256sum "$EXTERNAL_MIGRATION" | awk '{print $1}')" = "$EXTERNAL_SHA256"; }
  trap restore_external EXIT
  local plan="$ARTIFACT_DIR/migration-plan.txt"
  supabase migration list --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/migration-list.txt" 2>&1
  supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$plan" 2>&1
  mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$plan" | sort -u || true)
  test "${#planned[@]}" -eq 1
  test "${planned[0]}" = "$(basename "$A4_MIGRATION")"
  if grep -Eqi -- '--include-all|migration repair|db reset|seed' "$plan"; then
    echo COMUN_48_5_A4_R2_UNSAFE_MIGRATION_PLAN
    exit 1
  fi
  printf '%s\n' 'result=exact_a4_pending' "planned=${planned[0]}" > "$ARTIFACT_DIR/migration-plan.json"
  stage migration_plan_exact_a4_pending
  summary "migrationPlan=exact_a4_pending"
}

assert_external_ledger_bridge() {
  stage external_ledger_bridge_started
  node scripts/solo/verify-sidewalk-external-ledger-evolved-scope.mjs
  node - "$ARTIFACT_DIR/external-ledger-bridge.json" <<'NODE'
const fs=require('node:fs'); const source='.ci-artifacts/a4-external-ledger-e1/bridge.json'; const x=JSON.parse(fs.readFileSync(source,'utf8'));
const c=x.current||{}; if(x.result!=='COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN'||x.historicalExactScopedProof!==true||x.releaseOwnedSecurityInvariantsPreserved!==true||x.grantStateSafeOrMoreRestrictive!==true||x.serviceRoleOperational!==true||x.zeroRemoteWrites!==true||c.transactionReadOnly!==true||c.ledgerExact!==true||c.requiredStatesPresent!==true||c.missingColumns?.length!==0||c.clientCrudClosed!==true||c.serviceRoleRequiredPrivileges!==true||c.legacyUnsafeCount!==0||c.migrationShaExact!==true) throw new Error('COMUN_48_5_A4_R2_EXTERNAL_LEDGER_BRIDGE_BLOCKED_FLAG_OFF'); fs.copyFileSync(source,process.argv[2]);
NODE
  stage external_ledger_bridge_green
  summary externalLedgerBridge=GREEN
  summary externalLedgerZeroWrites=true
}

apply_a4() {
  stage migration_apply_started
  supabase db push --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/migration-apply.log" 2>&1
  stage migration_apply_finished
  summary "migrationApplied=20260819130000_comun_cultural_progressive_rights.sql"
}

metadata_postflight() {
  local output="$ARTIFACT_DIR/schema-postflight.json"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$output" <<'SQL'
begin read only;
with expected(table_name, column_name, required) as (
  values
    ('comun_archive_submissions','rights_basis',true),('comun_archive_submissions','publication_scope',true),('comun_archive_submissions','reuse_permission',true),('comun_archive_submissions','license_code',false),('comun_archive_submissions','rights_state',true),('comun_archive_submissions','rights_contract_version',false),('comun_archive_submissions','rights_declared_at',false),
    ('comun_archive_artwork_submissions','authorship_basis',true),('comun_archive_artwork_submissions','publication_scope',true),('comun_archive_artwork_submissions','reuse_permission',true),('comun_archive_artwork_submissions','license_code',false),('comun_archive_artwork_submissions','identity_preference',true),('comun_archive_artwork_submissions','rights_state',true),('comun_archive_artwork_submissions','rights_contract_version',false),('comun_archive_artwork_submissions','rights_declared_at',false),
    ('comun_radio_contributions','voice_source',true),('comun_radio_contributions','material_source',true),('comun_radio_contributions','publication_scope',true),('comun_radio_contributions','reuse_permission',true),('comun_radio_contributions','license_code',false),('comun_radio_contributions','identity_preference',true),('comun_radio_contributions','rights_state',true),('comun_radio_contributions','rights_contract_version',false),('comun_radio_contributions','rights_declared_at',false)
), actual as (
  select table_name, column_name, is_nullable = 'NO' as required_not_null from information_schema.columns where table_schema = 'public' and table_name in ('comun_archive_submissions','comun_archive_artwork_submissions','comun_radio_contributions') and column_name in (select column_name from expected)
), expected_defaults as (
  select count(*) = 15 as ok from information_schema.columns c join expected e using (table_name, column_name) where c.table_schema = 'public' and e.required and c.column_default is not null
)
select json_build_object(
      'transactionReadOnly', current_setting('transaction_read_only') = 'on',
      'migrationAppliedExactlyOnce', (select count(*) = 1 from supabase_migrations.schema_migrations where version = '20260819130000'),
      'a4MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version = '20260819130000'),
  'columnsExact', (select count(*) = 24 from actual),
  'requiredColumnsNotNull', (select count(*) = 15 from actual a join expected e using (table_name, column_name) where e.required and a.required_not_null),
  'requiredColumnsHaveDefaults', (select ok from expected_defaults),
  'licenseConstraintsExact', (select count(*) = 3 from pg_constraint where conname in ('comun_archive_submissions_a4_license_check','comun_archive_artwork_submissions_a4_license_check','comun_radio_contributions_a4_license_check')),
  'aclClosedToClients', (select bool_and(not has_table_privilege(role_name, 'public.' || table_name, 'SELECT') and not has_table_privilege(role_name, 'public.' || table_name, 'INSERT') and not has_table_privilege(role_name, 'public.' || table_name, 'UPDATE') and not has_table_privilege(role_name, 'public.' || table_name, 'DELETE')) from (values ('anon'),('authenticated')) r(role_name) cross join (values ('comun_archive_submissions'),('comun_archive_artwork_submissions'),('comun_radio_contributions')) t(table_name)),
  'serviceRoleCanOperate', (select bool_and(has_table_privilege('service_role', 'public.' || table_name, 'SELECT') and has_table_privilege('service_role', 'public.' || table_name, 'INSERT') and has_table_privilege('service_role', 'public.' || table_name, 'UPDATE') and has_table_privilege('service_role', 'public.' || table_name, 'DELETE')) from (values ('comun_archive_submissions'),('comun_archive_artwork_submissions'),('comun_radio_contributions')) t(table_name)),
  'rightsBackfillZero', ((select count(*) from public.comun_archive_submissions where rights_basis <> 'not_declared' or publication_scope <> 'review_only' or reuse_permission <> 'not_defined' or license_code is not null or rights_state <> 'rights_incomplete' or rights_contract_version is not null or rights_declared_at is not null) = 0 and (select count(*) from public.comun_archive_artwork_submissions where authorship_basis <> 'not_declared' or publication_scope <> 'review_only' or reuse_permission <> 'not_defined' or license_code is not null or identity_preference <> 'not_declared' or rights_state <> 'rights_incomplete' or rights_contract_version is not null or rights_declared_at is not null) = 0 and (select count(*) from public.comun_radio_contributions where voice_source <> 'not_declared' or material_source <> 'not_declared' or publication_scope <> 'review_only' or reuse_permission <> 'not_defined' or license_code is not null or identity_preference <> 'not_declared' or rights_state <> 'rights_incomplete' or rights_contract_version is not null or rights_declared_at is not null) = 0),
  'targetRlsFingerprint', coalesce((select md5(string_agg(format('%s:%s:%s', c.relname, c.relrowsecurity, c.relforcerowsecurity), '|' order by c.relname)) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('comun_archive_submissions','comun_archive_artwork_submissions','comun_radio_contributions')), md5('none')),
  'publicObjectCount', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m','f','p')),
  'publicFunctionCount', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'storageBucketCount', (select count(*) from storage.buckets),
  'storagePolicyFingerprint', coalesce((select md5(string_agg(format('%s.%s.%s.%s.%s.%s', schemaname, tablename, policyname, roles, cmd, coalesce(qual,'') || coalesce(with_check,'')), '|' order by schemaname, tablename, policyname)) from pg_policies where schemaname = 'storage'), md5('none')),
  'publicAssetWrites', 0,
  'searchWrites', 0,
  'publicationsCreated', 0
);
rollback;
SQL
  node - "$ARTIFACT_DIR/before-snapshot.json" "$output" <<'NODE'
const fs = require("node:fs");
const before = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const after = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
for (const key of ["transactionReadOnly", "migrationAppliedExactlyOnce", "columnsExact", "requiredColumnsNotNull", "requiredColumnsHaveDefaults", "licenseConstraintsExact", "aclClosedToClients", "serviceRoleCanOperate", "rightsBackfillZero"]) {
  if (after[key] !== true && !(key === "migrationAppliedExactlyOnce" && after[key] === true)) throw new Error(`COMUN_48_5_A4_R2_POSTFLIGHT_BLOCKED:${key}`);
}
for (const key of ["publicObjectCount", "publicFunctionCount", "storageBucketCount", "storagePolicyFingerprint", "targetRlsFingerprint"]) {
  if (after[key] !== before[key]) throw new Error(`COMUN_48_5_A4_R2_UNEXPECTED_SCHEMA_DRIFT:${key}`);
}
if (after.publicAssetWrites !== 0 || after.searchWrites !== 0 || after.publicationsCreated !== 0) throw new Error("COMUN_48_5_A4_R2_UNEXPECTED_BUSINESS_WRITE");
if (after.migrationAppliedExactlyOnce !== true || Number(after.a4MigrationCount ?? 1) !== 1) throw new Error("COMUN_48_5_A4_R2_MIGRATION_NOT_EXACTLY_ONCE");
NODE
  stage schema_postflight_green
  summary "A4_SCHEMA_READY_FLAG_OFF"
  summary "businessWrites=0"
  summary "fixturesCreated=0"
  summary "publicationsCreated=0"
  summary "publicAssetWrites=0"
  summary "searchWrites=0"
}

compare_business_counts() {
  node - "$ARTIFACT_DIR/before-snapshot.json" "$ARTIFACT_DIR/after-snapshot.json" <<'NODE'
const fs = require("node:fs");
const before = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const after = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (JSON.stringify(before.businessCounts) !== JSON.stringify(after.businessCounts)) throw new Error("COMUN_48_5_A4_R2_BUSINESS_COUNTS_CHANGED");
if (before.a4MigrationCount !== 0 || after.a4MigrationCount !== 1 || after.migrationCount !== before.migrationCount + 1) throw new Error("COMUN_48_5_A4_R2_MIGRATION_HISTORY_DRIFT");
NODE
  summary "businessCountDelta=0"
  stage business_counts_unchanged
}

http_status() { curl -L -sS -o /dev/null -w '%{http_code}' --retry 6 --retry-delay 2 "$COMUN_BASE_URL$1"; }
http_head_status() { curl -L -sS -I -o /dev/null -w '%{http_code}' --retry 6 --retry-delay 2 "$COMUN_BASE_URL$1"; }

readonly_smoke() {
  local routes=(
    /comun/acervo
    /comun/acervo/contribuir
    /comun/acervo/arte
    /comun/acervo/arte/contribuir
    /comun/acervo/historias-orais
    /comun/acervo/historias-orais/contribuir
    /comun/radio
    /comun/radio/contribuir
  )
  local body="$TEMP_ROOT/comun-a4-wave0-smoke.html"
  for route in "${routes[@]}"; do
    test "$(http_status "$route")" = 200
    test "$(http_head_status "$route")" = 200
    curl -L -fsS --retry 6 --retry-delay 2 "$COMUN_BASE_URL$route" > "$body"
    ! grep -Eqi 'resume_token_hash|member_user_id|target_id|rights_contract_version|rights_declared_at|private\.comun_|sqlstate|supabase_service_role|service_role_key' "$body"
  done
  summary "smokeRoutes=8"
  summary "smokeMethods=GET_HEAD_ONLY"
  summary "privacyMarkers=clear"
  stage readonly_smoke_green
}

assert_main
assert_production_ready
audit_flags preflight
capture_snapshot before
assert_external_ledger_bridge
assert_exact_pending_plan
apply_a4
capture_snapshot after
metadata_postflight
compare_business_counts
audit_flags postflight
assert_production_ready
readonly_smoke
summary COMUN_48_5_A4_R2_SCHEMA_GREEN_PROGRESSIVE_RIGHTS_FLAG_OFF
stage terminal_green
