#!/usr/bin/env bash
set -Eeuo pipefail

# Legacy entrypoint retained for workflow compatibility. Cryptographic keys are
# write-only Vercel sensitive variables; this runner never pulls or compares
# their values. New controlled runs should use the R5 workflow.
EXPECTED_MAIN_SHA="${EXPECTED_MAIN_SHA:?EXPECTED_MAIN_SHA is required}"
SUPABASE_DB_URL="${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
VERCEL_TOKEN="${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
VERCEL_ORG_ID="${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
ARTIFACT_DIR=".ci-artifacts/comun-48-6-b2-a2-r1-secret-provisioning"
TEMP_ROOT="${RUNNER_TEMP:-$(mktemp -d)}/comun-b2-a2-r1-${GITHUB_RUN_ID:-local}-$$"
PROJECT_JSON="$TEMP_ROOT/project.json"
SHARED_LOCATION_JSON="$TEMP_ROOT/shared-location.json"
SHARED_SPATIAL_JSON="$TEMP_ROOT/shared-spatial.json"
COUNTS_JSON="$TEMP_ROOT/counts.json"
SPATIAL_KEY_FILE="$TEMP_ROOT/spatial.key"

mkdir -p "$ARTIFACT_DIR" "$TEMP_ROOT"
chmod 700 "$TEMP_ROOT"
summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
fail() { printf '%s\n' "$1" >&2; printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"; exit 1; }
cleanup() { rm -f "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$COUNTS_JSON" "$SPATIAL_KEY_FILE"; rm -rf "$TEMP_ROOT"; }
trap cleanup EXIT

test -z "${SUPABASE_ACCESS_TOKEN:-}" || fail COMUN_48_6_B2_A2_R1_BLOCKED_REMOTE_CLI_AUTH
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || fail COMUN_48_6_B2_A2_R1_BLOCKED_REMOTE_CLI_AUTH
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_6_B2_A2_R1_BLOCKED_NON_PRODUCTION_BINDING ;; esac
git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R1_BLOCKED_MAIN_DRIFT
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R1_BLOCKED_MAIN_DRIFT

metadata() {
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" > "$PROJECT_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_LOCATION_ENCRYPTION_KEY&limit=100" > "$SHARED_LOCATION_JSON"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_SPATIAL_HMAC_KEY&limit=100" > "$SHARED_SPATIAL_JSON"
}
metadata || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ

node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$ARTIFACT_DIR/pre-state.json" <<'NODE'
const fs = require("node:fs");
const [projectPath, locationPath, spatialPath, outPath] = process.argv.slice(2);
const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
const rows = project.envs ?? project.data ?? project;
const readRows = (file) => { const x = JSON.parse(fs.readFileSync(file, "utf8")); return x.envs ?? x.data ?? x; };
const shared = (file, key) => readRows(file).filter((row) => row.key === key).length;
const exact = (key) => { const matches = rows.filter((row) => row.key === key && (row.target ?? []).includes("production")); return { projectMatches: matches.length, type: matches[0]?.type ?? "absent", productionOnly: matches.length === 1 && matches[0].type === "sensitive" && JSON.stringify(matches[0].target ?? []) === JSON.stringify(["production"]) && matches[0].gitBranch == null && !(matches[0].customEnvironmentIds ?? []).length }; };
const location = exact("COMUN_RELATA_LOCATION_ENCRYPTION_KEY");
const spatial = exact("COMUN_RELATA_SPATIAL_HMAC_KEY");
location.sharedMatches = shared(locationPath, "COMUN_RELATA_LOCATION_ENCRYPTION_KEY");
spatial.sharedMatches = shared(spatialPath, "COMUN_RELATA_SPATIAL_HMAC_KEY");
if (location.projectMatches !== 1 || !location.productionOnly || location.sharedMatches !== 0) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEY_METADATA_CONFLICT");
if (spatial.projectMatches > 1 || spatial.sharedMatches !== 0 || (spatial.projectMatches === 1 && !spatial.productionOnly)) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEY_METADATA_CONFLICT");
fs.writeFileSync(outPath, JSON.stringify({ locationKey: { present: true, type: location.type, productionOnly: true }, spatialKey: { present: spatial.projectMatches === 1, type: spatial.type, productionOnly: spatial.productionOnly }, secretReadback: false }, null, 2) + "\n");
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$COUNTS_JSON" <<'SQL'
begin read only;
select json_build_object('transactionReadOnly', current_setting('transaction_read_only')='on', 'privateLocationCount', (select count(*) from private.comun_relata_private_locations), 'matchKeyCount', (select count(*) from private.comun_relata_case_match_keys));
rollback;
SQL
node - "$COUNTS_JSON" <<'NODE'
const fs = require("node:fs"); const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); if (!x.transactionReadOnly) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_NON_READ_ONLY_PREFLIGHT"); const state = JSON.parse(fs.readFileSync(".ci-artifacts/comun-48-6-b2-a2-r1-secret-provisioning/pre-state.json", "utf8")); if (!state.spatialKey.present && Number(x.matchKeyCount) > 0) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_SPATIAL_KEY_ROTATION_REQUIRED"); if (Number(x.privateLocationCount) > 0 && !state.locationKey.present) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_LOCATION_KEY_ROTATION_REQUIRED");
NODE

