#!/usr/bin/env bash
set -euo pipefail

artifact_dir="${1:?artifact directory is required}"
mkdir -p "$artifact_dir"
diagnostic="$artifact_dir/supabase-reset-health.json"
private_log="$(mktemp)"
cleanup() { rm -f "$private_log"; }
trap cleanup EXIT

printf '%s\n' '{"status":"started","scope":"disposable_local","containsSecrets":false}' >"$diagnostic"

set +e
supabase db reset --local --yes >"$private_log" 2>&1
reset_status=$?
set -e

if [[ "$reset_status" -eq 0 ]]; then
  printf '%s\n' '{"status":"reset_complete","transientRecovery":false,"containsSecrets":false}' >"$diagnostic"
  exit 0
fi

transient_class=""
if grep -Eqi '(error status|http status) 502' "$private_log" && grep -Eqi 'invalid response.*upstream|upstream server' "$private_log"; then
  transient_class="UPSTREAM_502"
elif grep -Eqi '(error status|http status) 503' "$private_log" && grep -Eqi 'service unavailable|upstream' "$private_log"; then
  transient_class="UPSTREAM_503"
elif grep -Eqi '(error status|http status) 504' "$private_log" && grep -Eqi 'gateway|upstream|timeout' "$private_log"; then
  transient_class="UPSTREAM_504"
fi

if [[ -z "$transient_class" ]] || ! grep -q 'Applying migration 20260912161253_radio_editorial_revision_identity.sql' "$private_log" || ! grep -q 'Seeding data from supabase/seed.sql' "$private_log"; then
  printf '%s\n' '{"status":"failed_closed","reason":"reset_incomplete_or_non_transient","containsSecrets":false}' >"$diagnostic"
  echo COMUN_SUPABASE_RESET_FAILED_CLOSED >&2
  exit "$reset_status"
fi

local_env="$(node scripts/ci/read-supabase-local-env.mjs)" || {
  printf '%s\n' "{\"status\":\"failed_closed\",\"reason\":\"status_unhealthy\",\"class\":\"$transient_class\",\"containsSecrets\":false}" >"$diagnostic"
  exit 1
}
value() { printf '%s\n' "$local_env" | sed -n "s/^$1=\"\(.*\)\"$/\1/p"; }
api_url="$(value API_URL)"
anon_key="$(value ANON_KEY)"
service_key="$(value SERVICE_ROLE_KEY)"
db_url="$(value DB_URL)"
[[ "$api_url" =~ ^http://127\.0\.0\.1:[0-9]+$ ]]
[[ "$db_url" =~ ^postgresql://postgres:postgres@127\.0\.0\.1:[0-9]+/postgres$ ]]

ledger_count="$(psql "$db_url" -Atv ON_ERROR_STOP=1 -c "select count(*) from supabase_migrations.schema_migrations where version='20260912161253'")"
[[ "$ledger_count" == "1" ]]
fingerprint="$(psql "$db_url" -Atv ON_ERROR_STOP=1 -c "select encode(digest(string_agg(version, ',' order by version), 'sha256'),'hex') from supabase_migrations.schema_migrations")"
[[ "$fingerprint" =~ ^[0-9a-f]{64}$ ]]
curl --fail --silent --show-error "$api_url/auth/v1/health" >/dev/null
curl --fail --silent --show-error --header "apikey: $anon_key" "$api_url/rest/v1/" >/dev/null
curl --fail --silent --show-error --header "Authorization: Bearer $service_key" --header "apikey: $service_key" "$api_url/storage/v1/bucket" >/dev/null

printf '%s\n' "{\"status\":\"recovered_after_completed_reset\",\"class\":\"$transient_class\",\"migrationLedgerCount\":1,\"fingerprintPresent\":true,\"dbHealthy\":true,\"authHealthy\":true,\"postgrestHealthy\":true,\"storageHealthy\":true,\"containsSecrets\":false}" >"$diagnostic"
echo COMUN_SUPABASE_RESET_TRANSIENT_RECOVERED
