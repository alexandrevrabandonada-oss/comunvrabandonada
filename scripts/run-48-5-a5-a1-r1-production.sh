#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
: "${A5_A1_FUNCTIONAL_ANCESTOR:?A5_A1_FUNCTIONAL_ANCESTOR is required}"
: "${A5_A1_MIGRATION:?A5_A1_MIGRATION is required}"
: "${A5_A1_MIGRATION_SHA256:?A5_A1_MIGRATION_SHA256 is required}"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

readonly TERMINAL_GREEN="COMUN_48_5_A5_A1_R1_SPECIALIZED_PROVENANCE_GREEN_PRODUCTION_ACTIVE_NO_BUSINESS_WRITES"
readonly TERMINAL_ALREADY="COMUN_48_5_A5_A1_R1_SPECIALIZED_PROVENANCE_ALREADY_APPLIED_VERIFIED_GREEN"
readonly TERMINAL_PLANNER_BRIDGE="COMUN_48_1B_R1C_EXTERNAL_LEDGER_PLANNER_BRIDGE_GREEN_ZERO_REMOTE_WRITES"
readonly CANONICAL_FUNCTIONAL_ANCESTOR="382a215e2828827596ed68bf2a7dfe1c2645361d"
readonly CANONICAL_MIGRATION="supabase/migrations/20260823003249_comun_cultural_specialized_provenance_readiness.sql"
readonly CANONICAL_MIGRATION_SHA256="771975081046474022764a8e69743cc6015ebb4a817c614719fa7d6dfc74bdfb"
readonly ARTIFACT_DIR="${COMUN_A5_A1_R1_ARTIFACT_DIR:-.ci-artifacts/48-5-a5-a1-r1-production}"
readonly EXECUTION_MODE="${A5_A1_EXECUTION_MODE:-apply}"
readonly SIDEWALK_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
readonly SIDEWALK_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
readonly SIDEWALK_MIGRATION_SHA256="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
readonly TEMP_ROOT="$(mktemp -d "${RUNNER_TEMP:-/tmp}/comun-a5-a1-r1.XXXXXX")"
A5_ALREADY_APPLIED=false
HELD_SIDEWALK_MIGRATION=""
SIDEWALK_QUARANTINED=false

mkdir -p "$ARTIFACT_DIR"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage() { printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
fail() { printf 'terminal=%s\n' "$1" > "$ARTIFACT_DIR/closeout.json"; echo "$1" >&2; exit 1; }
restore_sidewalk_migration() {
  if test "$SIDEWALK_QUARANTINED" = true; then
    test -f "$HELD_SIDEWALK_MIGRATION" || return 1
    test ! -e "$SIDEWALK_MIGRATION" || return 1
    mv "$HELD_SIDEWALK_MIGRATION" "$SIDEWALK_MIGRATION"
    SIDEWALK_QUARANTINED=false
  fi
  test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_MIGRATION_SHA256"
  test -z "$(git status --porcelain -- "$SIDEWALK_MIGRATION")"
}
cleanup() {
  local status=$?
  restore_sidewalk_migration || status=1
  rm -rf "$TEMP_ROOT"
  exit "$status"
}
trap cleanup EXIT

case "$EXECUTION_MODE" in apply|planner-bridge|verify-applied) ;; *) fail COMUN_48_1B_R1C_BLOCKED_EXECUTION_MODE;; esac

test "$SUPABASE_PROJECT_REF" = "nvmdszymrtacfehdynpg" || fail COMUN_48_5_A5_A1_R1_BLOCKED_PROJECT_REF
test "$A5_A1_FUNCTIONAL_ANCESTOR" = "$CANONICAL_FUNCTIONAL_ANCESTOR" || fail COMUN_48_5_A5_A1_R1_BLOCKED_FUNCTIONAL_ANCESTOR
test "$A5_A1_MIGRATION" = "$CANONICAL_MIGRATION" || fail COMUN_48_5_A5_A1_R1_BLOCKED_MIGRATION_PATH
test "${A5_A1_MIGRATION_SHA256,,}" = "$CANONICAL_MIGRATION_SHA256" || fail COMUN_48_5_A5_A1_R1_BLOCKED_MIGRATION_CHECKSUM_DRIFT
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_5_A5_A1_R1_BLOCKED_REMOTE_DB_URL_INVALID;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}" || fail COMUN_48_5_A5_A1_R1_BLOCKED_UNEXPECTED_SUPABASE_ACCESS_TOKEN
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || fail COMUN_48_5_A5_A1_R1_BLOCKED_UNEXPECTED_SERVICE_ROLE_KEY

