#!/usr/bin/env bash
set -Eeuo pipefail

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
ENV_FILE="$TEMP_ROOT/production.env"
COUNTS_JSON="$TEMP_ROOT/counts.json"
AUDIT_JSON="$TEMP_ROOT/key-audit.json"
LOCATION_KEY_FILE="$TEMP_ROOT/location.key"
SPATIAL_KEY_FILE="$TEMP_ROOT/spatial.key"

mkdir -p "$ARTIFACT_DIR" "$TEMP_ROOT"
chmod 700 "$TEMP_ROOT"

summary() { printf '%s\n' "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"; }
fail() {
  printf '%s\n' "$1" >&2
  printf '{"terminal":"%s"}\n' "$1" > "$ARTIFACT_DIR/closeout.json"
  exit 1
}
cleanup() {
  rm -f "$LOCATION_KEY_FILE" "$SPATIAL_KEY_FILE" "$ENV_FILE" "$COUNTS_JSON" "$AUDIT_JSON" \
    "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON"
  rm -rf "$TEMP_ROOT"
  rm -f .vercel/project.json
  rmdir .vercel 2>/dev/null || true
}
trap cleanup EXIT

test -z "${SUPABASE_ACCESS_TOKEN:-}" || fail COMUN_48_6_B2_A2_R1_BLOCKED_REMOTE_CLI_AUTH
test -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || fail COMUN_48_6_B2_A2_R1_BLOCKED_REMOTE_CLI_AUTH
case "$SUPABASE_DB_URL" in *localhost*|*127.0.0.1*|*::1*) fail COMUN_48_6_B2_A2_R1_BLOCKED_NON_PRODUCTION_BINDING ;; esac

git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main
test "$(git rev-parse HEAD)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R1_BLOCKED_MAIN_DRIFT
test "$(git rev-parse refs/remotes/origin/main)" = "$EXPECTED_MAIN_SHA" || fail COMUN_48_6_B2_A2_R1_BLOCKED_MAIN_DRIFT

mkdir -p .vercel
node -e 'require("node:fs").writeFileSync(".vercel/project.json",JSON.stringify({orgId:process.env.VERCEL_ORG_ID,projectId:process.env.VERCEL_PROJECT_ID}))'

curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" \
  > "$PROJECT_JSON" 2> "$TEMP_ROOT/project.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_LOCATION_ENCRYPTION_KEY&limit=100" \
  > "$SHARED_LOCATION_JSON" 2> "$TEMP_ROOT/shared-location.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_SPATIAL_HMAC_KEY&limit=100" \
  > "$SHARED_SPATIAL_JSON" 2> "$TEMP_ROOT/shared-spatial.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
  > "$TEMP_ROOT/env-pull.out" 2> "$TEMP_ROOT/env-pull.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ

node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$ENV_FILE" "$AUDIT_JSON" <<'NODE'
const fs = require("node:fs");
const [projectPath, sharedLocationPath, sharedSpatialPath, envPath, outPath] = process.argv.slice(2);
const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
const sharedLocation = JSON.parse(fs.readFileSync(sharedLocationPath, "utf8"));
const sharedSpatial = JSON.parse(fs.readFileSync(sharedSpatialPath, "utf8"));
const rows = project.envs ?? project.data ?? project;
const sharedRows = (x) => x.envs ?? x.data ?? x;
const env = new Map();
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2].replace(/^"|"$/g, ""));
}
const keys = ["COMUN_RELATA_LOCATION_ENCRYPTION_KEY", "COMUN_RELATA_SPATIAL_HMAC_KEY"];
const result = {};
for (const key of keys) {
  const projectRows = rows.filter((row) => row.key === key && (row.target ?? []).includes("production"));
  const shared = key.endsWith("SPATIAL_HMAC_KEY") ? sharedRows(sharedSpatial) : sharedRows(sharedLocation);
  const validMetadata = projectRows.length <= 1 && (projectRows.length === 0 || (
    projectRows[0].type === "encrypted" &&
    JSON.stringify(projectRows[0].target ?? []) === JSON.stringify(["production"]) &&
    projectRows[0].gitBranch == null &&
    !(projectRows[0].customEnvironmentIds ?? []).length
  ));
  let validShape = false;
  try { validShape = Buffer.from(env.get(key) ?? "", "base64url").length === 32; } catch {}
  result[key] = {
    projectMatches: projectRows.length,
    sharedMatches: shared.filter((row) => row.key === key).length,
    projectEnvIdKnown: projectRows.length === 1,
    type: projectRows[0]?.type ?? "absent",
    target: projectRows[0]?.target ?? [],
    gitBranch: projectRows[0]?.gitBranch ?? null,
    customEnvironmentIds: projectRows[0]?.customEnvironmentIds ?? [],
    validMetadata,
    present: validShape,
    validShape,
  };
}
const location = result.COMUN_RELATA_LOCATION_ENCRYPTION_KEY;
const spatial = result.COMUN_RELATA_SPATIAL_HMAC_KEY;
result.keysDistinct = location.validShape && spatial.validShape
  ? env.get("COMUN_RELATA_LOCATION_ENCRYPTION_KEY") !== env.get("COMUN_RELATA_SPATIAL_HMAC_KEY")
  : null;
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
NODE

