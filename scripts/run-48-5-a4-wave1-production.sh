#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-wave1-only}"
case "$MODE" in wave1-only|disable-only) ;; *) exit 2 ;; esac
: "${EXPECTED_MAIN_SHA:?}" "${SUPABASE_DB_URL:?}" "${SUPABASE_PROJECT_REF:?}" "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}" "${COMUN_BASE_URL:?}"
test "$SUPABASE_PROJECT_REF" = nvmdszymrtacfehdynpg
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) exit 2;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}"; test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

ARTIFACT_DIR="${COMUN_A4_WAVE1_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-r2-wave1}"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"; mkdir -p "$ARTIFACT_DIR"
PROJECT_JSON="$TEMP_ROOT/project.json"; SHARED_JSON="$TEMP_ROOT/shared.json"; ENV_FILE="$TEMP_ROOT/production.env"
ENABLED=false; TERMINAL_GREEN=false; ROLLBACK_ATTEMPTED=false
SMOKE_FILE="$ARTIFACT_DIR/runtime-smoke.json"; SMOKE_LAST_HTTP_STATUS=""
summary(){ printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage(){ printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
cleanup(){ rm -f "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE"; }

assert_main(){
  test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"; git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
  test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA"; git merge-base --is-ancestor 27c441a4fa03857ece2e022f6f64516d5188989d HEAD
  test "$(sha256sum supabase/migrations/20260819130000_comun_cultural_progressive_rights.sql | awk '{print $1}')" = 43b7b966b55c8429f021def0c60b80979a0110de27e39de6dc553ef97e891519
  stage main_exact_green
}
production_ready(){
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&state=READY&limit=50" > "$TEMP_ROOT/deployments.json"
  EXPECTED_MAIN_SHA="$EXPECTED_MAIN_SHA" node - "$TEMP_ROOT/deployments.json" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));if(!(x.deployments??[]).some(d=>d?.readyState==='READY'&&d?.meta?.githubCommitSha===process.env.EXPECTED_MAIN_SHA))throw new Error('A4_WAVE1_PRODUCTION_SHA_NOT_READY');
NODE
}
audit_flags(){
  local phase="$1"; curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED&limit=100" > "$SHARED_JSON"
  mkdir -p .vercel; node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  node scripts/ci/a4-flag-writer-contract.mjs --phase "$phase" --project-json "$PROJECT_JSON" --shared-json "$SHARED_JSON" --env-file "$ENV_FILE" --output "$ARTIFACT_DIR/flag-$phase.json"
  stage "flag_${phase}_green"
}
schema_preflight(){
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/schema.json" <<'SQL'
begin read only;
with expected(t,c,required) as (values
('comun_archive_submissions','rights_basis',true),('comun_archive_submissions','publication_scope',true),('comun_archive_submissions','reuse_permission',true),('comun_archive_submissions','license_code',false),('comun_archive_submissions','rights_state',true),('comun_archive_submissions','rights_contract_version',false),('comun_archive_submissions','rights_declared_at',false),
('comun_archive_artwork_submissions','authorship_basis',true),('comun_archive_artwork_submissions','publication_scope',true),('comun_archive_artwork_submissions','reuse_permission',true),('comun_archive_artwork_submissions','license_code',false),('comun_archive_artwork_submissions','identity_preference',true),('comun_archive_artwork_submissions','rights_state',true),('comun_archive_artwork_submissions','rights_contract_version',false),('comun_archive_artwork_submissions','rights_declared_at',false),
('comun_radio_contributions','voice_source',true),('comun_radio_contributions','material_source',true),('comun_radio_contributions','publication_scope',true),('comun_radio_contributions','reuse_permission',true),('comun_radio_contributions','license_code',false),('comun_radio_contributions','identity_preference',true),('comun_radio_contributions','rights_state',true),('comun_radio_contributions','rights_contract_version',false),('comun_radio_contributions','rights_declared_at',false)), actual as (select e.*,c.is_nullable='NO' nn,c.column_default from expected e join information_schema.columns c on c.table_schema='public' and c.table_name=e.t and c.column_name=e.c)
select json_build_object('transactionReadOnly',current_setting('transaction_read_only')='on','a4MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260819130000'),'columnsExact',(select count(*)=24 from actual),'requiredColumnsNotNull',(select count(*)=15 from actual where required and nn),'requiredColumnsHaveDefaults',(select count(*)=15 from actual where required and column_default is not null),'licenseConstraintsExact',(select count(*)=3 from pg_constraint where conname in ('comun_archive_submissions_a4_license_check','comun_archive_artwork_submissions_a4_license_check','comun_radio_contributions_a4_license_check')),'aclClosedToClients',(select bool_and(not has_table_privilege(r,'public.'||t,'select') and not has_table_privilege(r,'public.'||t,'insert') and not has_table_privilege(r,'public.'||t,'update') and not has_table_privilege(r,'public.'||t,'delete')) from (values('anon'),('authenticated')) x(r) cross join (values('comun_archive_submissions'),('comun_archive_artwork_submissions'),('comun_radio_contributions')) y(t)),'serviceRoleCanOperate',(select bool_and(has_table_privilege('service_role','public.'||t,'select') and has_table_privilege('service_role','public.'||t,'insert') and has_table_privilege('service_role','public.'||t,'update')) from (values('comun_archive_submissions'),('comun_archive_artwork_submissions'),('comun_radio_contributions')) y(t)),'rightsBackfillZero',((select count(*) from public.comun_archive_submissions where rights_contract_version is not null or rights_declared_at is not null)=0 and (select count(*) from public.comun_archive_artwork_submissions where rights_contract_version is not null or rights_declared_at is not null)=0 and (select count(*) from public.comun_radio_contributions where rights_contract_version is not null or rights_declared_at is not null)=0),'oralHistoryGranularConsentPreserved',(to_regclass('public.comun_archive_oral_history_consents') is not null and to_regclass('public.comun_archive_oral_history_suggestions') is not null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='comun_archive_oral_history_suggestions' and column_name in ('rights_basis','rights_declared_at'))));
rollback;
SQL
  node - "$ARTIFACT_DIR/schema.json" <<'NODE'