assert_main_and_checksum() {
  stage main_preflight_started
  test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_5_A5_A1_R1_BLOCKED_MAIN_DRIFT
  git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_5_A5_A1_R1_BLOCKED_MAIN_DRIFT
  git merge-base --is-ancestor "$A5_A1_FUNCTIONAL_ANCESTOR" HEAD || fail COMUN_48_5_A5_A1_R1_BLOCKED_FUNCTIONAL_ANCESTOR
  local checksum
  checksum="$(sha256sum "$A5_A1_MIGRATION" | awk '{print tolower($1)}')"
  test "$checksum" = "${A5_A1_MIGRATION_SHA256,,}" || fail COMUN_48_5_A5_A1_R1_BLOCKED_MIGRATION_CHECKSUM_DRIFT
  printf '{"main":"%s","functionalAncestor":"%s","migration":"%s","migrationSha256":"%s"}\n' "$EXPECTED_MAIN_SHA" "$A5_A1_FUNCTIONAL_ANCESTOR" "$(basename "$A5_A1_MIGRATION")" "$checksum" > "$ARTIFACT_DIR/preflight.json"
  stage main_and_checksum_green
}

audit_production_deployment() {
  local raw="$TEMP_ROOT/deployments.json"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=50" > "$raw"
  A5_A1_FUNCTIONAL_ANCESTOR="$A5_A1_FUNCTIONAL_ANCESTOR" node - "$raw" "$ARTIFACT_DIR/production-deployment.json" <<'NODE'
const fs = require("node:fs");
const deployments = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).deployments ?? [];
const functional = process.env.A5_A1_FUNCTIONAL_ANCESTOR;
const candidate = deployments.find((item) => item?.readyState === "READY" && typeof item?.meta?.githubCommitSha === "string");
if (!candidate) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_PRODUCTION_CODE_NOT_COMPATIBLE");
fs.writeFileSync(process.argv[3], `${JSON.stringify({
  productionDeploymentId: candidate.uid ?? candidate.id ?? null,
  productionDeploymentCommit: candidate.meta.githubCommitSha,
  productionReady: true,
  a5A1FunctionalAncestorRequired: functional,
  a5A1FunctionalCodePresent: false,
}, null, 2)}\n`);
NODE
  git merge-base --is-ancestor "$A5_A1_FUNCTIONAL_ANCESTOR" "$(node -e "process.stdout.write(JSON.parse(require('node:fs').readFileSync('$ARTIFACT_DIR/production-deployment.json')).productionDeploymentCommit)")" 2>/dev/null || fail COMUN_48_5_A5_A1_R1_BLOCKED_PRODUCTION_CODE_NOT_COMPATIBLE
  node - "$ARTIFACT_DIR/production-deployment.json" <<'NODE'
const fs=require("node:fs"); const p=process.argv[2]; const x=JSON.parse(fs.readFileSync(p,"utf8")); x.a5A1FunctionalCodePresent=true; fs.writeFileSync(p,`${JSON.stringify(x,null,2)}\n`);
NODE
  stage production_deployment_compatible_green
}

audit_flags() {
  local project="$TEMP_ROOT/project-env.json" shared="$TEMP_ROOT/shared-env.json" env_file="$TEMP_ROOT/production.env"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$project"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_&limit=100" > "$shared"
  mkdir -p .vercel
  printf '{"orgId":"%s","projectId":"%s"}\n' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json
  npx --yes vercel@50.28.0 env pull "$env_file" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  node scripts/ci/a5-a1-r1-flag-contract.mjs --project-json "$project" --shared-json "$shared" --env-file "$env_file" --output "$ARTIFACT_DIR/flag-audit.json"
  stage cultural_flags_green
}

