#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-solidarity-economy) ;; *) exit 1;; esac

temps=(); remember(){ temps+=("$1"); }; cleanup(){ rm -f "${temps[@]:-}" || true; }; trap cleanup EXIT
run_vercel(){ local out err status=0; out="$(mktemp)"; err="$(mktemp)"; remember "$out"; remember "$err"; "$@" >"$out" 2>"$err" || status=$?; test "$status" -eq 0; VERCEL_LAST_OUTPUT="$out"; }
set_flag(){ local value="$1"; run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"; }
deploy(){ run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; local url; url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT" | tail -n1 | tr -d '\r')"; case "$url" in https://*.vercel.app) ;; *) return 1;; esac; run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"; }
rollback(){ set +e; set_flag disabled; deploy; set -e; echo COMUN_48_4_A1_VERCEL_ROLLBACK_GREEN >> "$GITHUB_STEP_SUMMARY"; }
trap 'status=$?; trap - ERR; rollback || true; exit $status' ERR

if [ "$MODE" = flags-off ]; then set_flag disabled; else set_flag enabled; fi
deploy
status(){ curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 "$COMUN_BASE_URL$1"; }
for path in /comun /comun/participar /comun/cooperativas; do test "$(status "$path")" = 200; done
page="$(mktemp)"; remember "$page"; curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/cooperativas" >"$page"
if [ "$MODE" = flags-off ]; then
  grep -q 'Cooperativas e economia solidária' "$page"
  ! grep -q '>Feirinha<' "$page"
  echo COMUN_48_4_A1_FLAGS_OFF_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
else
  grep -q '>Feirinha<' "$page"
  grep -q 'O que está disponível' "$page"
  grep -q 'Do que estamos precisando' "$page"
  grep -q 'Quem faz parte da rede' "$page"
  ! grep -Eqi 'private_contact|internal_notes|responsible_internal|receipt|wallet|private_location|attachment|user_id' "$page"
  echo COMUN_48_4_A1_WAVE1_PRODUCTION_GREEN >> "$GITHUB_STEP_SUMMARY"
fi
echo productionRequests=GET_HEAD_ONLY >> "$GITHUB_STEP_SUMMARY"
echo businessWrites=0 >> "$GITHUB_STEP_SUMMARY"
