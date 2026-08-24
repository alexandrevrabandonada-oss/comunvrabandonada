#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_MAIN_SHA:?}" "${A5_A2_FUNCTIONAL_ANCESTOR:?}" "${A5_A2_MIGRATION:?}" "${A5_A2_MIGRATION_SHA256:?}"
: "${SUPABASE_DB_URL:?}" "${SUPABASE_PROJECT_REF:?}" "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}" "${COMUN_BASE_URL:?}"

readonly ARTIFACT_DIR=".ci-artifacts/48-5-a5-a2-r1-production"
readonly SIDEWALK_EXCEPTION="supabase/migration-exceptions/20260724233256-sidewalk-external-ledger.json"
readonly SIDEWALK_MIGRATION="supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql"
readonly SIDEWALK_SHA="6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be"
readonly TEMP_ROOT="$(mktemp -d "${RUNNER_TEMP:-/tmp}/comun-a5-a2-r1.XXXXXX")"
HELD_SIDEWALK=""

mkdir -p "$ARTIFACT_DIR"
stage(){ printf 'stage=%s\n' "$1" | tee "$ARTIFACT_DIR/stage.txt"; }
fail(){ printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; echo "$1" >&2; exit 1; }
restore_sidewalk(){
  if test -n "$HELD_SIDEWALK"; then mv "$HELD_SIDEWALK" "$SIDEWALK_MIGRATION"; HELD_SIDEWALK=""; fi
  test "$(sha256sum "$SIDEWALK_MIGRATION" | awk '{print tolower($1)}')" = "$SIDEWALK_SHA"
  test -z "$(git status --porcelain -- "$SIDEWALK_MIGRATION")"
}
cleanup(){ local code=$?; restore_sidewalk || code=1; rm -rf "$TEMP_ROOT"; exit "$code"; }
trap cleanup EXIT

test "$SUPABASE_PROJECT_REF" = nvmdszymrtacfehdynpg || fail COMUN_48_5_A5_A2_R1_BLOCKED_PROJECT_REF
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_5_A5_A2_R1_BLOCKED_REMOTE_DB_URL;; esac
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_5_A5_A2_R1_BLOCKED_MAIN_DRIFT
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_5_A5_A2_R1_BLOCKED_MAIN_DRIFT
git merge-base --is-ancestor "$A5_A2_FUNCTIONAL_ANCESTOR" HEAD || fail COMUN_48_5_A5_A2_R1_BLOCKED_FUNCTIONAL_ANCESTOR
test "$(sha256sum "$A5_A2_MIGRATION" | awk '{print tolower($1)}')" = "${A5_A2_MIGRATION_SHA256,,}" || fail COMUN_48_5_A5_A2_R1_BLOCKED_CHECKSUM
printf '{"main":"%s","migration":"%s","sha256":"%s"}\n' "$EXPECTED_MAIN_SHA" "$(basename "$A5_A2_MIGRATION")" "${A5_A2_MIGRATION_SHA256,,}" > "$ARTIFACT_DIR/preflight.json"