node - "$AUDIT_JSON" <<'NODE'
const fs = require("node:fs");
const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const key of ["COMUN_RELATA_LOCATION_ENCRYPTION_KEY", "COMUN_RELATA_SPATIAL_HMAC_KEY"]) {
  const v = x[key];
  if (v.projectMatches > 1 || v.sharedMatches > 0 || !v.validMetadata) {
    throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEY_METADATA_CONFLICT");
  }
  if (v.projectMatches === 1 && !v.present) {
    throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_EXISTING_KEY_NOT_READABLE");
  }
}
if (x.keysDistinct === false) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEYS_NOT_DISTINCT");
NODE

psql "$SUPABASE_DB_URL" -qXAt -v ON_ERROR_STOP=1 > "$COUNTS_JSON" 2> "$TEMP_ROOT/counts.err" <<'SQL'
begin read only;
select json_build_object(
  'privateLocationCount', (select count(*) from private.comun_relata_private_locations),
  'matchKeyCount', (select count(*) from private.comun_relata_case_match_keys)
);
rollback;
SQL

node - "$AUDIT_JSON" "$COUNTS_JSON" <<'NODE'
const fs = require("node:fs");
const audit = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const counts = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const location = audit.COMUN_RELATA_LOCATION_ENCRYPTION_KEY;
const spatial = audit.COMUN_RELATA_SPATIAL_HMAC_KEY;
if (!location.present && Number(counts.privateLocationCount) > 0) {
  throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_LOCATION_KEY_ROTATION_REQUIRED");
}
if (!spatial.present && Number(counts.matchKeyCount) > 0) {
  throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_SPATIAL_KEY_ROTATION_REQUIRED");
}
fs.writeFileSync(".ci-artifacts/comun-48-6-b2-a2-r1-secret-provisioning/pre-state.json", JSON.stringify({
  locationKey: { present: location.present, validShape: location.validShape },
  spatialKey: { present: spatial.present, validShape: spatial.validShape },
  keysDistinct: audit.keysDistinct,
  privateLocationCount: Number(counts.privateLocationCount),
  matchKeyCount: Number(counts.matchKeyCount),
  productionOnly: true,
}, null, 2) + "\n");
NODE

generate_key() {
  local destination="$1"
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))' > "$destination"
  chmod 600 "$destination"
}

create_key_if_absent() {
  local key="$1"
  local key_file="$2"
  local response="$TEMP_ROOT/${key}.response"
  local request="$TEMP_ROOT/${key}.request.json"
  local status
  generate_key "$key_file"
  node - "$key" "$key_file" "$request" <<'NODE'
const fs = require("node:fs");
const [key, keyPath, outPath] = process.argv.slice(2);
fs.writeFileSync(outPath, JSON.stringify({
  key,
  value: fs.readFileSync(keyPath, "utf8"),
  type: "encrypted",
  target: ["production"],
}) + "\n");
NODE
  status="$(curl -sS -o "$response" -w '%{http_code}' -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
    --data-binary "@$request" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
    2> "$TEMP_ROOT/${key}.curl.err")"
  case "$status" in 2??) ;; *) fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_ENV_WRITE ;; esac
}

