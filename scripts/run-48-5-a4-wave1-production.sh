#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-wave1-only}"
case "$MODE" in wave1-only|disable-only) ;; *) exit 2 ;; esac
: "${EXPECTED_MAIN_SHA:?}" "${SUPABASE_DB_URL:?}" "${SUPABASE_PROJECT_REF:?}" "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}" "${COMUN_BASE_URL:?}"
test "$SUPABASE_PROJECT_REF" = nvmdszymrtacfehdynpg
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) exit 2;; esac
test -z "${SUPABASE_ACCESS_TOKEN:-}"; test -z "${SUPABASE_SERVICE_ROLE_KEY:-}"

ARTIFACT_DIR="${COMUN_A4_WAVE1_ARTIFACT_DIR:-.ci-artifacts/48-5-a4-r2-wave1}"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}"; mkdir -p "$ARTIFACT_DIR"
PROJECT_JSON="$TEMP_ROOT/project.json"; SHARED_JSON="$TEMP_ROOT/shared.json"; ENV_FILE="$TEMP_ROOT/production.env"; ENABLED=false; ROLLBACK_ATTEMPTED=false
summary(){ printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; }
stage(){ printf 'stage=%s\n' "$1" >> "$ARTIFACT_DIR/stage.txt"; summary "stage=$1"; }
cleanup(){ rm -f "$PROJECT_JSON" "$SHARED_JSON" "$ENV_FILE"; }; trap cleanup EXIT

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
select json_build_object('transactionReadOnly',current_setting('transaction_read_only')='on','intakes',(select count(*) from private.comun_cultural_contribution_intakes),'archiveSubmissions',(select count(*) from public.comun_archive_submissions),'artworkSubmissions',(select count(*) from public.comun_archive_artwork_submissions),'oralHistorySuggestions',(select count(*) from public.comun_archive_oral_history_suggestions),'radioContributions',(select count(*) from public.comun_radio_contributions),'archiveItems',(select count(*) from public.comun_archive_items),'archiveAssets',(select count(*) from public.comun_archive_assets),'searchDocuments',(select count(*) from public.comun_search_documents),'collections',(select count(*) from public.comun_archive_collections),'publishedArchiveItems',(select count(*) from public.comun_archive_items where status='published'),'publishedRadioPrograms',(select count(*) from public.comun_radio_programs where status='published'),'publishedRadioEpisodes',(select count(*) from public.comun_radio_episodes where status='published'),'storageBucketCount',(select count(*) from storage.buckets),'storagePolicyFingerprint',coalesce((select md5(string_agg(format('%s.%s.%s.%s',schemaname,tablename,policyname,cmd),'|' order by schemaname,tablename,policyname)) from pg_policies where schemaname='storage'),md5('none')));
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
smoke(){
  local routes=(/comun/acervo /comun/acervo/contribuir /comun/acervo/arte /comun/acervo/arte/contribuir /comun/acervo/historias-orais /comun/acervo/historias-orais/contribuir /comun/radio /comun/radio/contribuir) body="$TEMP_ROOT/body.html"
  for route in "${routes[@]}";do test "$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")" = 200; test "$(curl -L -sS -I -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL$route")" = 200; curl -LfsS "$COMUN_BASE_URL$route" > "$body"; ! grep -Eqi 'member_user_id|resume_token_hash|target_id|private\.comun_|sqlstate|service.role|supabase.*key|raw transcript' "$body";done
  curl -LfsS "$COMUN_BASE_URL/comun/acervo/contribuir?specialized=photo&intake=wave1-smoke" > "$body"; grep -Fq 'Como este material chegou até você?' "$body"; grep -Fq 'Guardar não autoriza publicação nem reutilização.' "$body"; grep -Fq 'historical_unknown' "$body"; grep -Fq 'licensed_reuse' "$body"
  curl -LfsS "$COMUN_BASE_URL/comun/acervo/arte/contribuir" > "$body"; for x in 'Relação com a autoria' 'Identificação pública' 'Escopo nesta etapa' 'Reutilização' 'Licença, se houver' 'Autoria desconhecida ou obra de terceiro não vira pública automaticamente';do grep -Fq "$x" "$body";done
  curl -LfsS "$COMUN_BASE_URL/comun/radio/contribuir" > "$body"; for x in 'De quem é a voz?' 'Origem do material' 'Escopo nesta etapa' 'Reutilização' 'Identidade pública' 'Música incorporada possui análise própria; esta declaração não concede licença musical.';do grep -Fq "$x" "$body";done
  summary runtimeProgressiveRights=true; summary smokeMethods=GET_HEAD_ONLY; stage runtime_smoke_green
}
compare(){ node - "$ARTIFACT_DIR/baseline.json" "$ARTIFACT_DIR/postflight.json" <<'NODE'
const fs=require('node:fs'),a=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),b=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('A4_WAVE1_BUSINESS_DELTA');
NODE
  summary businessWrites=0; summary publications=0; summary searchWrites=0; summary assetWrites=0; summary collectionWrites=0; }
rollback(){
  if test "$ENABLED" != true || test "$ROLLBACK_ATTEMPTED" = true; then return; fi; ROLLBACK_ATTEMPTED=true; set +e
  audit_flags disable-pre && patch_a4 disabled && audit_flags disable-post && deploy_exact && smoke
  local ok=$?; set -e; if test "$ok" -ne 0; then summary COMUN_48_5_A4_R2_ROLLBACK_INCOMPLETE_REQUIRES_INTERVENTION; fi
}
on_error(){ local status=$?; rollback; exit "$status"; }; trap on_error ERR

assert_main; production_ready; schema_preflight; snapshot baseline
if test "$MODE" = disable-only; then audit_flags disable-pre; patch_a4 disabled; audit_flags disable-post; deploy_exact; smoke; summary A4_DISABLE_ONLY_GREEN; exit 0; fi
audit_flags wave1-pre; patch_a4 enabled; ENABLED=true; audit_flags wave1-post; deploy_exact; smoke; snapshot postflight; compare
summary COMUN_48_5_A4_R2_PROGRESSIVE_CULTURAL_RIGHTS_GREEN_PRODUCTION_ACTIVE_NO_AUTO_PUBLICATION; stage terminal_green
