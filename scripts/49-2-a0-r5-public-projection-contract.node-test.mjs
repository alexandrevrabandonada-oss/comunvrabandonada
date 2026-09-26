import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260926153200_comun_relata_collective_entity_public_projection.sql",
  "utf8",
);
const adminActions = readFileSync(
  "app/comun/admin/entidades/actions.ts",
  "utf8",
);
const ownerActions = readFileSync("app/comun/entidades/actions.ts", "utf8");
const workflow = readFileSync(
  ".github/workflows/comun-49-2-a0-r5-public-projection-disposable.yml",
  "utf8",
);

const publicTableMatch = migration.match(
  /create table public\.comun_relata_collective_entity_public_projections \(([\s\S]*?)\n\);/,
);
assert.ok(publicTableMatch);
const publicTable = publicTableMatch[1];

test("R5 public projection is deliberately minimal", () => {
  assert.match(publicTable, /projection_id uuid primary key/);
  assert.match(publicTable, /public_name text not null/);
  assert.match(publicTable, /entity_type text not null/);
  assert.match(publicTable, /published_at timestamptz not null/);
  assert.doesNotMatch(
    publicTable,
    /candidate_id|entity_id|representation|consent|user|profile|review|evidence|report|contact|location|latitude|longitude|geometry/i,
  );
  assert.match(
    migration,
    /grant select on table public\.comun_relata_collective_entity_public_projections[\s\S]*to anon,authenticated,service_role/,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:insert|update|delete|all)[\s\S]{0,180}public\.comun_relata_collective_entity_public_projections[\s\S]{0,180}to\s+(?:anon|authenticated)/i,
  );
});

test("R5 preserves an append-only private publication audit", () => {
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_projection_decisions/,
  );
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_projection_events/,
  );
  assert.match(migration, /COMUN_RELATA_ENTITY_PROJECTION_AUDIT_APPEND_ONLY/);
  assert.match(
    migration,
    /decision in \('approved','needs_changes','rejected','withdrawn'\)/,
  );
  assert.match(migration, /decision_order bigint generated always as identity unique/);
  assert.match(migration, /event_order bigint generated always as identity unique/);
});

test("R5 publication authority is independent from R4 reviewers and owner", () => {
  assert.match(migration, /profile\.role in \('admin','publisher'\)/);
  assert.match(migration, /COMUN_RELATA_ENTITY_SELF_PUBLICATION_FORBIDDEN/);
  assert.match(migration, /COMUN_RELATA_ENTITY_PROJECTION_SEPARATION_REQUIRED/);
  assert.match(
    migration,
    /eligible_for_projection_review/,
  );
  assert.match(
    migration,
    /comun_relata_candidate_latest_reviewer_profiles/,
  );
  assert.doesNotMatch(
    adminActions,
    /publisherUserId|publisherProfileId|actorUserId/,
  );
  assert.match(adminActions, /decideCollectiveEntityProjectionAction/);
  assert.match(ownerActions, /listOwnCollectiveEntityProjectionAction/);
});

test("R5 automatically retracts public materialization when eligibility is lost", () => {
  assert.match(
    migration,
    /comun_relata_collective_entity_projection_reconcile_candidate/,
  );
  assert.match(migration, /after insert[\s\S]*candidate_reviews/i);
  assert.match(migration, /after update of candidate_state/i);
  assert.match(
    migration,
    /delete from public\.comun_relata_collective_entity_public_projections/,
  );
  assert.match(migration, /LEGITIMACY_REVIEW_CHANGED/);
});

test("R5 does not mutate representation verification, candidate approval or map state", () => {
  assert.doesNotMatch(
    migration,
    /update\s+private\.comun_relata_collective_entity_representations/i,
  );
  assert.doesNotMatch(
    migration,
    /set\s+candidate_state\s*=/i,
  );
  assert.doesNotMatch(
    migration,
    /future_map_eligibility|map_feature|search_projection/i,
  );
});

test("R5 service bridges remain service-role-only", () => {
  for (const signature of [
    "comun_relata_collective_entity_server_projection_review_queue",
    "comun_relata_collective_entity_server_projection_decide",
    "comun_relata_entity_server_projection_list_own",
  ]) {
    assert.match(migration, new RegExp(signature));
  }
  assert.match(
    migration,
    /revoke all on function[\s\S]*from public,anon,authenticated;/,
  );
  assert.match(
    migration,
    /grant execute on function[\s\S]*to service_role;/,
  );
});

test("R5 disposable proof is local-only", () => {
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /workflow_dispatch|SUPABASE_PROJECT_REF/);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /assert-zero-security-findings/);
  assert.match(workflow, /COMUN_49_2_A0_R5_DISPOSABLE_GREEN/);
});