const x=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));for(const k of ['transactionReadOnly','columnsExact','requiredColumnsNotNull','requiredColumnsHaveDefaults','licenseConstraintsExact','aclClosedToClients','serviceRoleCanOperate','rightsBackfillZero','oralHistoryGranularConsentPreserved'])if(x[k]!==true)throw new Error('A4_WAVE1_SCHEMA_BLOCKED:'+k);if(x.a4MigrationCount!==1)throw new Error('A4_WAVE1_MIGRATION_NOT_EXACT');
NODE
  stage schema_green
}
snapshot(){
  local name="$1"; psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/$name.json" <<'SQL'
begin read only;
select json_build_object('transactionReadOnly',current_setting('transaction_read_only')='on','intakes',(select count(*) from private.comun_cultural_contribution_intakes),'archiveSubmissions',(select count(*) from public.comun_archive_submissions),'artworkSubmissions',(select count(*) from public.comun_archive_artwork_submissions),'oralHistorySuggestions',(select count(*) from public.comun_archive_oral_history_suggestions),'radioContributions',(select count(*) from public.comun_radio_contributions),'archiveItems',(select count(*) from public.comun_archive_items),'archiveAssets',(select count(*) from public.comun_archive_assets),'searchDocuments',(select count(*) from public.comun_search_documents),'collections',(select count(*) from public.comun_archive_collections),'publishedArchiveItems',(select count(*) from public.comun_archive_items where status='published'),'publishedRadioPrograms',(select count(*) from public.comun_radio_programs where publication_status='published'),'publishedRadioEpisodes',(select count(*) from public.comun_radio_episodes where publication_status='published'),'storageBucketCount',(select count(*) from storage.buckets),'storagePolicyFingerprint',coalesce((select md5(string_agg(format('%s.%s.%s.%s',schemaname,tablename,policyname,cmd),'|' order by schemaname,tablename,policyname)) from pg_policies where schemaname='storage'),md5('none')));
rollback;
SQL
  node - "$ARTIFACT_DIR/$name.json" <<'NODE'
if(JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8')).transactionReadOnly!==true)throw new Error('A4_WAVE1_SNAPSHOT_NOT_READ_ONLY');
NODE
}
patch_a4(){
  local value="$1" id status; id="$(node - "$PROJECT_JSON" <<'NODE'
const x=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));const a=(x.envs??x.data??x).filter?.(r=>r.key==='COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED'&&r.target?.length===1&&r.target[0]==='production')??[];if(a.length!==1)throw new Error('A4_WAVE1_ENV_ID_NOT_UNIQUE');process.stdout.write(a[0].id);
NODE
)"; status="$(curl -sS -o "$TEMP_ROOT/patch.json" -w '%{http_code}' -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$id?teamId=$VERCEL_ORG_ID" --data "{\"value\":\"$value\"}")"; node - "$status" "$ARTIFACT_DIR/patch-$value.json" <<'NODE'
const fs=require('node:fs'),status=Number(process.argv[2]);fs.writeFileSync(process.argv[3],JSON.stringify({httpStatus:status,success:status>=200&&status<300,rawValuePersisted:false,tokenPersisted:false})+'\n');if(!(status>=200&&status<300))throw new Error('A4_WAVE1_FLAG_PATCH_FAILED');
NODE
}
deploy_exact(){
  npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$TEMP_ROOT/deploy.out"
  local url; url="$(grep -Eo 'https://[^[:space:]]+' "$TEMP_ROOT/deploy.out" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac
  npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
  production_ready; stage deployment_exact_green
}
assert_flag_identity(){ node - "$1" "$2" <<'NODE'
const fs=require('node:fs'),pre=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),post=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const same=(a,b,fields,label)=>{if(!a||!b||fields.some((field)=>JSON.stringify(a[field])!==JSON.stringify(b[field])))throw new Error(`A4_WAVE1_${label}_IDENTITY_CHANGED`)};
same(pre.a4Metadata,post.a4Metadata,['id','type','target','createdAt'],'A4');
same(pre.a3Metadata,post.a3Metadata,['id','type','target','createdAt','updatedAt'],'A3');
NODE
  stage flag_identity_preserved_green
}
init_runtime_smoke(){
  local expected="$1"
  EXPECTED_STATE="$expected" node - "$SMOKE_FILE" <<'NODE'
const fs=require('node:fs');fs.writeFileSync(process.argv[2],JSON.stringify({formatVersion:1,expectedState:process.env.EXPECTED_STATE,surfaces:{photo:{markers:[]},art:{markers:[]},radio:{markers:[]},oralHistory:{markers:[]}},failedSurface:null,failedMarker:null,rawHtmlPersisted:false},null,2)+'\n');
NODE
}
record_runtime_check(){
  local surface="$1" marker="$2" literal="$3" body="$4" expected="$5" present=false
  grep -Fq "$literal" "$body" && present=true
  CHECK_SURFACE="$surface" CHECK_MARKER="$marker" CHECK_EXPECTED="$expected" CHECK_PRESENT="$present" CHECK_STATUS="$SMOKE_LAST_HTTP_STATUS" node - "$SMOKE_FILE" "$body" <<'NODE'
const crypto=require('node:crypto'),fs=require('node:fs'),out=process.argv[2],body=fs.readFileSync(process.argv[3]);const x=JSON.parse(fs.readFileSync(out,'utf8'));const surface=process.env.CHECK_SURFACE,marker=process.env.CHECK_MARKER,present=process.env.CHECK_PRESENT==='true',expected=process.env.CHECK_EXPECTED==='present',ok=expected===present;const row={markerId:marker,present,httpStatus:Number(process.env.CHECK_STATUS),bodySha256:crypto.createHash('sha256').update(body).digest('hex')};x.surfaces[surface]??={markers:[]};x.surfaces[surface].httpStatus=row.httpStatus;x.surfaces[surface].bodySha256=row.bodySha256;x.surfaces[surface].markers.push(row);if(!ok&&!x.failedMarker){x.failedSurface=surface;x.failedMarker=marker;x.result='BLOCKED';}fs.writeFileSync(out,JSON.stringify(x,null,2)+'\n');process.exit(ok?0:1);
NODE
}
require_marker(){ record_runtime_check "$1" "$2" "$3" "$4" present; }
forbid_marker(){ record_runtime_check "$1" "$2" "$3" "$4" absent; }
fetch_runtime_surface(){
  local surface="$1" route="$2" body="$3"
  SMOKE_LAST_HTTP_STATUS="$(curl -L -sS -o "$body" -w '%{http_code}' "$COMUN_BASE_URL$route")"
  if test "$SMOKE_LAST_HTTP_STATUS" != 200; then record_runtime_check "$surface" http_200 '__expected_http_200__' "$body" present || true; return 1; fi
  test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")" = 200
  if grep -Eqi 'member_user_id|resume_token_hash|target_id|private\.comun_|sqlstate|service.role|supabase.*key|raw transcript' "$body"; then record_runtime_check "$surface" privacy_no_private_identifiers 'member_user_id' "$body" absent; return 1; fi
}
smoke(){
  local expected_state="${1:-enabled}" body="$TEMP_ROOT/body.html" route
  local routes=(/comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir)
  init_runtime_smoke "$expected_state"
  for route in "${routes[@]}"; do
    fetch_runtime_surface oralHistory "$route" "$body" || return 1
  done
  fetch_runtime_surface photo '/comun/acervo/contribuir?specialized=photo&intake=wave1-smoke' "$body" || return 1
  if test "$expected_state" = enabled; then
    require_marker photo relationship_source 'Como este material chegou até você?' "$body" || return 1
    require_marker photo no_auto_publication 'Guardar não autoriza publicação nem reutilização.' "$body" || return 1
    require_marker photo historical_unknown historical_unknown "$body" || return 1
    require_marker photo licensed_reuse licensed_reuse "$body" || return 1
  else
    forbid_marker photo relationship_source 'Como este material chegou até você?' "$body" || return 1
  fi
  fetch_runtime_surface art /comun/acervo/arte/contribuir "$body" || return 1
  if test "$expected_state" = enabled; then
    for pair in 'authorship|Relação com a autoria' 'identity|Identificação pública' 'scope|Escopo nesta etapa' 'reuse|Reutilização' 'license|Licença, se houver' 'no_auto_publication|Autoria desconhecida ou obra de terceiro não vira pública automaticamente'; do require_marker art "${pair%%|*}" "${pair#*|}" "$body" || return 1; done
  else
    forbid_marker art authorship 'Relação com a autoria' "$body" || return 1
  fi
  fetch_runtime_surface radio /comun/radio/contribuir "$body" || return 1
  if test "$expected_state" = enabled; then
    for pair in 'voice|De quem é a voz?' 'material|Origem do material' 'scope|Escopo nesta etapa' 'reuse|Reutilização' 'identity|Identidade pública' 'music_separate_rights|Música incorporada possui análise própria; esta declaração não concede licença musical.'; do require_marker radio "${pair%%|*}" "${pair#*|}" "$body" || return 1; done
  else
    forbid_marker radio voice 'De quem é a voz?' "$body" || return 1
  fi
  node - "$SMOKE_FILE" <<'NODE'
const fs=require('node:fs'),x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));x.result='GREEN';fs.writeFileSync(process.argv[2],JSON.stringify(x,null,2)+'\n');
NODE
  summary runtimeProgressiveRights="$([ "$expected_state" = enabled ] && echo true || echo false)"; summary smokeMethods=GET_HEAD_ONLY; stage runtime_smoke_green
}
compare(){ node - "$ARTIFACT_DIR/baseline.json" "$ARTIFACT_DIR/postflight.json" <<'NODE'
const fs=require('node:fs'),a=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),b=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('A4_WAVE1_BUSINESS_DELTA');
NODE
  summary businessWrites=0; summary publications=0; summary searchWrites=0; summary assetWrites=0; summary collectionWrites=0; }
