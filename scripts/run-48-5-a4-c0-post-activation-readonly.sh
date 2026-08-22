#!/usr/bin/env bash
set -Eeuo pipefail

# C0 is deliberately a production read-only verifier. Keep operational writes out.
: "${EXPECTED_MAIN_SHA:?}" "${EXPECTED_VERIFIER_SHA:?}" "${SUPABASE_DB_URL:?}" "${SUPABASE_PROJECT_REF:?}" "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}" "${COMUN_BASE_URL:?}"
test "$SUPABASE_PROJECT_REF" = nvmdszymrtacfehdynpg
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) exit 2;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}"; test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

ARTIFACT_DIR="${COMUN_A4_C0_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-c0}"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"; mkdir -p "$ARTIFACT_DIR"
PROJECT_JSON="$TEMP_ROOT/project.json"; SHARED_JSON="$TEMP_ROOT/shared.json"; ENV_FILE="$TEMP_ROOT/production.env"
summary(){ printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage(){ printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
cleanup(){ rm -f "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE" "$TEMP_ROOT/body.html"; }
trap cleanup EXIT

assert_canonical_state(){
  test "$(git rev-parse HEAD)" = "$EXPECTED_VERIFIER_SHA"
  git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"
  test "$(sha256sum supabase/migrations/20260819130000_comun_cultural_progressive_rights.sql | awk '{print $1}')" = 43b7b966b55c8429f021def0c60b80979a0110de27e39de6dc553ef97e891519
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=50" > "$TEMP_ROOT/deployments.json"
  EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$TEMP_ROOT/deployments.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!(x.deployments??[]).some((d)=>d?.readyState==='READY'&&d?.meta?.githubCommitSha===process.env.EXPECTED_MAIN_SHA))throw new Error('A4_C0_CANONICAL_PRODUCTION_DEPLOYMENT_NOT_READY');
NODE
  stage canonical_state_green
}

audit_flags(){
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$SHARED_JSON"
  mkdir -p .vercel; printf '{"orgId":"%s","projectId":"%s"}' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  node scripts/ci/a4-flag-writer-contract.mjs --phase wave1-post --project-json "$PROJECT_JSON" --shared-json "$SHARED_JSON" --env-file "$ENV_FILE" --output "$ARTIFACT_DIR/flags.json"
  node - "$ARTIFACT_DIR/flags.json" <<'NODE'
const x=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));
if(x.currentState!=='ON'||x.projectMatches!==1||x.sharedMatches!==0||x.a4Metadata?.type!=='encrypted'||JSON.stringify(x.a4Metadata?.target)!=='["production"]')throw new Error('A4_C0_A4_FLAG_DRIFT');
if(x.a3State!=='ON'||x.a3Metadata?.type!=='encrypted'||JSON.stringify(x.a3Metadata?.target)!=='["production"]')throw new Error('A4_C0_A3_FLAG_DRIFT');
NODE
  stage flags_green
}

schema_baseline(){
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/schema-baseline.json" <<'SQL'
begin read only;
with targets(t) as (values ('comun_archive_submissions'),('comun_archive_artwork_submissions'),('comun_radio_contributions')),
required(t,c) as (values
('comun_archive_submissions','rights_basis'),('comun_archive_submissions','publication_scope'),('comun_archive_submissions','reuse_permission'),('comun_archive_submissions','rights_state'),
('comun_archive_artwork_submissions','authorship_basis'),('comun_archive_artwork_submissions','publication_scope'),('comun_archive_artwork_submissions','reuse_permission'),('comun_archive_artwork_submissions','identity_preference'),('comun_archive_artwork_submissions','rights_state'),
('comun_radio_contributions','voice_source'),('comun_radio_contributions','material_source'),('comun_radio_contributions','publication_scope'),('comun_radio_contributions','reuse_permission'),('comun_radio_contributions','identity_preference'),('comun_radio_contributions','rights_state')),
actual as (select r.t,r.c,c.is_nullable='NO' as not_null,c.column_default is not null as has_default from required r join information_schema.columns c on c.table_schema='public' and c.table_name=r.t and c.column_name=r.c)
select json_build_object(
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'a4MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260819130000'),
  'requiredSchemaExact',(select count(*)=15 and bool_and(not_null and has_default) from actual),
  'targetRlsEnabled',(select bool_and(c.relrowsecurity) from targets t join pg_class c on c.oid=('public.'||t.t)::regclass),
  'clientCrudClosed',(select bool_and(not has_table_privilege(r,'public.'||t,'select') and not has_table_privilege(r,'public.'||t,'insert') and not has_table_privilege(r,'public.'||t,'update') and not has_table_privilege(r,'public.'||t,'delete')) from (values ('anon'),('authenticated')) x(r) cross join targets),
  'serviceRoleRequiredPrivileges',(select bool_and(has_table_privilege('service_role','public.'||t,'select') and has_table_privilege('service_role','public.'||t,'insert') and has_table_privilege('service_role','public.'||t,'update')) from targets),
  'legacyRightsNonInferred',((select count(*) from public.comun_archive_submissions where rights_contract_version is not null or rights_declared_at is not null)=0 and (select count(*) from public.comun_archive_artwork_submissions where rights_contract_version is not null or rights_declared_at is not null)=0 and (select count(*) from public.comun_radio_contributions where rights_contract_version is not null or rights_declared_at is not null)=0),
  'oralHistoryGranularConsentPreserved',(to_regclass('public.comun_archive_oral_history_consents') is not null and to_regclass('public.comun_archive_oral_history_suggestions') is not null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comun_archive_oral_history_suggestions' and column_name in ('rights_basis','rights_declared_at'))),
  'reviewOnlyDistinctFromPublication',(select count(*)=0 from public.comun_archive_submissions where publication_scope='review_only' and rights_state='rights_approved') and (select count(*)=0 from public.comun_archive_artwork_submissions where publication_scope='review_only' and rights_state='rights_approved') and (select count(*)=0 from public.comun_radio_contributions where publication_scope='review_only' and rights_state='rights_approved'),
  'explicitLicenseRequired',(select count(*)=0 from public.comun_archive_submissions where reuse_permission='licensed_reuse' and (license_code is null or license_code in ('not_defined','none'))) and (select count(*)=0 from public.comun_archive_artwork_submissions where reuse_permission='licensed_reuse' and (license_code is null or license_code in ('not_defined','none'))) and (select count(*)=0 from public.comun_radio_contributions where reuse_permission='licensed_reuse' and (license_code is null or license_code in ('not_defined','none')))
);
rollback;
SQL
  node - "$ARTIFACT_DIR/schema-baseline.json" <<'NODE'
const x=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));for(const k of ['transactionReadOnly','requiredSchemaExact','targetRlsEnabled','clientCrudClosed','serviceRoleRequiredPrivileges','legacyRightsNonInferred','oralHistoryGranularConsentPreserved','reviewOnlyDistinctFromPublication','explicitLicenseRequired'])if(x[k]!==true)throw new Error(`A4_C0_SCHEMA_BLOCKED:${k}`);if(x.a4MigrationCount!==1)throw new Error('A4_C0_MIGRATION_NOT_EXACT');
NODE
  stage schema_baseline_green
}

