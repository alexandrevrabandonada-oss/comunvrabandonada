#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
SUPABASE_DB_URL="${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
VERCEL_TOKEN="${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
VERCEL_ORG_ID="${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-b2-a2-r5-spatial-key"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}/comun-b2-a2-r5-${GITHUB_RUN_ID:-local}-$$"
PROJECT_JSON="$TEMP_ROOT/project.json"
SHARED_LOCATION_JSON="$TEMP_ROOT/shared-location.json"
SHARED_SPATIAL_JSON="$TEMP_ROOT/shared-spatial.json"
COUNTS_JSON="$TEMP_ROOT/counts.json"
SPATIAL_KEY_FILE="$TEMP_ROOT/spatial.key"
POSTCHECK_JSON="$TEMP_ROOT/postcheck.json"

mkdir -p "$ARTIFACT_DIR" "$TEMP_ROOT"
chmod 700 "$TEMP_ROOT"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
fail() { printf '%s\n' "$1" >&2; printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; exit 1; }
cleanup() { rm -f "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$COUNTS_JSON" "$SPATIAL_KEY_FILE"; rm -rf "$TEMP_ROOT"; }
trap cleanup EXIT

test -z "${SUPABASE_ACCESS_TOKEN:-}" || fail COMUN_48_6_B2_A2_R5_BLOCKED_REMOTE_CLI_AUTH
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || fail COMUN_48_6_B2_A2_R5_BLOCKED_REMOTE_CLI_AUTH
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_6_B2_A2_R5_BLOCKED_NON_PRODUCTION_BINDING ;; esac
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R5_BLOCKED_MAIN_DRIFT
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R5_BLOCKED_MAIN_DRIFT

fetch_metadata() {
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error --max-time 10 --max-redirs 0 -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error --max-time 10 --max-redirs 0 -G -H "Authorization: Bearer $VERCEL_TOKEN" \
    --data-urlencode "teamId=$VERCEL_ORG_ID" --data-urlencode "search=COMUN_RELATA_LOCATION_ENCRYPTION_KEY" --data-urlencode "limit=100" \
    "https://api.vercel.com/v1/env" > "$SHARED_LOCATION_JSON"
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error --max-time 10 --max-redirs 0 -G -H "Authorization: Bearer $VERCEL_TOKEN" \
    --data-urlencode "teamId=$VERCEL_ORG_ID" --data-urlencode "search=COMUN_RELATA_SPATIAL_HMAC_KEY" --data-urlencode "limit=100" \
    "https://api.vercel.com/v1/env" > "$SHARED_SPATIAL_JSON"
}
fetch_metadata || fail COMUN_48_6_B2_A2_R5_BLOCKED_VERCEL_READ

