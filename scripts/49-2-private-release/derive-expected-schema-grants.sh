#!/usr/bin/env bash
set -euo pipefail
for name in SUPABASE_DB_URL SUPABASE_ACCESS_TOKEN SUPABASE_SERVICE_ROLE_KEY; do
  test -z "${!name+x}" || exit 1
done
artifact=.ci-artifacts/comun-49-2-schema-grants
fixture=tests/fixtures/pr437-post
container="comun-49-2-grants-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
database="comun_pr437_prodlike_post_${GITHUB_RUN_ID:-0}"
image='docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52'
mkdir -p "$artifact"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" -p 127.0.0.1:57532:5432 -e POSTGRES_PASSWORD=postgres "$image" >/dev/null
for attempt in $(seq 1 90); do
  if docker logs "$container" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null     && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -e PGPASSWORD=postgres "$container" createdb -U supabase_admin "$database"
for file in post-schema.sql technical-ledger.sql synthetic-buckets.sql restore-expression.sql; do
  docker cp "$fixture/$file" "$container:/tmp/$file"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" -X -v ON_ERROR_STOP=1 -f "/tmp/$file" >/dev/null
done
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" -X -v ON_ERROR_STOP=1 -c   'grant usage, create on schema private to postgres; grant usage, create on schema public to postgres; grant references on auth.users to postgres;' >/dev/null
docker cp supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql "$container:/tmp/r1.sql"
docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database" -X -v ON_ERROR_STOP=1 -f /tmp/r1.sql >/dev/null
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database" -X -v ON_ERROR_STOP=1 -c   "insert into supabase_migrations.schema_migrations(version) values ('20260901000000'); revoke usage, create on schema private from postgres; revoke usage, create on schema public from postgres; revoke references on auth.users from postgres;" >/dev/null
export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"
node scripts/49-2-private-release/capture-public-schema-grants.mjs --output="$artifact/expected.json"
