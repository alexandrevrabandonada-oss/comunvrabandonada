import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql",
  ),
  "utf8",
);

test("entity consent is isolated from reports, candidates, projections and map activation", () => {
  assert.match(migration, /create table private\.comun_relata_collective_entities/i);
  assert.match(migration, /create table private\.comun_relata_collective_entity_representations/i);
  assert.match(migration, /create table private\.comun_relata_collective_entity_consents/i);
  assert.doesNotMatch(migration, /comun_relata_public_projection_set_candidate/i);
  assert.doesNotMatch(migration, /comun_relata_public_projection_recompute/i);
  assert.doesNotMatch(migration, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED/i);
  assert.doesNotMatch(migration, /comun_relata_cases/i);
});

test("representation, consent and revocation are explicit, auditable and idempotent", () => {
  assert.match(migration, /status in \('declared','verified','revoked'\)/i);
  assert.match(migration, /consent_version='relata-collective-public-projection-v1'/i);
  assert.match(migration, /consented_by_user_id uuid not null/i);
  assert.match(migration, /consent_representation_same_entity/i);
  assert.match(migration, /revoked_by_user_id uuid/i);
  assert.match(migration, /comun_relata_entity_active_consent_version_unique/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /consent_granted/i);
  assert.match(migration, /consent_revoked/i);
  assert.match(migration, /CONSENT_STATE_REQUIRED/i);
});

test("new tables and RPCs are force-RLS and service-role only", () => {
  assert.match(migration, /force row level security/i);
  assert.match(migration, /revoke all on table[\s\S]*from public,anon,authenticated/i);
  assert.match(migration, /revoke all on function public\.comun_relata_collective_entity_create[\s\S]*from public,anon,authenticated/i);
  assert.match(migration, /grant execute on function public\.comun_relata_collective_entity_create[\s\S]*to service_role/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_REPRESENTATION_REQUIRED/i);
});
