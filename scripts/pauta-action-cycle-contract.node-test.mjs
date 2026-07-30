import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260730122000_comun_pauta_action_cycle.sql",
  "utf8",
);
const actions = readFileSync(
  "app/comun/admin/pautas/[id]/political-cycle-actions.ts",
  "utf8",
);
const publicData = readFileSync("lib/pauta-action-cycle-data.ts", "utf8");

test("schema is additive, RLS-protected and grants no public writes", () => {
  assert.doesNotMatch(
    migration,
    /\b(drop table|truncate|alter table [^;\n]+ drop column)\b/i,
  );
  for (const table of [
    "comun_pauta_decisions",
    "comun_pauta_action_cycles",
    "comun_pauta_action_cycle_events",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on table public\\.${table} from public, anon, authenticated`,
      ),
    );
  }
  assert.doesNotMatch(
    migration,
    /grant\s+(insert|update|delete)[^;]+to\s+(anon|authenticated)/i,
  );
});

test("database transition requires authorization, version and idempotency", () => {
  for (const marker of [
    "COMUN_PAUTA_ACTION_CYCLE_INVALID_TRANSITION",
    "COMUN_PAUTA_ACTION_CYCLE_ROLE_FORBIDDEN",
    "COMUN_PAUTA_ACTION_CYCLE_VERSION_CONFLICT",
    "COMUN_PAUTA_ACTION_CYCLE_IDEMPOTENCY_CONFLICT",
    "COMUN_PAUTA_ACTION_CYCLE_REVIEWED_DECISION_REQUIRED",
    "COMUN_PAUTA_ACTION_CYCLE_VERIFIED_RESULT_REQUIRED",
    "COMUN_PAUTA_ACTION_CYCLE_REVIEWED_MEMORY_REQUIRED",
  ])
    assert.match(migration, new RegExp(marker));
  assert.match(migration, /for update/);
  assert.match(migration, /unique \(cycle_id, idempotency_key\)/);
  assert.match(migration, /decision\.created_by_admin_id <> p_actor_admin_id/);
});

test("controlled rehearsal is structurally private", () => {
  assert.match(
    migration,
    /cycle_scope in \('production', 'controlled_rehearsal'\)/,
  );
  assert.match(
    migration,
    /cycle_scope = 'controlled_rehearsal'[\s\S]+public_visible = false/,
  );
  assert.match(migration, /cycle_scope = 'production'/);
});

test("all administrative mutations pass through auth and the release gate", () => {
  assert.match(actions, /requireCollectiveActionsRelease/);
  assert.match(
    actions,
    /requireComunAdmin\(\{ roles: \["admin", "editor"\] \}\)/,
  );
  assert.match(actions, /comun_transition_pauta_action_cycle/);
  assert.match(actions, /createHash\("sha256"\)/);
  assert.doesNotMatch(actions, /service[_-]?role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("public projection excludes actor identities and private fields", () => {
  const publicFunction = publicData.slice(
    publicData.indexOf("export async function getPublicPautaActionCycle"),
  );
  assert.doesNotMatch(
    publicFunction,
    /actor_admin_id|created_by_admin_id|response_text|private_notes/,
  );
  assert.doesNotMatch(publicFunction, /\.select\(\s*["'`][^"'`]*private_note/i);
  assert.match(publicFunction, /\.eq\("public_visible", true\)/);
  assert.match(publicFunction, /\.eq\("cycle_scope", "production"\)/);
});
