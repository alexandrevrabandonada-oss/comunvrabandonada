#!/usr/bin/env bash
set -euo pipefail

test -z "${SUPABASE_DB_URL+x}" || { echo COMUN_49_2_DISPOSABLE_PRODUCTION_SECRET_PRESENT; exit 1; }
test -z "${SUPABASE_ACCESS_TOKEN+x}" || { echo COMUN_49_2_DISPOSABLE_PRODUCTION_SECRET_PRESENT; exit 1; }
test -z "${SUPABASE_SERVICE_ROLE_KEY+x}" || { echo COMUN_49_2_DISPOSABLE_PRODUCTION_SECRET_PRESENT; exit 1; }

artifact=.ci-artifacts/49-2-private-release
fixture=tests/fixtures/pr437-post
container="comun-49-2-private-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
database="comun_pr437_prodlike_post_${GITHUB_RUN_ID:-0}"
image='docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52'
mkdir -p "$artifact"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$container" -p 127.0.0.1:57532:5432 \
  -e POSTGRES_PASSWORD=postgres "$image" >/dev/null
ready=0
for attempt in $(seq 1 90); do
  if docker logs "$container" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null \
    && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" = 1 || { echo COMUN_49_2_DISPOSABLE_POSTGRES_START_FAILED; exit 1; }
docker exec -e PGPASSWORD=postgres "$container" createdb -U supabase_admin "$database"
for file in post-schema.sql technical-ledger.sql synthetic-buckets.sql restore-expression.sql; do
  docker cp "$fixture/$file" "$container:/tmp/$file"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" \
    -X -v ON_ERROR_STOP=1 -f "/tmp/$file" >"$artifact/${file%.sql}.log"
done

export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
  --output="$artifact/before.json" >/dev/null

# The schema-only fixture omits migration-executor privileges on managed schemas.
# Restore them only for disposable application, then revoke before POST capture.
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" \
  -X -v ON_ERROR_STOP=1 -c 'grant usage, create on schema private to postgres; grant usage, create on schema public to postgres; grant references on auth.users to postgres' \
  >"$artifact/executor-grant.log"

for version in 20260901000000 20260924015511; do
  case "$version" in
    20260901000000) file=supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql ;;
    20260924015511) file=supabase/migrations/20260924015511_comun_relata_collective_entity_authenticated_runtime.sql ;;
  esac
  docker cp "$file" "$container:/tmp/$version.sql"
  docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database" \
    -X -v ON_ERROR_STOP=1 -f "/tmp/$version.sql" >"$artifact/$version.log"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" \
    -X -v ON_ERROR_STOP=1 -c \
    "insert into supabase_migrations.schema_migrations(version) values ('$version')" \
    >"$artifact/$version-ledger.log"
  if [[ "$version" == 20260901000000 ]]; then
    node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
      --output="$artifact/partial-r1.json" >/dev/null
  fi
done
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" \
  -X -v ON_ERROR_STOP=1 -c 'revoke usage, create on schema private from postgres; revoke usage, create on schema public from postgres; revoke references on auth.users from postgres' \
  >"$artifact/executor-revoke.log"
docker cp scripts/49-2-private-release/prove-private.sql "$container:/tmp/prove-private.sql"
docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database" \
  -X -v ON_ERROR_STOP=1 -f /tmp/prove-private.sql >"$artifact/private-contract.log"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
  --output="$artifact/after.json" >/dev/null
node scripts/49-2-private-release/derive-fingerprints.mjs \
  reports/current/comun-49-2-private-release-production-pre.json \
  "$artifact/before.json" "$artifact/partial-r1.json" "$artifact/after.json" \
  "$artifact/comun-49-2-private-release-derived.json"
docker cp scripts/49-2-private-release/prove-ledger.sql "$container:/tmp/prove-ledger.sql"
docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database" \
  -X -v ON_ERROR_STOP=1 -f /tmp/prove-ledger.sql >"$artifact/ledger-contract.log"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable \
  --output="$artifact/after-ledger.json" >/dev/null
node scripts/49-2-private-release/verify-ledger-fingerprint.mjs \
  "$artifact/after.json" "$artifact/after-ledger.json"
echo COMUN_49_2_PRIVATE_RELEASE_DISPOSABLE_PRE_POST_DERIVED
