#!/usr/bin/env bash
set -euo pipefail

for name in SUPABASE_DB_URL SUPABASE_ACCESS_TOKEN SUPABASE_SERVICE_ROLE_KEY; do
  test -z "${!name+x}" || { echo COMUN_R4_DISPOSABLE_PRODUCTION_SECRET_PRESENT; exit 1; }
done

artifact=.ci-artifacts/comun-49-2-r4-release
fixture=tests/fixtures/pr437-post
container="comun-r4-release-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
database="comun_pr437_prodlike_post_${GITHUB_RUN_ID:-0}"
image='docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52'
mkdir -p "$artifact"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

docker run -d --name "$container" -p 127.0.0.1:57532:5432   -e POSTGRES_PASSWORD=postgres "$image" >/dev/null
ready=0
for attempt in $(seq 1 90); do
  if docker logs "$container" 2>&1 | grep -F 'PostgreSQL init process complete; ready for start up.' >/dev/null     && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
test "$ready" = 1 || { echo COMUN_R4_DISPOSABLE_POSTGRES_START_FAILED; exit 1; }

docker exec -e PGPASSWORD=postgres "$container" createdb -U supabase_admin "$database"
for file in post-schema.sql technical-ledger.sql synthetic-buckets.sql restore-expression.sql; do
  docker cp "$fixture/$file" "$container:/tmp/$file"
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"     -X -v ON_ERROR_STOP=1 -f "/tmp/$file" >"$artifact/${file%.sql}.log"
done
export COMUN_DISPOSABLE_DB_URL="postgresql://postgres:postgres@127.0.0.1:57532/$database"

grant_executor() {
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"     -X -v ON_ERROR_STOP=1 -c 'grant usage, create on schema private to postgres;
      grant create on schema public to postgres;
      grant references on auth.users to postgres;
      grant insert on supabase_migrations.schema_migrations to postgres;' >/dev/null
}
revoke_executor() {
  docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"     -X -v ON_ERROR_STOP=1 -c 'revoke usage, create on schema private from postgres;
      revoke create on schema public from postgres;
      revoke references on auth.users from postgres;
      revoke insert on supabase_migrations.schema_migrations from postgres;' >/dev/null
}
apply_migration() {
  local version="$1" file="$2"
  test "$(head -n 1 "$file" | tr -d '\r')" = 'begin;'
  test "$(tail -n 1 "$file" | tr -d '\r')" = 'commit;'
  {
    printf 'begin;\n'
    sed '1d;$d' "$file"
    printf "insert into supabase_migrations.schema_migrations(version) values ('%s');\ncommit;\n" "$version"
  } >"$artifact/$version-atomic.sql"
  grant_executor
  docker cp "$artifact/$version-atomic.sql" "$container:/tmp/$version-atomic.sql"
  docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database"     -X -v ON_ERROR_STOP=1 -f "/tmp/$version-atomic.sql" >"$artifact/$version.log"
  revoke_executor
}

apply_migration 20260901000000 supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql
docker exec -e PGPASSWORD=postgres "$container" psql -U supabase_admin -d "$database"   -X -v ON_ERROR_STOP=1 -c 'grant usage on schema public to postgres' >/dev/null
apply_migration 20260924015511 supabase/migrations/20260924015511_comun_relata_collective_entity_authenticated_runtime.sql

docker cp scripts/49-2-private-release/prove-ledger.sql "$container:/tmp/prove-ledger.sql"
docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database"   -X -v ON_ERROR_STOP=1 -f /tmp/prove-ledger.sql >"$artifact/r12-ledger.log"

apply_migration 20260924225210 supabase/migrations/20260924225210_comun_relata_collective_entity_private_candidate.sql

docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database"   -X -v ON_ERROR_STOP=1 -c "
    insert into public.comun_schema_releases
      (release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
    values (
      '20260924-comun-49-2-r3-private-candidate',
      'bundle:supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json',
      'b16573ccc85ebcba3a28fb433cc33c04fd3b61b2d80a25fe4df02a0ab1c4d536',
      '7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60',
      '5172b8ec626eaabd1efdb9c2273bd947867416ae92344d349f5600a0ced2ccd1',
      'applied'
    );" >"$artifact/r3-ledger.log"

test "$(docker exec -e PGPASSWORD=postgres "$container" psql -U postgres -d "$database" -X -At -v ON_ERROR_STOP=1 -c "
  select count(*) from public.comun_schema_releases
  where release='20260924-comun-49-2-r3-private-candidate'
    and migration_sha256='b16573ccc85ebcba3a28fb433cc33c04fd3b61b2d80a25fe4df02a0ab1c4d536'
    and status='applied'")" = "1"

node scripts/solo/capture-promotion-fingerprint.mjs --disposable --output="$artifact/pre.json" >/dev/null
node scripts/49-2-r4-release/verify-disposable-pre.mjs   reports/current/comun-49-2-r4-production-pre.json "$artifact/pre.json"

apply_migration 20260925014131 supabase/migrations/20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql
node scripts/49-2-r4-release/verify-r4-structure.mjs --output="$artifact/structure.json"
node scripts/solo/capture-promotion-fingerprint.mjs --disposable --output="$artifact/post.json" >/dev/null
node scripts/49-2-r4-release/verify-disposable-post.mjs   reports/current/comun-49-2-r4-production-pre.json "$artifact/pre.json" "$artifact/post.json"   "$artifact/structure.json" "$artifact/derived.json"

sha256sum supabase/migrations/20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql   >"$artifact/migration.sha256"
sha256sum reports/current/comun-49-2-r4-production-pre.json >"$artifact/pre.sha256"
echo COMUN_49_2_R4_PRIVATE_RELEASE_DISPOSABLE_DERIVED
