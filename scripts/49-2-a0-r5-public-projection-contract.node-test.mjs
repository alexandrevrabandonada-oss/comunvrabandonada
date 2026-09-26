import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260926110454_comun_relata_collective_entity_public_projection_gate.sql",
  "utf8",
);
const runtime = readFileSync(
  "lib/comun-collective-entity-projection-runtime.ts",
  "utf8",
);
const adminActions = readFileSync("app/comun/admin/entidades/actions.ts", "utf8");
const workflow = readFileSync(
  ".github/workflows/comun-49-2-a0-r5-public-projection-disposable.yml",
  "utf8",
);
const classifier = readFileSync("scripts/ci/classify-migration-lane.mjs", "utf8");
const rlsMatrixAudit = readFileSync("scripts/audit-comun-rls-matrix.mjs", "utf8");

test("R5 creates a separate append-only publisher decision gate", () => {
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_projection_decisions/,
  );
  assert.match(migration, /decision in \('publish','hold','reject'\)/);
  assert.match(migration, /publisher_role='publisher'/);
  assert.match(migration, /profile\.role='publisher'/);
  assert.match(migration, /COMUN_RELATA_PROJECTION_DECISION_APPEND_ONLY/);
  assert.match(migration, /COMUN_RELATA_PROJECTION_SELF_PUBLISH_FORBIDDEN/);
  assert.match(migration, /eligible_for_projection_review/);
});

test("R5 public-ready storage is sanitized and not a direct Data API surface", () => {
  assert.match(
    migration,
    /create table public\.comun_relata_collective_entity_public_projections/,
  );
  assert.match(
    migration,
    /alter table public\.comun_relata_collective_entity_public_projections\s+force row level security/,
  );
  assert.match(
    migration,
    /revoke all on table public\.comun_relata_collective_entity_public_projections\s+from public,anon,authenticated,service_role/,
  );
  assert.match(
    migration,
    /returns table\(\s*projection_id uuid,\s*public_name text,\s*entity_type text,\s*published_at timestamptz\s*\)/,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select[\s\S]*comun_relata_collective_entity_public_projections/i,
  );
});

test("R5 fails closed when legitimacy or source authority changes", () => {
  assert.match(migration, /comun_relata_projection_suppress_if_ineligible/);
  assert.match(migration, /LEGITIMACY_CONTESTED/);
  assert.match(migration, /CANDIDATE_INVALIDATED/);
  assert.match(migration, /after insert\s+on private\.comun_relata_collective_entity_candidate_reviews/i);
  assert.match(migration, /after update of candidate_state/i);
  assert.match(
    migration,
    /snapshot\.eligibility_state='eligible_for_projection_review'/,
  );
});

test("R5 cannot open the public map or mutate map eligibility", () => {
  assert.doesNotMatch(
    migration,
    /future_map_eligibility|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles/i,
  );
  assert.doesNotMatch(
    runtime,
    /futureMapEligibility|openPublicMap|publicLatitude|publicLongitude/i,
  );
});

test("R5 browser inputs cannot choose publisher authority", () => {
  assert.match(adminActions, /decideCollectiveEntityProjectionAction\(input: \{/);
  assert.doesNotMatch(
    adminActions,
    /publisherUserId|publisherProfileId|actorUserId/,
  );
  assert.match(runtime, /p_publisher_user_id: userId/);
});

test("R5 disposable proof is local-only and migration ownership is explicit", () => {
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /workflow_dispatch|SUPABASE_PROJECT_REF/);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /assert-zero-security-findings/);
  assert.match(workflow, /COMUN_49_2_A0_R5_DISPOSABLE_GREEN_MAP_CLOSED/);
  assert.match(
    classifier,
    /20260926110454_comun_relata_collective_entity_public_projection_gate\.sql/,
  );
  assert.match(classifier, /collective-entity-public-projection-gate/);
});


test("R5 public projection is explicitly classified as server-only in the canonical RLS matrix", () => {
  assert.match(
    rlsMatrixAudit,
    /comun_relata_collective_entity_public_projections:\s*\{\s*decision: "service_role_only"/,
  );
  assert.match(
    rlsMatrixAudit,
    /Sem grants diretos para anon\/authenticated\/service_role/,
  );
});
