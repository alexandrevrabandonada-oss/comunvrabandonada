#!/usr/bin/env bash
set -euo pipefail

for name in SUPABASE_DB_URL SUPABASE_ACCESS_TOKEN SUPABASE_SERVICE_ROLE_KEY; do
  test -z "${!name+x}" || {
    echo COMUN_49_2_DISPOSABLE_PRODUCTION_SECRET_PRESENT
    exit 1
  }
done

artifact=.ci-artifacts/comun-49-2-partial-r1-canonical
fixture=tests/fixtures/pr437-post
container="comun-49-2-partial-r1-diag-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
database="comun_pr437_prodlike_post_${GITHUB_RUN_ID:-0}"
image='docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52'
mkdir -p "$artifact"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$container" -p 127.0.0.1:57532:5432   -e POSTGRES_PASSWORD=postgres "$image" >/dev/null
ready=0
for attempt in $(seq 1 90); do
  if docker logs "$container" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null     && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" = 1 || {
  echo COMUN_49_2_DISPOSABLE_POSTGRES_START_FAILED
  exit 1
}

docker exec -e PGPASSWORD=postgres "$container" createdb -U supabase_admin "$database"
for file in post-schema.sql technical-ledger.sql synthetic-buckets.sql restore-expression.sql; do
  docker cp "$fixture/$file" "$container:/tmp/$file"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"     -X -v ON_ERROR_STOP=1 -f "/tmp/$file" >/dev/null
done

docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"   -X -v ON_ERROR_STOP=1 -c   'grant usage, create on schema private to postgres;
   grant usage, create on schema public to postgres;
   grant references on auth.users to postgres;' >/dev/null

docker cp supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql   "$container:/tmp/r1.sql"
docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database"   -X -v ON_ERROR_STOP=1 -f /tmp/r1.sql >/dev/null
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"   -X -v ON_ERROR_STOP=1 -c   "insert into supabase_migrations.schema_migrations(version) values ('20260901000000')" >/dev/null

docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"   -X -v ON_ERROR_STOP=1 -c   'revoke usage, create on schema private from postgres;
   revoke usage, create on schema public from postgres;
   revoke references on auth.users from postgres;' >/dev/null

export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"
node scripts/49-2-private-release/capture-canonical-section-hashes.mjs   --output="$artifact/expected-partial-r1.json"