snapshot() {
  local phase="$1"
  local output="$ARTIFACT_DIR/${phase}-snapshot.json"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$output" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'a3MigrationApplied', exists(select 1 from supabase_migrations.schema_migrations where version='20260818120000'),
  'a4MigrationApplied', exists(select 1 from supabase_migrations.schema_migrations where version='20260819130000'),
  'a5A1MigrationCount', (select count(*) from supabase_migrations.schema_migrations where version='20260823003249'),
  'schema', json_build_object(
    'oralColumn', exists(select 1 from information_schema.columns where table_schema='public' and table_name='comun_archive_oral_history_suggestions' and column_name='private_root_archive_item_id'),
    'radioKindColumn', exists(select 1 from information_schema.columns where table_schema='public' and table_name='comun_radio_contributions' and column_name='private_root_kind'),
    'radioRootColumn', exists(select 1 from information_schema.columns where table_schema='public' and table_name='comun_radio_contributions' and column_name='private_root_archive_item_id'),
    'guardFunction', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_guard_specialized_private_root_provenance_v1'),
    'triggerCount', (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and t.tgname in ('comun_oral_suggestions_private_root_guard','comun_radio_contributions_private_root_guard')),
    'rpcCount', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('comun_link_oral_history_suggestion_private_root_v1','comun_materialize_oral_history_suggestion_private_root_v1','comun_link_radio_contribution_private_root_v1','comun_materialize_radio_contribution_private_root_v1'))
  ),
  'businessCounts', json_build_object(
    'oralHistorySuggestions',(select count(*) from public.comun_archive_oral_history_suggestions),
    'radioContributions',(select count(*) from public.comun_radio_contributions),
    'archiveItems',(select count(*) from public.comun_archive_items),
    'oralHistories',(select count(*) from public.comun_archive_oral_histories),
    'radioPrograms',(select count(*) from public.comun_radio_programs),
    'radioEpisodes',(select count(*) from public.comun_radio_episodes),
    'archiveAssets',(select count(*) from public.comun_archive_assets),
    'collections',(select count(*) from public.comun_archive_collections),
    'searchDocuments',(select count(*) from public.comun_search_documents)
  ),
  'publishedCounts', json_build_object(
    'archiveItems',(select count(*) from public.comun_archive_items where status='published'),
    'oralHistories',(select count(*) from public.comun_archive_oral_histories where publication_status='published'),
    'radioPrograms',(select count(*) from public.comun_radio_programs where publication_status='published'),
    'radioEpisodes',(select count(*) from public.comun_radio_episodes where publication_status='published')
  ),
  'fingerprints', json_build_object(
    'oralSuggestions',coalesce((select md5(string_agg(id::text,'|' order by id)) from public.comun_archive_oral_history_suggestions),md5('none')),
    'radioContributions',coalesce((select md5(string_agg(id::text,'|' order by id)) from public.comun_radio_contributions),md5('none')),
    'archiveItems',coalesce((select md5(string_agg(id::text||':'||status||':'||visibility,'|' order by id)) from public.comun_archive_items),md5('none')),
    'storageObjects',coalesce((select md5(string_agg(bucket_id||':'||name,'|' order by bucket_id,name)) from storage.objects),md5('none')),
    'publicObjects',coalesce((select md5(string_agg(c.relname||':'||c.relkind::text,'|' order by c.relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','f','p')),md5('none')),
    'storagePolicies',coalesce((select md5(string_agg(tablename||':'||policyname||':'||cmd,'|' order by tablename,policyname)) from pg_policies where schemaname='storage'),md5('none')),
    'envelopeGrants',coalesce((select md5(string_agg(role_name||':'||table_name||':'||has_table_privilege(role_name,'public.'||table_name,'SELECT')||':'||has_table_privilege(role_name,'public.'||table_name,'INSERT')||':'||has_table_privilege(role_name,'public.'||table_name,'UPDATE')||':'||has_table_privilege(role_name,'public.'||table_name,'DELETE'),'|' order by role_name,table_name)) from (values ('anon'),('authenticated'),('service_role')) r(role_name) cross join (values ('comun_archive_oral_history_suggestions'),('comun_radio_contributions')) t(table_name)),md5('none'))
  )
);
rollback;
SQL
  node - "$output" <<'NODE'
const fs=require("node:fs"); const x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
if(x.transactionReadOnly!==true||x.a3MigrationApplied!==true||x.a4MigrationApplied!==true) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_PREFLIGHT_DEPENDENCY");
const s=x.schema; const values=[s.oralColumn,s.radioKindColumn,s.radioRootColumn,s.guardFunction,s.triggerCount===2,s.rpcCount===4];
if(!values.every(Boolean)&&values.some(Boolean)) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_PARTIAL_SCHEMA");
if(Number(x.a5A1MigrationCount)>1) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_LEDGER_INCONSISTENT");
if(Number(x.a5A1MigrationCount)===1&&!values.every(Boolean)) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_PARTIAL_SCHEMA");
if(Number(x.a5A1MigrationCount)===0&&values.some(Boolean)) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_PARTIAL_SCHEMA");
NODE
}

assert_a5_schema_state() {
  node - "$ARTIFACT_DIR/pre-snapshot.json" <<'NODE'
const fs=require("node:fs"); const state=JSON.parse(fs.readFileSync(process.argv[2],"utf8")); const mode=process.env.A5_A1_EXECUTION_MODE;
const schema=Object.values(state.schema??{}); const absent=Number(state.a5A1MigrationCount)===0&&schema.every((value)=>!value); const applied=Number(state.a5A1MigrationCount)===1&&schema.every(Boolean);
if((mode==="verify-applied"&&!applied)||(mode!=="verify-applied"&&!absent)) throw new Error("COMUN_48_5_A5_A1_R1_BLOCKED_A5_SCHEMA_STATE");
NODE
  if test "$EXECUTION_MODE" = verify-applied; then A5_ALREADY_APPLIED=true; stage a5_schema_applied_green; else stage a5_schema_absent_green; fi
}

assert_external_ledger_bridge() {
  stage external_ledger_bridge_started
  node scripts/solo/validate-sidewalk-external-ledger-exception.mjs "$SIDEWALK_EXCEPTION"
  test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_MIGRATION_SHA256" || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_EXCEPTION_CHECKSUM_DRIFT
  node scripts/solo/verify-sidewalk-external-ledger-evolved-scope.mjs
  node - ".ci-artifacts/a4-external-ledger-e1/bridge.json" "$ARTIFACT_DIR/external-ledger-bridge.json" <<'NODE'
const fs=require("node:fs");
const source=process.argv[2]; const destination=process.argv[3]; const result=JSON.parse(fs.readFileSync(source,"utf8")); const current=result.current??{};
const ok=result.result==="COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN"&&result.historicalExactScopedProof===true&&result.releaseOwnedSecurityInvariantsPreserved===true&&result.grantStateSafeOrMoreRestrictive===true&&result.serviceRoleOperational===true&&result.zeroRemoteWrites===true&&current.transactionReadOnly===true&&current.ledgerExact===true&&current.requiredStatesPresent===true&&current.missingColumns?.length===0&&current.clientCrudClosed===true&&current.serviceRoleRequiredPrivileges===true&&current.legacyUnsafeCount===0&&current.migrationShaExact===true;
if(!ok) throw new Error("COMUN_48_1B_R1C_EXTERNAL_LEDGER_REMOTE_PROOF_BLOCKED");
fs.copyFileSync(source,destination);
NODE
  stage external_ledger_bridge_green
}

quarantine_sidewalk_for_cli_planning() {
  test "$SIDEWALK_QUARANTINED" = false || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_QUARANTINE_STATE_INVALID
  test -f "$SIDEWALK_MIGRATION" || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_MIGRATION_MISSING
  HELD_SIDEWALK_MIGRATION="$TEMP_ROOT/20260724233256_comun_sidewalk_operational_hardening.sql"
  test ! -e "$HELD_SIDEWALK_MIGRATION" || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_QUARANTINE_COLLISION
  mv "$SIDEWALK_MIGRATION" "$HELD_SIDEWALK_MIGRATION"
  SIDEWALK_QUARANTINED=true
}

run_reconciled_cli_plan() {
  local list="$1" plan="$2" status=0
  quarantine_sidewalk_for_cli_planning
  supabase migration list --db-url "$SUPABASE_DB_URL" > "$list" 2>&1 || status=$?
  if test "$status" = 0; then
    supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$plan" 2>&1 || status=$?
  fi
  restore_sidewalk_migration || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_RESTORE_FAILED
  test "$status" = 0 || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_PLANNER_BLOCKED
}

assert_exact_plan() {
  local plan="$ARTIFACT_DIR/migration-plan.txt" list="$ARTIFACT_DIR/migration-list.txt"
  run_reconciled_cli_plan "$list" "$plan"
  mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$plan" | sort -u || true)
  local before_count
  before_count="$(node -e "process.stdout.write(String(JSON.parse(require('node:fs').readFileSync('$ARTIFACT_DIR/pre-snapshot.json')).a5A1MigrationCount))")"
  if test "$before_count" = 1; then
    A5_ALREADY_APPLIED=true
    test "${#planned[@]}" -eq 0 || fail COMUN_48_5_A5_A1_R1_BLOCKED_NONEXACT_MIGRATION_PLAN
  else
    test "$before_count" = 0 || fail COMUN_48_5_A5_A1_R1_BLOCKED_LEDGER_INCONSISTENT
    test "${#planned[@]}" -eq 1 || fail COMUN_48_5_A5_A1_R1_BLOCKED_NONEXACT_MIGRATION_PLAN
    test "${planned[0]}" = "$(basename "$A5_A1_MIGRATION")" || fail COMUN_48_5_A5_A1_R1_BLOCKED_NONEXACT_MIGRATION_PLAN
  fi
  stage exact_migration_plan_green
}

apply_exact_migration() {
  if test "$A5_ALREADY_APPLIED" = true; then stage migration_apply_already_applied; return; fi
  stage migration_apply_started
  local status=0
  quarantine_sidewalk_for_cli_planning
  supabase db push --db-url "$SUPABASE_DB_URL" > "$TEMP_ROOT/migration-apply.log" 2>&1 || status=$?
  restore_sidewalk_migration || fail COMUN_48_1B_R1C_EXTERNAL_LEDGER_RESTORE_FAILED
  test "$status" = 0 || fail COMUN_48_5_A5_A1_R1_BLOCKED_MIGRATION_APPLY_FAILED
  stage migration_apply_green
}

postflight_schema_and_security() {
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/schema-postflight.json" <<'SQL'
begin read only;
with rpc as (
  select p.oid,p.proname,p.prosecdef,p.proconfig
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('comun_link_oral_history_suggestion_private_root_v1','comun_materialize_oral_history_suggestion_private_root_v1','comun_link_radio_contribution_private_root_v1','comun_materialize_radio_contribution_private_root_v1')
)
select json_build_object(
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'migrationAppliedExactlyOnce',(select count(*)=1 from supabase_migrations.schema_migrations where version='20260823003249'),
  'columnsPresent',(select count(*)=3 from information_schema.columns where table_schema='public' and ((table_name='comun_archive_oral_history_suggestions' and column_name='private_root_archive_item_id') or (table_name='comun_radio_contributions' and column_name in ('private_root_kind','private_root_archive_item_id')))),
  'pairConstraint',(select count(*)=1 from pg_constraint where conname='comun_radio_contributions_private_root_pair_check' and convalidated),
  'indexesPresent',(select count(*)=2 from pg_indexes where schemaname='public' and indexname in ('comun_oral_suggestions_private_root_idx','comun_radio_contributions_private_root_idx')),
  'triggersEnabled',(select count(*)=2 from pg_trigger where tgname in ('comun_oral_suggestions_private_root_guard','comun_radio_contributions_private_root_guard') and tgenabled='O'),
  'guardSecurityInvoker',(select count(*)=1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_guard_specialized_private_root_provenance_v1' and p.prosecdef=false and coalesce(array_to_string(p.proconfig,','),'') like '%search_path=pg_catalog, public%'),
  'rpcCount',(select count(*) from rpc),
  'rpcsSecurityInvoker',(select count(*)=4 and bool_and(prosecdef=false) from rpc),
  'rpcsSearchPath',(select count(*)=4 and bool_and(coalesce(array_to_string(proconfig,','),'') like '%search_path=pg_catalog, public%') from rpc),
  'publicExecuteClosed',(select count(*)=4 and bool_and(not has_function_privilege('public',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE') and not has_function_privilege('authenticated',oid,'EXECUTE')) from rpc),
  'serviceRoleExecute',(select count(*)=4 and bool_and(has_function_privilege('service_role',oid,'EXECUTE')) from rpc),
  'foreignKeysRestrict',(select count(*)=2 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname='public' and ((t.relname='comun_archive_oral_history_suggestions' and pg_get_constraintdef(c.oid,true) like '%(private_root_archive_item_id) REFERENCES comun_archive_items(id) ON DELETE RESTRICT%') or (t.relname='comun_radio_contributions' and pg_get_constraintdef(c.oid,true) like '%(private_root_archive_item_id) REFERENCES comun_archive_items(id) ON DELETE RESTRICT%'))),
  'legacyBackfillFalse',(select count(*)=0 from public.comun_archive_oral_history_suggestions where private_root_archive_item_id is not null) and (select count(*)=0 from public.comun_radio_contributions where private_root_kind is not null or private_root_archive_item_id is not null),
  'clientCrudClosed',(select bool_and(not has_table_privilege(role_name,'public.'||table_name,'SELECT') and not has_table_privilege(role_name,'public.'||table_name,'INSERT') and not has_table_privilege(role_name,'public.'||table_name,'UPDATE') and not has_table_privilege(role_name,'public.'||table_name,'DELETE')) from (values ('anon'),('authenticated')) r(role_name) cross join (values ('comun_archive_oral_history_suggestions'),('comun_radio_contributions')) t(table_name))
);
rollback;
SQL
  node - "$ARTIFACT_DIR/schema-postflight.json" <<'NODE'
const fs=require("node:fs"); const x=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
for(const k of ['transactionReadOnly','migrationAppliedExactlyOnce','columnsPresent','pairConstraint','indexesPresent','triggersEnabled','guardSecurityInvoker','rpcsSecurityInvoker','rpcsSearchPath','publicExecuteClosed','serviceRoleExecute','foreignKeysRestrict','legacyBackfillFalse','clientCrudClosed']) if(x[k]!==true) throw new Error(`COMUN_48_5_A5_A1_R1_BLOCKED_SECURITY_OR_SCHEMA:${k}`);
if(Number(x.rpcCount)!==4) throw new Error('COMUN_48_5_A5_A1_R1_BLOCKED_PARTIAL_SCHEMA');
NODE
  cp "$ARTIFACT_DIR/schema-postflight.json" "$ARTIFACT_DIR/security-postflight.json"
}

compare_business_delta() {
  snapshot post
  node - "$ARTIFACT_DIR/pre-snapshot.json" "$ARTIFACT_DIR/post-snapshot.json" "$ARTIFACT_DIR/business-delta.json" <<'NODE'
const fs=require("node:fs"); const before=JSON.parse(fs.readFileSync(process.argv[2],"utf8")); const after=JSON.parse(fs.readFileSync(process.argv[3],"utf8"));
for(const key of ['businessCounts','publishedCounts','fingerprints']) if(JSON.stringify(before[key])!==JSON.stringify(after[key])) throw new Error('COMUN_48_5_A5_A1_R1_BLOCKED_BUSINESS_DELTA');
if(before.a5A1MigrationCount!==0 && before.a5A1MigrationCount!==1) throw new Error('COMUN_48_5_A5_A1_R1_BLOCKED_LEDGER_INCONSISTENT');
if(after.a5A1MigrationCount!==1) throw new Error('COMUN_48_5_A5_A1_R1_BLOCKED_LEDGER_INCONSISTENT');
const output={archiveItemsDelta:0,oralHistoryDelta:0,radioProgramDelta:0,radioEpisodeDelta:0,assetDelta:0,collectionDelta:0,searchDelta:0,publishedDelta:0,privateRootsCreated:0,publicAssetPromotions:0,SearchWrites:0,publications:0,ProductionBusinessWrites:0,legacyBackfill:false}; fs.writeFileSync(process.argv[4],`${JSON.stringify(output,null,2)}\n`);
NODE
}

assert_post_apply_plan_empty() {
  run_reconciled_cli_plan "$ARTIFACT_DIR/migration-list-postapply.txt" "$ARTIFACT_DIR/migration-plan-postapply.txt"
  if grep -qE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/migration-plan-postapply.txt"; then fail COMUN_48_5_A5_A1_R1_BLOCKED_LEDGER_INCONSISTENT; fi
}

readonly_smokes() {
  local output="$ARTIFACT_DIR/smoke-summary.json" body="$TEMP_ROOT/smoke.html" route status head
  printf '{"methods":"GET_HEAD_ONLY","routes":[' > "$output"
  local first=true
  for route in /comun /comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir; do
    status="$(curl -L -sS -o "$body" -w '%{http_code}' --retry 4 --retry-delay 2 "$COMUN_BASE_URL$route")"
    head="$(curl -L -sS -I -o /dev/null -w '%{http_code}' --retry 4 --retry-delay 2 "$COMUN_BASE_URL$route")"
    test "$status" = 200 && test "$head" = 200 || fail COMUN_48_5_A5_A1_R1_BLOCKED_SMOKE_HTTP
    ! grep -Eqi 'resume_token_hash|member_user_id|private_root_archive_item_id|private_root_kind|sqlstate|service_role' "$body" || fail COMUN_48_5_A5_A1_R1_BLOCKED_PRIVACY_SMOKE
    test "$first" = true || printf ',' >> "$output"; first=false
    printf '{"route":"%s","get":200,"head":200}' "$route" >> "$output"
  done
  printf '],"privacyMarkers":"clear","businessWrites":0}\n' >> "$output"
}

write_closeout() {
  local terminal="$1"
  printf '{"terminal":"%s","main":"%s","migration":"%s","migrationSha256":"%s","legacyBackfill":false,"ProductionBusinessWrites":0,"ProductionSchemaWrites":"1_migration_only","ProductionEnvWrites":0,"autoPublication":false,"privateRootsCreated":0,"publications":0,"SearchWrites":0,"publicAssetPromotions":0}\n' \
    "$terminal" "$EXPECTED_MAIN_SHA" "$(basename "$A5_A1_MIGRATION")" "${A5_A1_MIGRATION_SHA256,,}" > "$ARTIFACT_DIR/closeout.json"
  summary "$terminal"
}

write_planner_bridge_closeout() {
  printf '{"terminal":"%s","main":"%s","migration":"%s","migrationSha256":"%s","sidewalkCliHistory":"absent","sidewalkExternalLedger":"applied_exact_scoped","planned":["%s"],"ProductionBusinessWrites":0,"ProductionSchemaWrites":0,"ProductionEnvWrites":0,"zeroRemoteWrites":true}\n' \
    "$TERMINAL_PLANNER_BRIDGE" "$EXPECTED_MAIN_SHA" "$(basename "$A5_A1_MIGRATION")" "${A5_A1_MIGRATION_SHA256,,}" "$(basename "$A5_A1_MIGRATION")" > "$ARTIFACT_DIR/closeout.json"
  summary "$TERMINAL_PLANNER_BRIDGE"
}

stage initialized
assert_main_and_checksum
audit_production_deployment
audit_flags
snapshot pre
assert_a5_schema_state
assert_external_ledger_bridge
assert_exact_plan
if test "$EXECUTION_MODE" = planner-bridge; then
  write_planner_bridge_closeout
  stage terminal_planner_bridge_green
  exit 0
fi
apply_exact_migration
postflight_schema_and_security
compare_business_delta
assert_post_apply_plan_empty
assert_external_ledger_bridge
readonly_smokes
if test "$EXECUTION_MODE" = verify-applied; then write_closeout "$TERMINAL_GREEN"; elif test "$A5_ALREADY_APPLIED" = true; then write_closeout "$TERMINAL_ALREADY"; else write_closeout "$TERMINAL_GREEN"; fi
stage terminal_green
