#!/usr/bin/env bash
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"

temps=();remember(){ temps+=("$1");};cleanup(){ rm -f "${temps[@]:-}"||true;};trap cleanup EXIT
run_vercel(){ local out err status=0;out="$(mktemp)";err="$(mktemp)";remember "$out";remember "$err";"$@" >"$out" 2>"$err"||status=$?;test "$status" -eq 0;VERCEL_LAST_OUTPUT="$out";}

run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT"|tail -n1|tr -d '\r')"
case "$url" in https://*.vercel.app);;*)exit 1;;esac
run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"

status(){ curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 -X "$1" "$COMUN_BASE_URL$2";}
for path in /comun /comun/participar /comun/cooperativas /comun/minha-participacao;do test "$(status GET "$path")" = 200;done
test "$(status HEAD /comun/cooperativas)" = 200
page="$(mktemp)";remember "$page";curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/cooperativas" >"$page"
grep -q 'Feirinha' "$page"
grep -q 'O que está disponível' "$page"
grep -q 'Do que estamos precisando' "$page"
grep -q 'Quem faz parte da rede' "$page"
! grep -Eqi 'private_contact|contact_private|request_note_private|review_note_private|actor_user_id|member_user_id|actor_access_id|request_id|private_location|internal_notes' "$page"
echo productionRequests=GET_HEAD_ONLY >>"$GITHUB_STEP_SUMMARY"
echo businessWrites=0 >>"$GITHUB_STEP_SUMMARY"
echo flagsChanged=0 >>"$GITHUB_STEP_SUMMARY"
echo COMUN_48_4_A7_PRODUCTION_GREEN >>"$GITHUB_STEP_SUMMARY"
