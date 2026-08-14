#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-cycle-memory) ;; *) echo COMUN_48_3_D1_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1;; esac

temps=(); flags_started=false; rollback_complete=false; current_phase=preflight
remember() { temps+=("$1"); }
cleanup() { rm -f "${temps[@]:-}" || true; }
trap cleanup EXIT
run_vercel() { local output errors status; output="$(mktemp)"; errors="$(mktemp)"; remember "$output"; remember "$errors"; if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi; test "$status" -eq 0 || { printf 'phase=%s\ncommand=vercel\nexitCode=%s\nerrorClass=sanitized\n' "$current_phase" "$status" >> "$GITHUB_STEP_SUMMARY"; return "$status"; }; VERCEL_LAST_OUTPUT="$output"; }
set_flag() { local value="$1"; run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_PAUTA_CYCLE_MEMORY_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy() { run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback() { trap - ERR; set +e; current_phase=rollback_flag; set_flag disabled; local a=$?; current_phase=rollback_deploy; deploy; local b=$?; set -e; if [ "$a" -ne 0 ] || [ "$b" -ne 0 ]; then echo COMUN_48_3_D1_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"; return 1; fi; rollback_complete=true; echo COMUN_48_3_D1_VERCEL_ROLLBACK_GREEN >> "$GITHUB_STEP_SUMMARY"; }
on_error() { local status="$?"; trap - ERR; printf 'failedPhase=%s\nexitCode=%s\n' "$current_phase" "$status" >> "$GITHUB_STEP_SUMMARY"; if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi; exit "$status"; }
trap on_error ERR

current_phase=env_add_cycle_memory
if [ "$MODE" = flags-off ]; then set_flag disabled; else set_flag enabled; fi
flags_started=true
current_phase=deploy
deploy

current_phase=smoke_existing_surfaces
for path in /comun /comun/relatar /comun/minha-participacao /comun/pautas /comun/acoes; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200; done
index="$(mktemp)"; remember "$index"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/pautas" > "$index"
pauta_path="$(grep -Eo 'href="/comun/pautas/[^"?]+' "$index" | head -n1 | cut -d'"' -f2 || true)"; test -n "$pauta_path"
pauta="$(mktemp)"; remember "$pauta"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$pauta_path" > "$pauta"
grep -q 'Pauta Viva' "$pauta"
! grep -Eqi 'contact_private|moderation_note_private|member_user_id|created_by_admin_id|responsible_internal|storage_path|signed_url|original_text|private_location' "$pauta"
if [ "$MODE" = flags-off ]; then
  current_phase=smoke_flags_off
  ! grep -q 'O caminho até aqui' "$pauta"
  ! grep -q 'O que aconteceu com esta pauta?' "$pauta"
  grep -q 'Memória' "$pauta"
  echo COMUN_48_3_D1_FLAGS_OFF_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  current_phase=smoke_wave1_memory
  grep -Eq 'O caminho até aqui|O que aconteceu com esta pauta\?' "$pauta"
  grep -q 'A questão' "$pauta"
  grep -q 'E agora?' "$pauta"
  ! grep -q 'DIVERGENT_SEARCH_INDEX_SENTINEL' "$pauta"
  echo COMUN_48_3_D1_WAVE1_CANONICAL_MEMORY_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi
echo productionRequests=GET_ONLY >> "$GITHUB_STEP_SUMMARY"
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