write_rollback_receipt(){
  local status="$1" trigger="$2" failed_stage="${3:-null}"
  ROLLBACK_STATUS="$status" ROLLBACK_TRIGGER="$trigger" ROLLBACK_STAGE="$failed_stage" node - "$ARTIFACT_DIR/rollback.json" <<'NODE'
const fs=require('node:fs'),path=process.argv[2],old=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{};const stage=process.env.ROLLBACK_STAGE;Object.assign(old,{formatVersion:1,attempted:true,trigger:process.env.ROLLBACK_TRIGGER,mainSha:/^[0-9a-f]{7,64}$/i.test(process.env.EXPECTED_MAIN_SHA||'')?process.env.EXPECTED_MAIN_SHA:null,runId:/^\d+$/.test(process.env.GITHUB_RUN_ID||'')?process.env.GITHUB_RUN_ID:null,previousObservedState:'ON',status:process.env.ROLLBACK_STATUS,rawValuePersisted:false,tokenPersisted:false});if(stage!=='null')old.failedStage=stage;fs.writeFileSync(path,JSON.stringify(old,null,2)+'\n');
NODE
}
disable_a4(){
  local trigger="$1" stage_name
  if ! audit_flags disable-pre; then stage_name=disable_pre; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  if ! patch_a4 disabled; then stage_name=disable_patch; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  if ! audit_flags disable-post; then stage_name=disable_post; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  if ! assert_flag_identity "$ARTIFACT_DIR/flag-disable-pre.json" "$ARTIFACT_DIR/flag-disable-post.json"; then stage_name=disable_identity; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  if ! deploy_exact; then stage_name=disable_deployment; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  if ! smoke disabled; then stage_name=disable_smoke; write_rollback_receipt incomplete "$trigger" "$stage_name"; return 1; fi
  ENABLED=false
}
rollback(){
  local trigger="$1"
  test "$ENABLED" = true && test "$ROLLBACK_ATTEMPTED" = false || return 0
  ROLLBACK_ATTEMPTED=true; trap - ERR EXIT
  write_rollback_receipt started "$trigger"
  if ! disable_a4 "$trigger"; then summary COMUN_48_5_A4_R2_ROLLBACK_INCOMPLETE_REQUIRES_INTERVENTION; return 1; fi
  write_rollback_receipt complete "$trigger"
  summary COMUN_48_5_A4_R2_RUNTIME_ROLLED_BACK_FLAG_OFF
}
on_exit(){
  local status=$?; trap - ERR EXIT
  if test "$ENABLED" = true && test "$TERMINAL_GREEN" = false && test "$ROLLBACK_ATTEMPTED" = false; then rollback "unexpected_exit_${status}" || true; fi
  cleanup; exit "$status"
}
fail_after_enable(){ rollback "$1" || true; exit 1; }
trap on_exit EXIT

assert_main; production_ready; schema_preflight; snapshot baseline
if test "$MODE" = disable-only; then
  ENABLED=true; ROLLBACK_ATTEMPTED=true; disable_a4 disable_only || exit 1; summary A4_DISABLE_ONLY_GREEN; exit 0
fi
audit_flags wave1-pre; patch_a4 enabled; ENABLED=true
if ! audit_flags wave1-post; then fail_after_enable flag_post_failed; fi
if ! assert_flag_identity "$ARTIFACT_DIR/flag-wave1-pre.json" "$ARTIFACT_DIR/flag-wave1-post.json"; then fail_after_enable flag_identity_failed; fi
if ! deploy_exact; then fail_after_enable deployment_failed; fi
if ! smoke enabled; then fail_after_enable smoke_failed; fi
if ! snapshot postflight; then fail_after_enable snapshot_failed; fi
if ! compare; then fail_after_enable comparison_failed; fi
TERMINAL_GREEN=true
summary COMUN_48_5_A4_R2_PROGRESSIVE_CULTURAL_RIGHTS_GREEN_PRODUCTION_ACTIVE_NO_AUTO_PUBLICATION; stage terminal_green