node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$TEMP_ROOT/preflight.json" <<'NODE'
const fs=require('node:fs');
const [projectPath,locationPath,spatialPath,outPath]=process.argv.slice(2);
const project=JSON.parse(fs.readFileSync(projectPath,'utf8'));const rows=project.envs??project.data??project;
const readRows=p=>{const x=JSON.parse(fs.readFileSync(p,'utf8'));return x.envs??x.data??x;};
const shared=(p,k)=>readRows(p).filter(x=>x.key===k).length;
const exact=(k)=>{const a=rows.filter(x=>x.key===k&&(x.target??[]).includes('production'));return a.length===1&&a[0].type==='sensitive'&&JSON.stringify(a[0].target??[])===JSON.stringify(['production'])&&a[0].gitBranch==null&&!(a[0].customEnvironmentIds??[]).length;};
const absent=(k)=>rows.filter(x=>x.key===k).length===0;
const location=exact('COMUN_RELATA_LOCATION_ENCRYPTION_KEY');const spatial=exact('COMUN_RELATA_SPATIAL_HMAC_KEY');
if(!location)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_LOCATION_KEY_METADATA_DRIFT');
if(!absent('COMUN_RELATA_SPATIAL_HMAC_KEY')&&!spatial)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SPATIAL_KEY_RACE_CONFLICT');
if(shared(locationPath,'COMUN_RELATA_LOCATION_ENCRYPTION_KEY')!==0||shared(spatialPath,'COMUN_RELATA_SPATIAL_HMAC_KEY')!==0)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SHARED_KEY_DUPLICATE');
fs.writeFileSync(outPath,JSON.stringify({locationKey:{present:true,type:'sensitive',productionOnly:true,provenance:'p3b_runtime_validated',written:false},spatialKey:{present:spatial,type:'sensitive',productionOnly:true,written:false},secretReadback:false,productionEnvWrites:0,productionSchemaWrites:0,productionBusinessWrites:0,artifactSanitizerActuallyExecuted:false},null,2)+'\n');
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$COUNTS_JSON" <<'SQL'
begin read only;
select json_build_object(
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'b2a2MigrationCount',(select count(*) from supabase_migrations.schema_migrations where version='20260827120000'),
  'privateLocationCount',(select count(*) from private.comun_relata_private_locations),
  'matchKeyCount',(select count(*) from private.comun_relata_case_match_keys),
  'projectionRows',(select count(*) from private.comun_relata_public_projections),
  'confirmationRows',(select count(*) from private.comun_relata_public_confirmations)
);
rollback;
SQL
node - "$COUNTS_JSON" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!x.transactionReadOnly||x.b2a2MigrationCount!==0||x.projectionRows!==0||x.confirmationRows!==0)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_PRODUCTION_STATE');
if(Number(x.matchKeyCount)!==0)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SPATIAL_KEY_ABSENT_WITH_EXISTING_MATCH_KEYS');
NODE

fetch_metadata || fail COMUN_48_6_B2_A2_R5_BLOCKED_VERCEL_READ
if ! node - "$PROJECT_JSON" <<'NODE'
const fs=require('node:fs');const x=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const rows=x.envs??x.data??x;process.exit(rows.some(r=>r.key==='COMUN_RELATA_SPATIAL_HMAC_KEY'&&(r.target??[]).includes('production'))?0:1);
NODE
then
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))' > "$SPATIAL_KEY_FILE"
  chmod 600 "$SPATIAL_KEY_FILE"
  node - "$SPATIAL_KEY_FILE" <<'NODE'
const fs=require('node:fs');const x=fs.readFileSync(process.argv[2],'utf8').trim();if(Buffer.from(x,'base64url').length!==32)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_GENERATED_KEY_SHAPE');
NODE
  if ! cat "$SPATIAL_KEY_FILE" | npx --yes vercel@50.28.0 env add COMUN_RELATA_SPATIAL_HMAC_KEY production --sensitive --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$TEMP_ROOT/env-add.out" 2> "$TEMP_ROOT/env-add.err"; then fail COMUN_48_6_B2_A2_R5_BLOCKED_VERCEL_ENV_WRITE; fi
  spatial_written=true
else
  spatial_written=false
fi

