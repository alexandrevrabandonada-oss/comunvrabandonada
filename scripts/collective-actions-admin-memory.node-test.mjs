import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("administrative journey is release-gated before new table access", () => {
  const actions = read("app/comun/admin/acoes/actions.ts");
  const gate = actions.indexOf("await requireCollectiveActionsRelease()");
  const forwarding = actions.indexOf('"comun_collective_action_forwardings"');
  const memory = actions.indexOf('"comun_collective_action_memory_assets"');
  assert.ok(gate > -1 && gate < forwarding && gate < memory);
  for (const name of [
    "publishCollectiveAction",
    "createCollectiveActionTask",
    "updateCollectiveActionTask",
    "saveCollectiveActionForwarding",
    "recordCollectiveActionResult",
    "completeCollectiveAction",
    "publishCollectiveActionMemory",
  ]) assert.match(actions, new RegExp(`export async function ${name}`));
});

test("migration is independent from operational sidewalks and keeps private drafts out of public policies", () => {
  const migration = read("supabase/migrations/20260726171220_collective_action_administration_memory.sql");
  assert.doesNotMatch(migration, /20260724233256|confirmation_state|comun_sidewalk_duplicate_suggestions/i);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.comun_collective_action_forwardings from public, anon, authenticated/);
  assert.match(migration, /public_visible/);
  assert.match(migration, /reviewed_at is not null/);
  assert.match(migration, /unique \(action_id, idempotency_key\)/);
});

test("public action detail presents forwarding, result and memory without a private projection", () => {
  const detail = read("app/comun/acoes/[slug]/page.tsx");
  const data = read("lib/collective-actions.ts");
  assert.match(detail, /Encaminhamento coletivo/);
  assert.match(detail, /Resultado e memória/);
  assert.match(detail, /Materiais públicos revisados/);
  assert.match(data, /\.eq\("public_visible", true\)/);
  assert.match(data, /\.not\("reviewed_at", "is", null\)/);
  assert.doesNotMatch(data, /contribution_note_private/);
});

test("preview fixtures demonstrate all administrative states only through the existing preview gate", () => {
  const fixtures = read("lib/collective-actions-preview-fixtures.ts");
  const gate = read("lib/collective-actions-release-contract.ts");
  for (const marker of [
    'status: "preparing"',
    'status: "open"',
    'status: "awaiting_result"',
    'status: "completed"',
    "protocol_registered",
    "response_received",
    "result_verified",
    "memory_completed",
  ]) assert.match(fixtures, new RegExp(marker));
  assert.match(gate, /env\.VERCEL_ENV === "preview"/);
  assert.match(gate, /COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES === "enabled"/);
});
