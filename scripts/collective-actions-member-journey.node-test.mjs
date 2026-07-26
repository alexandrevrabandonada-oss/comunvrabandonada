import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("task claim requires active action participation", () => {
  const actions = read("app/comun/acoes/actions.ts");
  const participationCheck = actions.indexOf(
    '.from("comun_collective_action_participations")',
    actions.indexOf("claimCollectiveActionTask"),
  );
  const assignmentWrite = actions.indexOf(
    '"comun_collective_action_task_assignments"',
    actions.indexOf("claimCollectiveActionTask"),
  );
  assert.ok(participationCheck > 0 && participationCheck < assignmentWrite);
  assert.match(actions, /Entre na ação antes de assumir uma tarefa\./);
});

test("Minha Participação exposes task release and action exit", () => {
  const page = read("app/comun/minha-participacao/page.tsx");
  const data = read("lib/collective-actions.ts");
  assert.match(data, /taskAssignments/);
  assert.match(data, /\.eq\("status", "active"\)/);
  assert.match(page, /Tarefas em ações coletivas/);
  assert.match(page, /action=\{releaseCollectiveActionTask\}/);
  assert.match(page, /action=\{updateCollectiveActionParticipation\}/);
  assert.match(page, /Libere suas tarefas antes de sair da ação\./);
});

test("database guard preserves task capacity when a member leaves", () => {
  const migration = read(
    "supabase/migrations/20260726161426_comun_collective_action_member_journey.sql",
  );
  assert.match(migration, /COMUN_COLLECTIVE_RELEASE_TASKS_BEFORE_LEAVING/);
  assert.match(
    migration,
    /participation\.status in \('participating','available_for_task','attended','contributed'\)/,
  );
  assert.match(
    migration,
    /revoke all on function[\s\S]*from public, anon, authenticated/,
  );
});
