#!/usr/bin/env bash
set -euo pipefail

test -z "${SUPABASE_DB_URL+x}" || { echo COMUN_DISPOSABLE_PRODUCTION_SECRET_PRESENT; exit 1; }
[[ "${COMUN_RUN_SHA:-}" =~ ^[a-f0-9]{40}$ ]] || { echo COMUN_DISPOSABLE_RUN_SHA_INVALID; exit 1; }
[[ "${GITHUB_RUN_ID:-}" =~ ^[0-9]+$ ]] || { echo COMUN_DISPOSABLE_RUN_ID_INVALID; exit 1; }
[[ "${COMUN_PRODUCTION_CAPTURE_SHA256:-}" =~ ^[a-f0-9]{64}$ ]] || { echo COMUN_DISPOSABLE_CAPTURE_HASH_MISSING; exit 1; }

fixture=tests/fixtures/pr437-post
artifact=.pr437-proof
capture=.pr437-production-capture/comun-pr437-promotion-fingerprint.json
container="comun-pr437-proof-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT:-1}"
database="comun_pr437_prodlike_post_${GITHUB_RUN_ID}"
image='docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52'
mkdir -p "$artifact"

node scripts/solo/verify-pr437-production-capture.mjs \
  --capture="$capture" --capture-sha256="$COMUN_PRODUCTION_CAPTURE_SHA256"
node scripts/solo/verify-pr437-fixture-files.mjs

cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$container" -p 127.0.0.1:57532:5432 \
  -e POSTGRES_PASSWORD=postgres "$image" >"$artifact/container-id.txt"
ready=0
for attempt in $(seq 1 90); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" = 1 || { echo COMUN_DISPOSABLE_POSTGRES_START_FAILED; exit 1; }
docker exec -e PGPASSWORD=postgres "$container" createdb -U supabase_admin "$database"
for file in post-schema.sql technical-ledger.sql synthetic-buckets.sql restore-expression.sql; do
  docker cp "$fixture/$file" "$container:/tmp/$file"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" \
    -X -v ON_ERROR_STOP=1 -f "/tmp/$file" >"$artifact/${file%.sql}.log"
done

export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
  --output="$artifact/disposable-before.json"
export COMUN_DISPOSABLE_DB_URL="postgresql://supabase_admin:postgres@127.0.0.1:57532/$database"
node scripts/solo/prove-search-sync-local-temp-table.mjs \
  --production-capture="$capture" \
  --disposable-capture="$artifact/disposable-before.json" \
  --capture-sha256="$COMUN_PRODUCTION_CAPTURE_SHA256" \
  --run-sha="$COMUN_RUN_SHA" --run-id="$GITHUB_RUN_ID" \
  --output="$artifact/disposable-proof.json"
export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
  --output="$artifact/disposable-after.json"
node scripts/solo/aggregate-pr437-search-proof.mjs \
  --production-capture="$capture" \
  --disposable-before="$artifact/disposable-before.json" \
  --disposable-after="$artifact/disposable-after.json" \
  --proof="$artifact/disposable-proof.json" \
  --capture-sha256="$COMUN_PRODUCTION_CAPTURE_SHA256" \
  --run-sha="$COMUN_RUN_SHA" --run-id="$GITHUB_RUN_ID" \
  --output="$artifact/comun-pr437-search-sync-remote-disposable-proof.json"
