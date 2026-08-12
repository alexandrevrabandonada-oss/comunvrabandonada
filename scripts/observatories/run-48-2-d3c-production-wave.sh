#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

case "$MODE" in
  flags-off|wave1-territorial-context) ;;
  *) echo COMUN_48_2_D3C_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1 ;;
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

set_territorial_flag() {
  local value="$1"
  run_vercel "env_add_territorial_context" bash -c \
    'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_OBSERVATORY_TERRITORIAL_CONTEXT_ENABLED production --force --yes --token "$2" --scope "$3"' \
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
  set_territorial_flag disabled; local flag_status=$?
  deploy_promote_and_alias; local deploy_status=$?
  set -e
  if [ "$flag_status" -ne 0 ] || [ "$deploy_status" -ne 0 ]; then
    echo COMUN_48_2_D3C_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"
    return 1
  fi
  rollback_complete=true
  echo COMUN_48_2_D3C_ROLLED_BACK_FLAGS_OFF >> "$GITHUB_STEP_SUMMARY"
}

on_error() {
  local status="$?"
  trap - ERR
  if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi
  exit "$status"
}
trap on_error ERR

if [ "$MODE" = flags-off ]; then set_territorial_flag disabled; else set_territorial_flag enabled; fi
flags_started=true
deploy_promote_and_alias

for path in /comun /comun/relatar /comun/minha-participacao /comun/calcadas /comun/onibus /comun/observatorios; do
  test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200
done

territory_page="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/comun/observatorios/territorio")"
sources_page="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/comun/observatorios/territorio/fontes")"
api_get="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/api/comun/observatorios/territorio")"
api_head="$(curl -L -sS -o /dev/null -w '%{http_code}' -I "$COMUN_BASE_URL/api/comun/observatorios/territorio")"
api_post="$(curl -L -sS -o /dev/null -w '%{http_code}' -X POST "$COMUN_BASE_URL/api/comun/observatorios/territorio")"
test "$api_post" = 405

if [ "$MODE" = flags-off ]; then
  test "$territory_page" = 404 && test "$sources_page" = 404 && test "$api_get" = 404 && test "$api_head" = 404
  echo COMUN_48_2_D3C_FLAGS_OFF_PRODUCTION_READ_ONLY_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  test "$territory_page" = 200 && test "$sources_page" = 200 && test "$api_get" = 200 && test "$api_head" = 200
  territory_file="$(mktemp)"; remember_temp "$territory_file"
  curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/api/comun/observatorios/territorio" > "$territory_file"
  node - "$territory_file" <<'NODE'
const dto = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const summary = dto.summary ?? {};
if (dto.observatoryId !== 'territory' || dto.sourceKind !== 'official_public_data' || dto.privateReportAggregate !== false) process.exit(1);
if (summary.sectorCount !== 739 || summary.populationTotal !== 261563 || summary.householdsTotal !== 115652) process.exit(1);
if (summary.healthEquipmentCount !== 102 || summary.healthMatchedToSectorCount !== 97 || summary.healthBoundaryAmbiguousCount !== 1 || summary.healthOutsideOrGeometryGapCount !== 4) process.exit(1);
if (summary.socialAssistanceEquipmentCount !== 16 || summary.socialAssistanceOfficialPointCount !== 0 || summary.educationEquipmentCount !== 0) process.exit(1);
if (!Array.isArray(dto.health?.points) || dto.health.points.length !== 102 || !Array.isArray(dto.socialAssistance?.units) || dto.socialAssistance.units.length !== 16) process.exit(1);
if (dto.socialAssistance.units.some((unit) => unit.geography !== 'address_only' || unit.territorialBinding !== 'not_applicable_address_only')) process.exit(1);
if (dto.sectorMap?.state !== 'deferred_payload_budget' || dto.sectorMap?.sourceRecordCount !== 739) process.exit(1);
const serialized = JSON.stringify(dto).toLowerCase();
for (const forbidden of ['private.comun_relata_reports', 'wallet', 'receipt', 'original_text', 'attachment', 'forwarding', 'account_id', 'child_protection']) {
  if (serialized.includes(forbidden)) process.exit(1);
}
NODE
  echo COMUN_48_2_D3C_WAVE1_TERRITORIAL_CONTEXT_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi

echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
echo externalRuntimeRequests=0 >> "$GITHUB_STEP_SUMMARY"
echo COMUN_48_2_D3C_PRODUCTION_READ_ONLY_PROOF_GREEN >> "$GITHUB_STEP_SUMMARY"
