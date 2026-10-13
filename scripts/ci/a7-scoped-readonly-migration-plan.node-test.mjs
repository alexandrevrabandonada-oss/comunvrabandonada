import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertEmptyPlan } from "./readonly-reconciled-migration-plan.mjs";
import {
  assertA7MigrationPlan,
  validateDeferredLearningR0,
} from "./a7-scoped-readonly-migration-plan.mjs";

const learningBytes = {
  migrationBytes: readFileSync(
    "supabase/migrations/20261006134804_comun_learning_r0.sql",
  ),
  manifestBytes: readFileSync(
    "supabase/releases/20261006134804-comun-learning-r0.json",
  ),
};
const learningName = "20261006134804_comun_learning_r0.sql";
const learningPlan =
  "DRY RUN: migrations will *not* be pushed to the database.\n" +
  "Would push these migrations:\n" +
  learningName;

test("strict empty-plan validation still blocks the canonical pending School migration", () => {
  assert.throws(() => assertEmptyPlan(learningPlan));
  assert.deepEqual(assertA7MigrationPlan("Remote database is up to date."), {
    state: "empty",
    pending: [],
  });
});

test("A7 accepts only the canonical byte-pinned unrelated School dry-run plan", () => {
  validateDeferredLearningR0(learningBytes);
  assert.deepEqual(assertA7MigrationPlan(learningPlan, learningBytes), {
    state: "one-unrelated-learning-r0-pending",
    pending: [learningName],
  });
  assert.deepEqual(
    assertA7MigrationPlan(
      learningPlan.replace("Would push these migrations:\n", "Would push migration "),
      learningBytes,
    ).pending,
    [learningName],
  );
});

test("A7 rejects unknown, additional, duplicated, contradictory and malformed plans", () => {
  for (const plan of [
    learningName,
    "Would push these migrations:\n" + learningName,
    learningPlan + "\n" + learningName,
    learningPlan + "\n20990101000000_unknown.sql",
    learningPlan.replace(learningName, "20260815184529_comun_solidarity_offers.sql"),
    learningPlan + "\nRemote database is up to date.",
    learningPlan + "\n--include-all",
    learningPlan + "\nmigration repair",
    learningPlan + "\ndb reset",
    learningPlan + "\nseed",
    "",
    "Connecting to remote database...",
  ])
    assert.throws(() => assertA7MigrationPlan(plan, learningBytes));
});

test("A7 rejects changed migration or manifest bytes and absent deferred proof", () => {
  for (const proof of [
    {},
    { ...learningBytes, migrationBytes: Buffer.from("changed") },
    { ...learningBytes, manifestBytes: Buffer.from("{}") },
    {
      ...learningBytes,
      manifestBytes: Buffer.from(
        learningBytes.manifestBytes.toString("utf8").replace(
          '"remotePromotionAllowed": false',
          '"remotePromotionAllowed": true',
        ),
      ),
    },
  ])
    assert.throws(() => assertA7MigrationPlan(learningPlan, proof));
});

test("A7 blocked diagnostics never include private connection data", () => {
  assert.throws(
    () =>
      assertA7MigrationPlan(
        "postgresql://private:secret@example.invalid/test\n20990101000000_unknown.sql",
        learningBytes,
      ),
    { message: "REMOTE_MIGRATION_PLAN_NOT_EMPTY:20990101000000_unknown.sql" },
  );
});
