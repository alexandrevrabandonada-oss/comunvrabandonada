#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-power-interruptions) ;; *) echo COMUN_48_2_E2_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1;; esac

temps=(); flags_started=false; rollback_complete=false
remember() { temps+=("$1"); }; cleanup() { rm -f "${temps[@]:-}" || true; }; trap cleanup EXIT
classify_error() { local command_name="$1" exit_code="$2" error_file="$3" error_class=unknown; if grep -Eqi 'unauthorized|invalid token|authentication|token' "$error_file"; then error_class=auth; elif grep -Eqi 'project.*(not found|not linked)|project id|no project' "$error_file"; then error_class=project_binding; elif grep -Eqi 'forbidden|permission|not authorized' "$error_file"; then error_class=permission; elif grep -Eqi 'ENOTFOUND|ECONN|network|timeout|TLS' "$error_file"; then error_class=network; elif grep -Eqi 'vercel|npm|node|curl' "$error_file"; then error_class=runtime; fi; printf 'command=%s\nexitCode=%s\nerrorClass=%s\n' "$command_name" "$exit_code" "$error_class" >> "$GITHUB_STEP_SUMMARY"; }
run_vercel() { local command_name="$1"; shift; local output errors status; output="$(mktemp)"; errors="$(mktemp)"; remember "$output"; remember "$errors"; if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi; if [ "$status" -ne 0 ]; then classify_error "$command_name" "$status" "$errors"; return "$status"; fi; VERCEL_LAST_OUTPUT="$output"; }
set_power_flag() { local value="$1"; run_vercel env_add_power bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy_promote_alias() { run_vercel deploy npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel inspect npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel promote npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel alias npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback() { trap - ERR; set +e; set_power_flag disabled; local flag_status=$?; deploy_promote_alias; local deploy_status=$?; set -e; if [ "$flag_status" -ne 0 ] || [ "$deploy_status" -ne 0 ]; then echo COMUN_48_2_E2_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"; return 1; fi; rollback_complete=true; echo COMUN_48_2_E2_ROLLED_BACK_FLAGS_OFF >> "$GITHUB_STEP_SUMMARY"; }
on_error() { local status="$?"; trap - ERR; if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi; exit "$status"; }; trap on_error ERR

if [ "$MODE" = flags-off ]; then set_power_flag disabled; else set_power_flag enabled; fi
flags_started=true; deploy_promote_alias
for path in /comun /comun/relatar /comun/minha-participacao /comun/calcadas /comun/onibus /comun/observatorios; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200; done
hub="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/comun/observatorios/servicos-essenciais")"; energy="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/comun/observatorios/servicos-essenciais/energia")"; sources="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/comun/observatorios/servicos-essenciais/energia/fontes")"; api="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/api/comun/observatorios/servicos-essenciais/energia")"; records="$(curl -L -sS -o /dev/null -w '%{http_code}' "$COMUN_BASE_URL/api/comun/observatorios/servicos-essenciais/energia/interrupcoes")"; head="$(curl -L -sS -o /dev/null -w '%{http_code}' -I "$COMUN_BASE_URL/api/comun/observatorios/servicos-essenciais/energia")"; post="$(curl -L -sS -o /dev/null -w '%{http_code}' -X POST "$COMUN_BASE_URL/api/comun/observatorios/servicos-essenciais/energia")"; test "$post" = 405
if [ "$MODE" = flags-off ]; then test "$hub" = 404 && test "$energy" = 404 && test "$sources" = 404 && test "$api" = 404 && test "$records" = 404 && test "$head" = 404; echo COMUN_48_2_E2_FLAGS_OFF_PRODUCTION_READ_ONLY_GREEN >> "$GITHUB_STEP_SUMMARY"; else test "$hub" = 200 && test "$energy" = 200 && test "$sources" = 200 && test "$api" = 200 && test "$records" = 200 && test "$head" = 200; dto="$(mktemp)"; remember "$dto"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/api/comun/observatorios/servicos-essenciais/energia" > "$dto"; node - "$dto" <<'NODE'
const dto=JSON.parse(require('node:fs').readFileSync(process.argv[2],'utf8'));
if(dto.observatoryId!=='essential-power-interruptions'||dto.sourceKind!=='official_public_data'||dto.privateReportAggregate!==false)process.exit(1);
if(dto.recordCount!==5676||dto.reference?.latestPublishedCompetence!=='2026-06'||dto.reference?.completeCalendarYear!==false)process.exit(1);
if(JSON.stringify(dto).match(/wallet|relata|receipt|attachment|account_id/i))process.exit(1);
NODE
echo COMUN_48_2_E2_WAVE1_POWER_INTERRUPTION_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"; fi
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"; echo externalRuntimeRequests=0 >> "$GITHUB_STEP_SUMMARY"; echo COMUN_48_2_E2_PRODUCTION_READ_ONLY_PROOF_GREEN >> "$GITHUB_STEP_SUMMARY"
