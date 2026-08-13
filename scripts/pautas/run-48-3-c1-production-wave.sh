#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-canonical-actions) ;; *) echo COMUN_48_3_C1_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1;; esac

temps=(); flags_started=false; rollback_complete=false
remember() { temps+=("$1"); }
cleanup() { rm -f "${temps[@]:-}" || true; }
trap cleanup EXIT
run_vercel() { local output errors status; output="$(mktemp)"; errors="$(mktemp)"; remember "$output"; remember "$errors"; if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi; test "$status" -eq 0 || { printf 'command=vercel\nexitCode=%s\nerrorClass=sanitized\n' "$status" >> "$GITHUB_STEP_SUMMARY"; return "$status"; }; VERCEL_LAST_OUTPUT="$output"; }
set_flag() { local value="$1"; run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy() { run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback() { trap - ERR; set +e; set_flag disabled; local a=$?; deploy; local b=$?; set -e; if [ "$a" -ne 0 ] || [ "$b" -ne 0 ]; then echo COMUN_48_3_C1_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"; return 1; fi; rollback_complete=true; }
on_error() { local status="$?"; trap - ERR; if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi; exit "$status"; }
trap on_error ERR

if [ "$MODE" = flags-off ]; then set_flag disabled; else set_flag enabled; fi
flags_started=true
deploy

for path in /comun /comun/relatar /comun/minha-participacao /comun/pautas /comun/acoes; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200; done
actions="$(mktemp)"; remember "$actions"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/acoes" > "$actions"
action_path="$(grep -Eo 'href="/comun/acoes/[^"?]+' "$actions" | head -n1 | cut -d'"' -f2 || true)"
if [ "$MODE" = flags-off ]; then
  ! grep -q 'Mobilizações concretas com objetivo' "$actions"
  if [ -n "$action_path" ]; then test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$action_path")" = 200; fi
  echo COMUN_48_3_C1_FLAGS_OFF_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  grep -q 'Mobilizações concretas com objetivo' "$actions"
  if [ -n "$action_path" ]; then
    action="$(mktemp)"; remember "$action"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$action_path" > "$action"
    grep -Eq 'O que vamos fazer|O que aconteceu' "$action"
    ! grep -Eqi 'contribution_note_private|member_user_id|created_by_admin_id|private_location|original_text' "$action"
    pauta_path="$(grep -Eo 'href="/comun/pautas/[^"?]+' "$action" | head -n1 | cut -d'"' -f2 || true)"
    if [ -n "$pauta_path" ]; then
      pauta="$(mktemp)"; remember "$pauta"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$pauta_path" > "$pauta"
      grep -q 'O que estamos fazendo' "$pauta"
    fi
    echo publicCollectiveActionAvailable=true >> "$GITHUB_STEP_SUMMARY"
  else
    grep -q 'Nenhuma ação pública nesta etapa agora' "$actions"
    echo publicCollectiveActionAvailable=false >> "$GITHUB_STEP_SUMMARY"
  fi
  echo COMUN_48_3_C1_WAVE1_CANONICAL_ACTIONS_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
