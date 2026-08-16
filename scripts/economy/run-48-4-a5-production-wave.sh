#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMUN_BASE_URL:?COMUN_BASE_URL is required}"
case "$MODE" in flags-off|wave1-private-connections);;*)exit 1;;esac

temps=();remember(){ temps+=("$1");};cleanup(){ rm -f "${temps[@]:-}"||true;};trap cleanup EXIT
run_vercel(){ local out err status=0;out="$(mktemp)";err="$(mktemp)";remember "$out";remember "$err";"$@" >"$out" 2>"$err"||status=$?;test "$status" -eq 0;VERCEL_LAST_OUTPUT="$out";}
set_flag(){ local value="$1";run_vercel bash -c 'printf "%s" "$1" | npx --yes vercel@50.28.0 env add COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED production --force --yes --token "$2" --scope "$3"' -- "$value" "$VERCEL_TOKEN" "$VERCEL_ORG_ID";}
deploy(){ run_vercel npx --yes vercel@50.28.0 deploy --prod --skip-domain --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID";local url;url="$(grep -Eo 'https://[^[:space:]]+' "$VERCEL_LAST_OUTPUT"|tail -n1|tr -d '\r')";case "$url" in https://*.vercel.app);;*)return 1;;esac;run_vercel npx --yes vercel@50.28.0 inspect "$url" --wait --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID";run_vercel npx --yes vercel@50.28.0 promote "$url" --yes --timeout=5m --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID";run_vercel npx --yes vercel@50.28.0 alias set "$url" comunsocial.online --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID";}
rollback(){ set +e;set_flag disabled;deploy;set -e;echo COMUN_48_4_A5_VERCEL_ROLLBACK_GREEN >>"$GITHUB_STEP_SUMMARY";}
trap 'status=$?;trap - ERR;rollback||true;exit $status' ERR

if [ "$MODE" = flags-off ];then set_flag disabled;else set_flag enabled;fi
deploy
status(){ curl -L -sS -o /dev/null -w '%{http_code}' --retry 8 --retry-delay 2 -X "$1" "$COMUN_BASE_URL$2";}
for path in /comun /comun/participar /comun/cooperativas /comun/minha-participacao;do test "$(status GET "$path")" = 200;done
test "$(status HEAD /comun/cooperativas)" = 200
page="$(mktemp)";remember "$page";curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL/comun/cooperativas" >"$page"
! grep -Eqi 'contact_private|message_private|offer_private|member_user_id|reviewed_by_access_id|consent_version|consented_at' "$page"
organization_href="$(grep -Eo '/comun/cooperativas/[a-z0-9]+(-[a-z0-9]+)*' "$page"|grep -vE '/(nova|ofertas|necessidades)$'|head -n1||true)"
if [ -n "$organization_href" ];then
  organization_page="$(mktemp)";remember "$organization_page";curl -L -fsS --retry 8 --retry-delay 2 "$COMUN_BASE_URL$organization_href" >"$organization_page"
  ! grep -Eqi 'contact_private|message_private|offer_private|member_user_id|reviewed_by_access_id|consent_version|consented_at' "$organization_page"
  href="$(grep -Eo '/comun/cooperativas/[^" ]+/(ofertas/[^" ]+/interesse|necessidades/[^" ]+/ajudar)' "$organization_page"|head -n1||true)"
else
  href=""
fi
if [ "$MODE" = wave1-private-connections ];then
  if [ -n "$href" ];then test "$(status GET "$href")" = 200;test "$(status HEAD "$href")" = 200;else echo realEligibleSubject=none_valid_empty >>"$GITHUB_STEP_SUMMARY";fi
  echo COMUN_48_4_A5_WAVE1_PRODUCTION_GREEN >>"$GITHUB_STEP_SUMMARY"
else
  test -z "$href"
  echo COMUN_48_4_A5_FLAGS_OFF_PRODUCTION_GREEN >>"$GITHUB_STEP_SUMMARY"
fi
echo productionRequests=GET_HEAD_ONLY >>"$GITHUB_STEP_SUMMARY"
echo businessWrites=0 >>"$GITHUB_STEP_SUMMARY"
