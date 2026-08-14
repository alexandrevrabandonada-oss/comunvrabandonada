#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-low-friction-pauta) ;; *) echo COMUN_48_3_E3_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1;; esac

temps=(); flags_started=false; rollback_complete=false; current_phase=preflight
remember() { temps+=("$1"); }
cleanup() { rm -f "${temps[@]:-}" || true; }
trap cleanup EXIT
run_vercel() { local output errors status; output="$(mktemp)"; errors="$(mktemp)"; remember "$output"; remember "$errors"; if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi; test "$status" -eq 0 || { printf 'phase=%s\ncommand=vercel\nexitCode=%s\nerrorClass=sanitized\n' "$current_phase" "$status" >> "$GITHUB_STEP_SUMMARY"; return "$status"; }; VERCEL_LAST_OUTPUT="$output"; }
set_flag() { local value="$1"; run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy() { run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback() { trap - ERR; set +e; current_phase=rollback_flag; set_flag disabled; local a=$?; current_phase=rollback_deploy; deploy; local b=$?; set -e; if [ "$a" -ne 0 ] || [ "$b" -ne 0 ]; then echo COMUN_48_3_E3_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"; return 1; fi; rollback_complete=true; echo COMUN_48_3_E3_VERCEL_ROLLBACK_GREEN >> "$GITHUB_STEP_SUMMARY"; }
on_error() { local status="$?"; trap - ERR; printf 'failedPhase=%s\nexitCode=%s\n' "$current_phase" "$status" >> "$GITHUB_STEP_SUMMARY"; if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi; exit "$status"; }
trap on_error ERR

current_phase=env_add_low_friction_pauta
if [ "$MODE" = flags-off ]; then set_flag disabled; else set_flag enabled; fi
flags_started=true
current_phase=deploy
deploy

status_get() { curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$1"; }
status_head() { curl -L -sS -I -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$1"; }
current_phase=smoke_existing_surfaces
for path in /comun /comun/pautas /comun/minha-participacao '/comun/pautas?evidencia=panorama%3Aterritory%3Acoverage'; do
  test "$(status_get "$path")" = 200
  test "$(status_head "$path")" = 200
done

if [ "$MODE" = flags-off ]; then
  current_phase=smoke_flags_off
  test "$(status_get /comun/pautas/nova)" = 404
  test "$(status_head /comun/pautas/nova)" = 404
  echo COMUN_48_3_E3_FLAGS_OFF_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  current_phase=smoke_wave1_low_friction_pauta
  test "$(status_get /comun/pautas/nova)" = 200
  test "$(status_head /comun/pautas/nova)" = 200
  page="$(mktemp)"; remember "$page"
  curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/pautas/nova" > "$page"
  grep -q 'O que você quer entender ou mudar?' "$page"
  grep -q 'Pautas são públicas' "$page"
  ! grep -Eqi 'original_text|receipt|wallet|private_location|forwarding|user_id|private_contact' "$page"
  echo COMUN_48_3_E3_WAVE1_LOW_FRICTION_PAUTA_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi
echo productionRequests=GET_HEAD_ONLY >> "$GITHUB_STEP_SUMMARY"
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