# A3/A4 remain canonical and enabled; only decrypted values are written to a runner temp file.
mkdir -p .vercel
printf '{"orgId":"%s","projectId":"%s"}\n' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json
npx --yes vercel@50.28.0 env pull "$TEMP_ROOT/production.env" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null
node - "$TEMP_ROOT/production.env" "$ARTIFACT_DIR/flags.json" <<'NODE'
const fs=require('node:fs'); const text=fs.readFileSync(process.argv[2],'utf8');
const get=(k)=>new RegExp(`^${k}=(.*)$`,'m').exec(text)?.[1]?.replace(/^['"]|['"]$/g,'');
const a3=get('COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED'),a4=get('COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED');
if(a3!=='enabled'||a4!=='enabled') throw Error('COMUN_48_5_A5_A2_R1_BLOCKED_FLAGS');
fs.writeFileSync(process.argv[3],JSON.stringify({A3:'ON',A4:'ON',ProductionEnvWrites:0},null,2)+'\n');
NODE
stage flags_green

snapshot(){
  local phase="$1"
  psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/$phase.json" <<'SQL'
begin read only;
select json_build_object(
 'transactionReadOnly',current_setting('transaction_read_only')='on',
 'migrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260824001340'),
 'schema',json_build_object(
   'guard',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_guard_artwork_submission_private_root_provenance_v1'),
   'trigger',(select count(*) from pg_trigger where tgname='comun_artwork_submissions_private_root_guard' and tgenabled='O'),
   'rpcs',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('comun_link_artwork_submission_private_root_v1','comun_materialize_artwork_submission_private_root_v1'))),
 'counts',json_build_object(
   'submissions',(select count(*) from public.comun_archive_artwork_submissions),
   'submissionNull',(select count(*) from public.comun_archive_artwork_submissions where archive_item_id is null),
   'submissionLinked',(select count(*) from public.comun_archive_artwork_submissions where archive_item_id is not null),
   'territorialArtworkRoots',(select count(*) from public.comun_archive_items where item_type='territorial_artwork'),
   'artworkChildren',(select count(*) from public.comun_archive_artworks),
   'draftPrivateRoots',(select count(*) from public.comun_archive_items where item_type='territorial_artwork' and status='draft' and visibility='private'),
   'publishedPublicRoots',(select count(*) from public.comun_archive_items where item_type='territorial_artwork' and status='published' and visibility='public'),
   'archiveAssets',(select count(*) from public.comun_archive_assets),
   'searchDocuments',(select count(*) from public.comun_search_documents),
   'collections',(select count(*) from public.comun_archive_collections)),
 'fingerprints',json_build_object(
   'submissions',coalesce((select md5(string_agg(id::text||':'||coalesce(archive_item_id::text,'null'),'|' order by id)) from public.comun_archive_artwork_submissions),md5('none')),
   'items',coalesce((select md5(string_agg(id::text||':'||status||':'||visibility,'|' order by id)) from public.comun_archive_items),md5('none')),
   'artworks',coalesce((select md5(string_agg(archive_item_id::text||':'||publication_status,'|' order by archive_item_id)) from public.comun_archive_artworks),md5('none')),
   'storage',coalesce((select md5(string_agg(bucket_id||':'||name,'|' order by bucket_id,name)) from storage.objects),md5('none')))
);
rollback;
SQL
}
snapshot before
node - "$ARTIFACT_DIR/before.json" <<'NODE'
const x=require(process.cwd()+'/'+process.argv[2]); if(!x.transactionReadOnly||x.migrationCount!==0||Object.values(x.schema).some(Number)) throw Error('COMUN_48_5_A5_A2_R1_BLOCKED_SCHEMA_NOT_ABSENT');
NODE