audit_key_state() {
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID&decrypt=false&limit=100" \
    > "$PROJECT_JSON" 2> "$TEMP_ROOT/project-post.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
  npx --yes vercel@50.28.0 env pull "$ENV_FILE" --environment=production --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
    > "$TEMP_ROOT/env-post.out" 2> "$TEMP_ROOT/env-post.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_LOCATION_ENCRYPTION_KEY&limit=100" \
    > "$SHARED_LOCATION_JSON" 2> "$TEMP_ROOT/shared-location-post.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v1/env?teamId=$VERCEL_ORG_ID&search=COMUN_RELATA_SPATIAL_HMAC_KEY&limit=100" \
    > "$SHARED_SPATIAL_JSON" 2> "$TEMP_ROOT/shared-spatial-post.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_VERCEL_READ
  node - "$PROJECT_JSON" "$SHARED_LOCATION_JSON" "$SHARED_SPATIAL_JSON" "$ENV_FILE" "$AUDIT_JSON" <<'NODE'
const fs = require("node:fs");
const project = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sharedLocation = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const sharedSpatial = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const env = new Map();
for (const line of fs.readFileSync(process.argv[5], "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env.set(match[1], match[2].replace(/^"|"$/g, ""));
}
const rows = project.envs ?? project.data ?? project;
const sharedRows = (x) => x.envs ?? x.data ?? x;
const out = {};
for (const key of ["COMUN_RELATA_LOCATION_ENCRYPTION_KEY", "COMUN_RELATA_SPATIAL_HMAC_KEY"]) {
  const matches = rows.filter((row) => row.key === key && (row.target ?? []).includes("production"));
  const shared = key.endsWith("SPATIAL_HMAC_KEY") ? sharedRows(sharedSpatial) : sharedRows(sharedLocation);
  let validShape = false;
  try { validShape = Buffer.from(env.get(key) ?? "", "base64url").length === 32; } catch {}
  out[key] = {
    projectMatches: matches.length,
    sharedMatches: shared.filter((row) => row.key === key).length,
    projectEnvIdKnown: matches.length === 1,
    type: matches[0]?.type ?? "absent",
    target: matches[0]?.target ?? [],
    gitBranch: matches[0]?.gitBranch ?? null,
    customEnvironmentIds: matches[0]?.customEnvironmentIds ?? [],
    validMetadata: matches.length === 1 && matches[0].type === "encrypted" && JSON.stringify(matches[0].target ?? []) === JSON.stringify(["production"]) && matches[0].gitBranch == null && !(matches[0].customEnvironmentIds ?? []).length,
    present: validShape,
    validShape,
  };
}
const location = out.COMUN_RELATA_LOCATION_ENCRYPTION_KEY;
const spatial = out.COMUN_RELATA_SPATIAL_HMAC_KEY;
out.keysDistinct = location.validShape && spatial.validShape
  ? env.get("COMUN_RELATA_LOCATION_ENCRYPTION_KEY") !== env.get("COMUN_RELATA_SPATIAL_HMAC_KEY")
  : null;
  fs.writeFileSync(process.argv[6], JSON.stringify(out, null, 2) + "\n");
NODE
}

ENV_WRITES=0
PRE_STATE="$(node -e 'const fs=require("node:fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(JSON.stringify(x))' "$AUDIT_JSON")"

if [[ "$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(String(x.COMUN_RELATA_LOCATION_ENCRYPTION_KEY.present))' "$PRE_STATE")" != true ]]; then
  create_key_if_absent COMUN_RELATA_LOCATION_ENCRYPTION_KEY "$LOCATION_KEY_FILE"
  ENV_WRITES=$((ENV_WRITES + 1))
  audit_key_state
fi
if [[ "$(node -e 'const x=JSON.parse(process.argv[1]);process.stdout.write(String(x.COMUN_RELATA_SPATIAL_HMAC_KEY.present))' "$PRE_STATE")" != true ]]; then
  create_key_if_absent COMUN_RELATA_SPATIAL_HMAC_KEY "$SPATIAL_KEY_FILE"
  ENV_WRITES=$((ENV_WRITES + 1))
  audit_key_state
fi

node - "$AUDIT_JSON" "$ENV_WRITES" <<'NODE'
const fs = require("node:fs");
const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const key of ["COMUN_RELATA_LOCATION_ENCRYPTION_KEY", "COMUN_RELATA_SPATIAL_HMAC_KEY"]) {
  const v = x[key];
  if (v.projectMatches !== 1 || v.type !== "encrypted" || JSON.stringify(v.target) !== JSON.stringify(["production"]) || v.gitBranch !== null || v.customEnvironmentIds.length !== 0 || !v.present || !v.validShape) {
    throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEY_POSTCHECK");
  }
}
if (x.keysDistinct !== true) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEYS_NOT_DISTINCT");
fs.writeFileSync(".ci-artifacts/comun-48-6-b2-a2-r1-secret-provisioning/key-post.json", JSON.stringify({
  locationKey: "VALID",
  spatialHmacKey: "VALID",
  keysDistinct: true,
  productionOnly: true,
  envWrites: Number(process.argv[3]),
}, null, 2) + "\n");
NODE