fetch_metadata || fail COMUN_48_6_B2_A2_R5_BLOCKED_VERCEL_READ
node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$POSTCHECK_JSON" "$spatial_written" <<'NODE'
const fs=require('node:fs');const [projectPath,locationPath,spatialPath,outPath,writtenArg]=process.argv.slice(2);const p=JSON.parse(fs.readFileSync(projectPath,'utf8'));const rows=p.envs??p.data??p;const read=q=>{const x=JSON.parse(fs.readFileSync(q,'utf8'));return x.envs??x.data??x;};const count=(q,k)=>read(q).filter(x=>x.key===k).length;const exact=k=>{const a=rows.filter(x=>x.key===k&&(x.target??[]).includes('production'));return a.length===1&&a[0].type==='sensitive'&&JSON.stringify(a[0].target??[])===JSON.stringify(['production'])&&a[0].gitBranch==null&&!(a[0].customEnvironmentIds??[]).length;};if(!exact('COMUN_RELATA_LOCATION_ENCRYPTION_KEY')||!exact('COMUN_RELATA_SPATIAL_HMAC_KEY'))throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_KEY_POSTCHECK');if(count(locationPath,'COMUN_RELATA_LOCATION_ENCRYPTION_KEY')!==0||count(spatialPath,'COMUN_RELATA_SPATIAL_HMAC_KEY')!==0)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_SHARED_KEY_DUPLICATE');const written=writtenArg==='true';fs.writeFileSync(outPath,JSON.stringify({locationKey:{present:true,type:'sensitive',productionOnly:true,provenance:'p3b_runtime_validated',written:false},spatialKey:{present:true,type:'sensitive',productionOnly:true,generatedShape:'32_byte_base64url',written},secretReadback:false},null,2)+'\n');
NODE

node - "$POSTCHECK_JSON" "$spatial_written" <<'NODE'
const fs=require('node:fs');const post=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const wrote=process.argv[3]==='true';if(!post.locationKey.present||post.locationKey.written||post.spatialKey.written!==wrote)throw new Error('COMUN_48_6_B2_A2_R5_BLOCKED_POSTCHECK');const out={locationKey:post.locationKey,spatialKey:post.spatialKey,secretReadback:false,productionEnvWrites:wrote?1:0,productionSchemaWrites:0,productionBusinessWrites:0,artifactSanitizerActuallyExecuted:true};fs.writeFileSync('.ci-artifacts/comun-48-6-b2-a2-r5-spatial-key/diagnostic.json',JSON.stringify(out,null,2)+'\n');
NODE
node scripts/assert-sanitized-artifact.mjs "$ARTIFACT_DIR/diagnostic.json" r5 || fail COMUN_48_6_B2_A2_R5_BLOCKED_ARTIFACT_SANITIZER_NOT_EXECUTED

summary "COMUN_48_6_B2_A2_R5_PREWRITE_DIAGNOSTIC_GREEN"
summary "locationKeyType=sensitive locationKeyWrites=0"
summary "spatialKeyType=sensitive spatialKeyWritten=$spatial_written"
summary "secretReadback=false artifactSanitizerActuallyExecuted=true"
summary "productionSchemaWrites=0 productionBusinessWrites=0 collectiveEnable=false mapEnable=false"

DEPLOY_OUT="$TEMP_ROOT/deploy.out"
npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$DEPLOY_OUT" 2> "$TEMP_ROOT/deploy.err" || fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT
DEPLOY_URL="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$DEPLOY_OUT" | tail -n1 | tr -d '\r')"
case "$DEPLOY_URL" in https://*.vercel.app) ;; *) fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT ;; esac
npx --yes vercel@50.28.0 inspect "$DEPLOY_URL" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null 2> "$TEMP_ROOT/inspect.err" || fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT
npx --yes vercel@50.28.0 promote "$DEPLOY_URL" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null 2> "$TEMP_ROOT/promote.err" || fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT
npx --yes vercel@50.28.0 alias set "$DEPLOY_URL" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" >/dev/null 2> "$TEMP_ROOT/alias.err" || fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT

for route in /comun /comun/denuncias /comun/relatar /comun/minha-participacao /comun/pautas; do
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online$route")"; test "$code" = 200 || fail COMUN_48_6_B2_A2_R5_BLOCKED_DEPLOYMENT
done
code="$(curl -L -sS -o /dev/null -w '%{http_code}' "https://comunsocial.online/comun/denuncias/mapa")"; test "$code" = 404 || fail COMUN_48_6_B2_A2_R5_BLOCKED_MAP_NOT_OFF
summary "COMUN_48_6_B2_A2_R5_SPATIAL_SENSITIVE_KEY_PROVISIONED_READY_FOR_PREFLIGHT"
