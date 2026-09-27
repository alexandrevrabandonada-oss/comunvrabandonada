import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260924015511_comun_relata_collective_entity_authenticated_runtime.sql",
  "utf8",
);
const actions = fs.readFileSync("app/comun/entidades/actions.ts", "utf8");
const workflow = fs.readFileSync(
  ".github/workflows/comun-49-2-a0-r2-authenticated-representation-disposable.yml",
  "utf8",
);
const disposable = fs.readFileSync(
  "scripts/49-2-a0-r2-authenticated-representation-disposable.sql",
  "utf8",
);

test("R2 keeps database bridges server-only and browser identity out of actions", () => {
  assert.match(migration, /p_actor_user_id uuid/g);
  assert.match(migration, /to service_role/i);
  assert.doesNotMatch(migration, /to authenticated/i);
  assert.match(actions, /"use server"/);
  assert.doesNotMatch(actions, /userId|user_id/i);
});

test("R2 revokes client execution and keeps private primitives private", () => {
  assert.match(
    migration,
    /revoke all on function[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/i);
  assert.doesNotMatch(migration, /grant .* on .*private\./i);
});

test("R2 has no verification, publication or map shortcut", () => {
  assert.doesNotMatch(migration, /runtime_[^(]*verify/i);
  assert.doesNotMatch(migration, /future_map_eligibility/i);
  assert.doesNotMatch(migration, /create (?:table|view).*candidate/i);
  assert.match(migration, /declared representation only/i);
  assert.match(migration, /no publication or map effect/i);
});

test("R2 keeps owner DTO and exit rights narrowly scoped", () => {
  assert.match(migration, /server_list_own/i);
  assert.match(migration, /representation\.user_id = p_actor_user_id/i);
  assert.match(
    migration,
    /consent_row\.consented_by_user_id = p_actor_user_id/i,
  );
  assert.match(migration, /server_representation_revoke/i);
  assert.match(migration, /v_representation\.status = 'revoked'/i);
});

test("R2 disposable workflow has no Production credential or remote migration path", () => {
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(
    workflow,
    /supabase\s+db\s+(push|lint)|comun:promover|--linked/,
  );
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(
    workflow,
    /49-2-a0-r1-collective-entity-consent-disposable\.sql/,
  );
  assert.match(
    workflow,
    /49-2-a0-r2-authenticated-representation-disposable\.sql/,
  );
});


test("R2 disposable remains valid when later R3-R5 schemas are installed", () => {
  assert.doesNotMatch(
    disposable,
    /pg_class[\s\S]*R2 public side effect appeared/i,
  );
  assert.match(
    disposable,
    /private\.comun_relata_collective_entity_candidates[\s\S]*R2 consent alone created candidate/i,
  );
  assert.match(
    disposable,
    /public\.comun_relata_collective_entity_public_projections[\s\S]*R2 flow created public projection/i,
  );
});