if ! node - "$PROJECT_JSON" <<'NODE'
const fs = require("node:fs"); const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); const rows = x.envs ?? x.data ?? x; process.exit(rows.some((row) => row.key === "COMUN_RELATA_SPATIAL_HMAC_KEY" && (row.target ?? []).includes("production")) ? 0 : 1);
NODE
then
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))' > "$SPATIAL_KEY_FILE"
  chmod 600 "$SPATIAL_KEY_FILE"
  node - "$SPATIAL_KEY_FILE" <<'NODE'
const fs=require("node:fs"); const x=fs.readFileSync(process.argv[2],"utf8").trim(); if(Buffer.from(x,"base64url").length!==32) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_SPATIAL_KEY_SHAPE");
NODE
  if ! cat "$SPATIAL_KEY_FILE" | npx --yes vercel@50.28.0 env add COMUN_RELATA_SPATIAL_HMAC_KEY production --sensitive --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" > "$TEMP_ROOT/env-add.out" 2> "$TEMP_ROOT/env-add.err"; then fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_ENV_WRITE; fi
  env_writes=1
else
  env_writes=0
fi
metadata || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
node - "$PROJECT_JSON" "$ARTIFACT_DIR/key-post.json" <<'NODE'
const fs=require("node:fs"); const x=JSON.parse(fs.readFileSync(process.argv[2],"utf8")); const rows=x.envs??x.data??x; const exact=k=>{const a=rows.filter(v=>v.key===k&&(v.target??[]).includes("production"));return a.length===1&&a[0].type==='sensitive'&&JSON.stringify(a[0].target??[])===JSON.stringify(['production'])&&a[0].gitBranch==null&&!(a[0].customEnvironmentIds??[]).length;};if(!exact('COMUN_RELATA_LOCATION_ENCRYPTION_KEY')||!exact('COMUN_RELATA_SPATIAL_HMAC_KEY'))throw new Error('COMUN_48_6_B2_A2_R1_BLOCKED_KEY_POSTCHECK');fs.writeFileSync(process.argv[3],JSON.stringify({locationKey:'VALIDATED_EXISTING_SENSITIVE',spatialKey:'VALIDATED_SENSITIVE',secretReadback:false})+'\n');
NODE
printf '{"productionEnvWrites":%s,"locationKeyWrites":0,"businessWrites":0,"schemaWrites":0,"map":"OFF_OR_ABSENT","collective":"OFF","secretReadback":false}\n' "$env_writes" > "$ARTIFACT_DIR/write-accounting.json"
summary "COMUN_48_6_B2_A2_R1_SENSITIVE_KEYS_READY_FOR_PREFLIGHT"
summary "productionEnvWrites=$env_writes"
summary "locationKeyWrites=0"
summary "secretReadback=false"
