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

const NOTICE_SHA256 =
  "0f980060c1372bb4e373645b3cfbcc62a69fedcc6bec3acb96c5fd215dc536ae";

test("entity consent remains isolated from reports, candidates, projections and map activation", () => {
  assert.match(migration, /create table private\.comun_relata_collective_entities/i);
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_representations/i,
  );
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_consents/i,
  );
  assert.doesNotMatch(
    migration,
    /create or replace function public\.comun_relata_collective_entity_/i,
  );
  assert.doesNotMatch(migration, /comun_relata_public_projection_set_candidate/i);
  assert.doesNotMatch(migration, /comun_relata_public_projection_recompute/i);
  assert.doesNotMatch(migration, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED/i);
  assert.doesNotMatch(migration, /comun_relata_cases/i);
});

test("representation, consent, notice and audit states are explicit", () => {
  assert.match(migration, /status in \('declared','verified','revoked'\)/i);
  assert.match(migration, /verified_by_user_id uuid/i);
  assert.match(
    migration,
    /consent_version='relata-collective-public-projection-v1'/i,
  );
  assert.match(migration, /consent_scope='sanitized_entity_projection'/i);
  assert.match(migration, new RegExp(NOTICE_SHA256, "i"));
  assert.match(migration, /consented_by_user_id uuid not null/i);
  assert.match(migration, /comun_relata_consent_rep_actor_fk/i);
  assert.match(migration, /comun_relata_event_shape/i);
  assert.match(migration, /comun_relata_entity_event_assert_consistency/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_EVENT_APPEND_ONLY/i);
  assert.match(migration, /representation_verified/i);
  assert.match(migration, /representation_revoked/i);
  assert.match(migration, /entity_archived/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_REPRESENTATION_TRANSITION_INVALID/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_REVOKE_FORBIDDEN/i);
});

test("idempotency handles both request and consent races", () => {
  assert.match(migration, /hashtextextended\(p_request_id::text,4921001\)/i);
  assert.match(migration, /hashtextextended\(p_entity_id::text,4921002\)/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_REQUEST_CONFLICT/i);
  assert.match(migration, /comun_relata_entity_active_consent_version_unique/i);
});

test("the foundation has no runtime write or execute surface", () => {
  assert.match(migration, /force row level security/gi);
  assert.match(
    migration,
    /revoke all on table[\s\S]*from public,anon,authenticated,service_role/i,
  );
  assert.match(
    migration,
    /revoke all on sequence private\.comun_relata_collective_entity_events_id_seq[\s\S]*from public,anon,authenticated,service_role/i,
  );
  assert.match(
    migration,
    /revoke all on function[\s\S]*comun_relata_collective_entity_create_internal[\s\S]*from public,anon,authenticated,service_role/i,
  );
  assert.match(
    migration,
    /set search_path=pg_catalog/gi,
  );
  assert.match(
    migration,
    /p_actor_user_id is an audit attribute, never proof of a runtime caller identity/i,
  );
  assert.doesNotMatch(
    migration,
    /grant (?:select|insert|update|delete|execute)[\s\S]*(?:to service_role)/i,
  );
});
