#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-pautas-vivas) ;; *) echo COMUN_48_3_A1_ACTIVATION_MODE_INVALID >> "$GITHUB_STEP_SUMMARY"; exit 1;; esac

temps=(); flags_started=false; rollback_complete=false
remember() { temps+=("$1"); }
cleanup() { rm -f "${temps[@]:-}" || true; }
trap cleanup EXIT
run_vercel() { local output errors status; output="$(mktemp)"; errors="$(mktemp)"; remember "$output"; remember "$errors"; if "$@" >"$output" 2>"$errors"; then status=0; else status=$?; fi; test "$status" -eq 0 || { printf 'command=vercel\nexitCode=%s\nerrorClass=sanitized\n' "$status" >> "$GITHUB_STEP_SUMMARY"; return "$status"; }; VERCEL_LAST_OUTPUT="$output"; }
set_flag() { local value="$1"; run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_PAUTAS_VIVAS_CORE_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy() { run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || return $?; run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback() { trap - ERR; set +e; set_flag disabled; local a=$?; deploy; local b=$?; set -e; if [ "$a" -ne 0 ] || [ "$b" -ne 0 ]; then echo COMUN_48_3_A1_BLOCKED_VERCEL_ROLLBACK_REQUIRED >> "$GITHUB_STEP_SUMMARY"; return 1; fi; rollback_complete=true; }
on_error() { local status="$?"; trap - ERR; if [ "$flags_started" = true ] && [ "$rollback_complete" != true ]; then rollback || true; fi; exit "$status"; }
trap on_error ERR

if [ "$MODE" = flags-off ]; then set_flag disabled; else set_flag enabled; fi
flags_started=true
deploy

for path in /comun /comun/relatar /comun/minha-participacao /comun/observatorios /comun/pautas; do test "$(curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$path")" = 200; done
page="$(mktemp)"; remember "$page"
curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/pautas" > "$page"
detail_path="$(grep -Eo 'href="/comun/pautas/[^"?]+' "$page" | head -n1 | cut -d'"' -f2 || true)"
test -n "$detail_path"
detail="$(mktemp)"; remember "$detail"
curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$detail_path" > "$detail"
if [ "$MODE" = flags-off ]; then
  grep -q 'Pautas em construcao\|Pautas em construção\|Processos coletivos' "$page"
  ! grep -q 'Pautas Vivas' "$page"
  echo COMUN_48_3_A1_FLAGS_OFF_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  grep -q 'Pautas Vivas' "$page"
  grep -q 'Próximo passo\|Pr&#xF3;ximo passo' "$detail"
  grep -q 'Participar desta pauta' "$detail"
  grep -q 'Evidências públicas\|Evid&#xEA;ncias p&#xFA;blicas' "$detail"
  ! grep -Eqi 'contact_private|original_text|receipt|private_location|forwarding|user_id' "$detail"
  echo COMUN_48_3_A1_WAVE1_PAUTAS_VIVAS_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
echo COMUN_48_3_A1_PRODUCTION_READ_ONLY_PROOF_GREEN >> "$GITHUB_STEP_SUMMARY"
