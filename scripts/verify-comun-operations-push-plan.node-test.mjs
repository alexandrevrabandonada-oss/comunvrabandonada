import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.resolve("scripts/verify-comun-operations-push-plan.mjs");
const exactPlan = `DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20260730230044_comun_operations_unified_projection.sql
`;

function withPlan(contents, run) {
  const directory = mkdtempSync(path.join(tmpdir(), "comun-operations-plan-"));
  const file = path.join(directory, "plan.txt");
  try {
    writeFileSync(file, contents, "utf8");
    return run(file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts only the exact additive operations migration", () => {
  const output = withPlan(exactPlan, (file) =>
    execFileSync(process.execPath, [script, file], { encoding: "utf8" }),
  );
  assert.equal(output, "COMUN_OPERATIONS_MIGRATION_PLAN_EXACT\n");
});

test("rejects an additional migration", () => {
  assert.throws(
    () =>
      withPlan(`${exactPlan} • 20260730230100_unexpected.sql\n`, (file) =>
        execFileSync(process.execPath, [script, file], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ),
    /COMUN_OPERATIONS_UNEXPECTED_MIGRATION_PLAN/,
  );
});

test("rejects a destructive plan", () => {
  assert.throws(
    () =>
      withPlan(`${exactPlan}\nDROP TABLE public.example;`, (file) =>
        execFileSync(process.execPath, [script, file], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ),
    /COMUN_OPERATIONS_DESTRUCTIVE_PLAN_BLOCKED/,
  );
});
