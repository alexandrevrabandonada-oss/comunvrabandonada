import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.resolve("scripts/verify-pauta-action-cycle-push-plan.mjs");
const exactPlan = `DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20260726133409_comun_collective_actions_foundation.sql
 • 20260726161426_comun_collective_action_member_journey.sql
 • 20260726171220_collective_action_administration_memory.sql
 • 20260730122000_comun_pauta_action_cycle.sql
`;

function withPlan(contents, run) {
  const directory = mkdtempSync(path.join(tmpdir(), "comun-push-plan-"));
  const file = path.join(directory, "plan.txt");
  try {
    writeFileSync(file, contents, "utf8");
    return run(file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts the exact Supabase CLI plan when timestamps precede underscores", () => {
  const output = withPlan(exactPlan, (file) =>
    execFileSync(process.execPath, [script, file], { encoding: "utf8" }),
  );

  assert.equal(output, "COMUN_PAUTA_ACTION_CYCLE_PUSH_PLAN_EXACT\n");
});

test("continues to reject an additional migration", () => {
  assert.throws(
    () =>
      withPlan(`${exactPlan} • 20260730123000_unexpected.sql\n`, (file) =>
        execFileSync(process.execPath, [script, file], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ),
    /COMUN_PAUTA_ACTION_CYCLE_UNEXPECTED_MIGRATION_PLAN/,
  );
});
