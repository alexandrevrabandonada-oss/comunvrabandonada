#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

case "$MODE" in
  flags-off|wave1-system-metrics) ;;
  *)
    echo COMUN_48_2_C2_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"
    exit 1
    ;;
esac

temps=()
flags_started=false
rollback_complete=false
remember_temp() { temps+=("$1"); }
cleanup() { rm -f "${temps[@]:-}" || true; }
trap cleanup EXIT

classify_error() {
  local command_name="$1" exit_code="$2" error_file="$3" error_class=unknown
  if grep -Eqi 'unauthorized|invalid token|authentication|token' "$error_file"; then error_class=auth
  elif grep -Eqi 'project.*(not found|not linked)|project id|no project' "$error_file"; then error_class=project_binding
  elif grep -Eqi 'forbidden|permission|not authorized' "$error_file"; then error_class=permission
  elif grep -Eqi 'ENOTFOUND|ECONN|network|timeout|TLS' "$error_file"; then error_class=network
  elif grep -Eqi 'vercel|npm|node|curl' "$error_file"; then error_class=runtime
  fi
  printf 'command=%s\nexitCode=%s\nerrorClass=%s\n' "$command_name" "$exit_code" "$error_class" >> "$GITHUB_STEP_SUMMARY"
}

run_vercel() {
  local command_name="$1"; shift
  local output errors status
  output="$(mktemp)"; errors="$(mktemp)"
  remember_temp "$output"; remember_temp "$errors"
  if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi
  if [ "$status" -ne 0 ]; then classify_error "$command_name" "$status" "$errors"; return "$status"; fi
  VERCEL_LAST_OUTPUT="$output"
}

set_system_metrics_flag() {
  local value="$1"
  run_vercel "env_add_transport_system_metrics" bash -c \
    'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_OBSERVATORY_TRANSPORT_SYSTEM_METRICS_ENABLED production --force --yes --token "$2" --scope "$3"' \
    -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
}

deploy_promote_and_alias() {
  run_vercel deploy npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?
  local deployment_url
  deployment_url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n 1 | tr -d '\r')"
  case "$deployment_url" in https://*.vercel.app) ;; *) return 1 ;; esac
  run_vercel inspect npx --yes vercel@50.28.0 inspect "$deployment_url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?
  run_vercel promote npx --yes vercel@50.28.0 promote "$deployment_url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?
  run_vercel alias npx --yes vercel@50.28.0 alias set "$deployment_url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
}

rollback() {
  trap - ERR
  set +e
  set_system_metrics_flag disabled; local flag_status=$?
  deploy_promote_and_alias; local deploy_status=$?
  set -e
  if [ "$flag_status" -ne 0 ] || [ "$deploy_status" -ne 0 ]; then
    echo COMUN_48_2_C2_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"
    return 1
  fi
  rollback_complete=true
  echo COMUN_48_2_C2_ROLLED_BACK_FLAGS_OFF >> "$GITHUB_STEP_SUMMARY"
}

on_error() {
  local status="$?"
  trap - ERR
  if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi
  exit "$status"
}
trap on_error ERR

if [ "$MODE" = flags-off ]; then set_system_metrics_flag disabled; else set_system_metrics_flag enabled; fi
flags_started=true
deploy_promote_and_alias

for path in /comun /comun/relatar /comun/minha-participacao /comun/calcadas /comun/onibus /comun/observatorios /comun/observatorios/transporte; do
  test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200
done

transport_file="$(mktemp)"; remember_temp "$transport_file"
curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/api/comun/observatorios/transporte" > "$transport_file"
test "$(curl -L -sS -o /dev/null -w '%{http_code}' -X POST "$COMUN_BASE_URL/api/comun/observatorios/transporte")" = 405

if [ "$MODE" = flags-off ]; then
  node - "$transport_file" <<'NODE'
const api = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
if (!api.snapshot || 'systemMetrics' in api) process.exit(1);
NODE
  echo COMUN_48_2_C2_FLAGS_OFF_PRODUCTION_READ_ONLY_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  node - "$transport_file" <<'NODE'
const api = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const metrics = api.systemMetrics;
if (!metrics || metrics.snapshotId !== 'comun-transport-system-metrics-v1-20260811') process.exit(1);
const data = metrics.metrics;
if (data.passengers.items[3].value !== 23715007 || data.passengers.items[4].metricId !== 'equivalent_passengers') process.exit(1);
if (data.kilometers.items[0].value !== 806616.01 || data.kilometers.items[2].value !== 1.4521) process.exit(1);
if (data.fleet.total.value !== 132 || data.fleet.operating.value + data.fleet.reserve.value !== 132) process.exit(1);
if (data.costs.totalMonthly.value !== 6818021.85 || data.technicalFare.value !== 5.9354 || data.publicFare.value !== 5.9) process.exit(1);
const serialized = JSON.stringify(api).toLowerCase();
for (const forbidden of ['private.comun_relata_reports', 'wallet', 'forwarding', 'bus_relata', 'waiting_session', 'private_exact_location_sentinel']) {
  if (serialized.includes(forbidden)) process.exit(1);
}
NODE
  echo COMUN_48_2_C2_WAVE1_SYSTEM_METRICS_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi

echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
echo externalRuntimeRequests=0 >> "$GITHUB_STEP_SUMMARY"
echo COMUN_48_2_C2_PRODUCTION_READ_ONLY_PROOF_GREEN >> "$GITHUB_STEP_SUMMARY"