node scripts/solo/validate-sidewalk-external-ledger-exception.mjs "$SIDEWALK_EXCEPTION"
node scripts/solo/verify-sidewalk-external-ledger-evolved-scope.mjs
grep -q 'COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN' .ci-artifacts/a4-external-ledger-e1/bridge.json
mv "$SIDEWALK_MIGRATION" "$TEMP_ROOT/sidewalk.sql"; HELD_SIDEWALK="$TEMP_ROOT/sidewalk.sql"
supabase migration list --db-url "$SUPABASE_DB_URL" > "$ARTIFACT_DIR/migration-list-before.txt"
supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$ARTIFACT_DIR/planner-before.txt"
mapfile -t planned < <(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/planner-before.txt" | sort -u || true)
test "${#planned[@]}" -eq 1 && test "${planned[0]}" = "$(basename "$A5_A2_MIGRATION")" || fail COMUN_48_5_A5_A2_R1_BLOCKED_UNEXPECTED_MIGRATION_PLAN
stage exact_plan_green

supabase db push --db-url "$SUPABASE_DB_URL" > "$TEMP_ROOT/apply.log" 2>&1 || fail COMUN_48_5_A5_A2_R1_BLOCKED_APPLY
restore_sidewalk
snapshot after

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$ARTIFACT_DIR/security.json" <<'SQL'
begin read only;
with rpc as (select p.oid,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('comun_link_artwork_submission_private_root_v1','comun_materialize_artwork_submission_private_root_v1'))
select json_build_object(
 'transactionReadOnly',current_setting('transaction_read_only')='on',
 'migrationExactlyOnce',(select count(*)=1 from supabase_migrations.schema_migrations where version='20260824001340'),
 'guardSecurityInvoker',(select count(*)=1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='comun_guard_artwork_submission_private_root_provenance_v1' and not p.prosecdef),
 'triggerEnabled',(select count(*)=1 from pg_trigger where tgname='comun_artwork_submissions_private_root_guard' and tgenabled='O'),
 'rpcCount',(select count(*) from rpc),
 'rpcSecurityInvoker',(select count(*)=2 and bool_and(not prosecdef) from rpc),
 'clientExecuteClosed',(select count(*)=2 and bool_and(not has_function_privilege('public',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE') and not has_function_privilege('authenticated',oid,'EXECUTE')) from rpc),
 'serviceRoleExecute',(select count(*)=2 and bool_and(has_function_privilege('service_role',oid,'EXECUTE')) from rpc),
 'artworkRls',(select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='comun_archive_artwork_submissions')
);
rollback;
SQL
node - "$ARTIFACT_DIR/before.json" "$ARTIFACT_DIR/after.json" "$ARTIFACT_DIR/security.json" <<'NODE'
const fs=require('node:fs'),a=JSON.parse(fs.readFileSync(process.argv[2])),b=JSON.parse(fs.readFileSync(process.argv[3])),s=JSON.parse(fs.readFileSync(process.argv[4]));
if(!b.transactionReadOnly||b.migrationCount!==1||b.schema.guard!==1||b.schema.trigger!==1||b.schema.rpcs!==2) throw Error('COMUN_48_5_A5_A2_R1_BLOCKED_POSTFLIGHT_SCHEMA');
if(JSON.stringify(a.counts)!==JSON.stringify(b.counts)||JSON.stringify(a.fingerprints)!==JSON.stringify(b.fingerprints)) throw Error('COMUN_48_5_A5_A2_R1_BLOCKED_BUSINESS_DELTA');
if(!Object.values(s).every(Boolean)) throw Error('COMUN_48_5_A5_A2_R1_BLOCKED_SECURITY');
fs.writeFileSync('.ci-artifacts/48-5-a5-a2-r1-production/business-delta.json',JSON.stringify({ArtworkSubmissionBackfill:0,territorialArtworkRootsCreated:0,artworkChildrenCreated:0,ProductionBusinessWrites:0,publications:0,SearchWrites:0,collectionWrites:0,publicAssetPromotions:0},null,2)+'\n');
NODE

mv "$SIDEWALK_MIGRATION" "$TEMP_ROOT/sidewalk.sql"; HELD_SIDEWALK="$TEMP_ROOT/sidewalk.sql"
supabase db push --db-url "$SUPABASE_DB_URL" --dry-run > "$ARTIFACT_DIR/planner-after.txt"
test -z "$(grep -oE '20[0-9]{12}_[a-z0-9_]+\.sql' "$ARTIFACT_DIR/planner-after.txt" | sort -u)" || fail COMUN_48_5_A5_A2_R1_BLOCKED_PLANNER_AFTER
restore_sidewalk
printf '{"terminal":"COMUN_48_5_A5_A2_R1_SCHEMA_GREEN_READY_FOR_RUNTIME","plannerAfter":[],"ProductionSchemaWrites":"1_migration_only","ProductionBusinessWrites":0,"ProductionEnvWrites":0}\n' > "$ARTIFACT_DIR/closeout.json"
echo COMUN_48_5_A5_A2_R1_SCHEMA_GREEN_READY_FOR_RUNTIME