snapshot(){
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/snapshot.json" <<'SQL'
begin read only;
select json_build_object('transactionReadOnly',current_setting('transaction_read_only')='on','contributionIntakes',(select count(*) from private.comun_cultural_contribution_intakes),'archiveSubmissions',(select count(*) from public.comun_archive_submissions),'artworkSubmissions',(select count(*) from public.comun_archive_artwork_submissions),'radioContributions',(select count(*) from public.comun_radio_contributions),'archiveAssets',(select count(*) from public.comun_archive_assets),'searchDocuments',(select count(*) from public.comun_search_documents),'collections',(select count(*) from public.comun_archive_collections),'publishedArchiveItems',(select count(*) from public.comun_archive_items where status='published'),'storageBucketCount',(select count(*) from storage.buckets),'storagePolicyFingerprint',coalesce((select md5(string_agg(format('%s.%s.%s.%s',schemaname,tablename,policyname,cmd),'|' order by schemaname,tablename,policyname)) from pg_policies where schemaname='storage'),md5('none')));
rollback;
SQL
  node - "$ARTIFACT_DIR/snapshot.json" <<'NODE'
if(JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8')).transactionReadOnly!==true)throw new Error('A4_C0_SNAPSHOT_NOT_READ_ONLY');
NODE
  stage snapshot_green
}

runtime_smoke(){
  local routes=(/comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir)
  local body="$TEMP_ROOT/body.html" out="$ARTIFACT_DIR/runtime-smoke.json"
  printf '{"methods":"GET_HEAD_ONLY","routes":[],"rawHtmlPersisted":false}' > "$out"
  for route in "${routes[@]}"; do
    local get head digest; get="$(curl -L -sS -o "$body" -w '%{http_code}' "$COMUN_BASE_URL$route")"; head="$(curl -L -sS -I -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")"
    test "$get" = 200; test "$head" = 200
    if grep -Eqi 'member_user_id|resume_token_hash|target_id|private\.comun_|sqlstate|service.role|supabase.*key|raw transcript' "$body"; then exit 1; fi
    digest="$(sha256sum "$body" | awk '{print $1}')"
    ROUTE="$route" GET="$get" HEAD="$head" DIGEST="$digest" node - "$out" <<'NODE'
const fs=require('node:fs'),x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));x.routes.push({route:process.env.ROUTE,get:Number(process.env.GET),head:Number(process.env.HEAD),bodySha256:process.env.DIGEST});fs.writeFileSync(process.argv[2],JSON.stringify(x,null,2)+'\n');
NODE
  done
  stage runtime_smoke_green
}

assert_canonical_state; audit_flags; schema_baseline; snapshot; runtime_smoke
summary businessWrites=0; summary schemaWrites=0; summary envWrites=0; summary fixtures=0; summary publications=0; summary rollback=false
summary COMUN_48_5_A4_C0_POST_ACTIVATION_BASELINE_GREEN_A4_CLOSED
stage terminal_green
