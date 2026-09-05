import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260905171646_comun_relata_collective_entity_authenticated_runtime.sql",
  "utf8",
);
const actions = fs.readFileSync("app/comun/entidades/actions.ts", "utf8");

test("R2 derives every runtime actor from auth.uid without a client actor parameter", () => {
  assert.match(migration, /v_actor_user_id uuid := auth\.uid\(\)/g);
  assert.doesNotMatch(migration, /p_actor_user_id/i);
  assert.match(migration, /COMUN_RELATA_ENTITY_AUTH_REQUIRED/);
  assert.match(actions, /"use server"/);
  assert.doesNotMatch(actions, /userId|user_id/i);
});

test("R2 only grants authenticated execution and keeps private primitives private", () => {
  assert.match(migration, /revoke all on function[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute on function[\s\S]*to authenticated/i);
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
  assert.match(migration, /runtime_list_own/i);
  assert.match(migration, /representation\.user_id = v_actor_user_id/i);
  assert.match(migration, /consented_by_user_id = v_actor_user_id/i);
  assert.match(migration, /runtime_representation_revoke/i);
});