printf '{"productionEnvWrites":%s,"businessWrites":0,"schemaWrites":0,"map":"OFF_OR_ABSENT","collective":"OFF"}\n' "$ENV_WRITES" \
  > "$ARTIFACT_DIR/write-accounting.json"
summary "COMUN_48_6_B2_A2_R1_KEYS_PROVISIONED_SANITIZED"
summary "productionEnvWrites=$ENV_WRITES"
summary "productionBusinessWrites=0"
summary "productionSchemaWrites=0"
summary "map=OFF_OR_ABSENT"
summary "collective=OFF"

DEPLOY_OUT="$TEMP_ROOT/deploy.out"
npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
  > "$DEPLOY_OUT" 2> "$TEMP_ROOT/deploy.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_DEPLOYMENT
DEPLOY_URL="$(grep -Eo 'https://[^[:space:]]+\.vercel\.app' "$DEPLOY_OUT" | tail -n1 | tr -d '\r')"
case "$DEPLOY_URL" in https://*.vercel.app) ;; *) fail COMUN_48_6_B2_A2_R1_BLOCKED_DEPLOYMENT ;; esac
npx --yes vercel@50.28.0 inspect "$DEPLOY_URL" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
  > "$TEMP_ROOT/inspect.out" 2> "$TEMP_ROOT/inspect.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_DEPLOYMENT
npx --yes vercel@50.28.0 promote "$DEPLOY_URL" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
  > "$TEMP_ROOT/promote.out" 2> "$TEMP_ROOT/promote.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_DEPLOYMENT
npx --yes vercel@50.28.0 alias set "$DEPLOY_URL" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" \
  > "$TEMP_ROOT/alias.out" 2> "$TEMP_ROOT/alias.err" || fail COMUN_48_6_B2_A2_R1_BLOCKED_DEPLOYMENT

node - "$AUDIT_JSON" "$DEPLOY_URL" "$ENV_WRITES" <<'NODE'
const fs = require("node:fs");
const x = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const result = {
  terminal: "COMUN_48_6_B2_A2_R1_SECRET_PROVISIONING_GREEN_READY_FOR_PREFLIGHT",
  locationKey: "VALID",
  spatialHmacKey: "VALID",
  keysDistinct: x.keysDistinct === true,
  productionOnly: true,
  productionEnvWrites: Number(process.argv[4]),
  productionBusinessWrites: 0,
  productionSchemaWrites: 0,
  deploymentCreated: true,
  deploymentUrlPresent: Boolean(process.argv[3]),
  migrationApplied: false,
  collectiveEnable: false,
  mapEnable: false,
};
if (!result.keysDistinct) throw new Error("COMUN_48_6_B2_A2_R1_BLOCKED_KEYS_NOT_DISTINCT");
fs.writeFileSync(".ci-artifacts/comun-48-6-b2-a2-r1-secret-provisioning/closeout.json", JSON.stringify(result, null, 2) + "\n");
NODE
summary "COMUN_48_6_B2_A2_R1_SECRET_PROVISIONING_GREEN_READY_FOR_PREFLIGHT"
