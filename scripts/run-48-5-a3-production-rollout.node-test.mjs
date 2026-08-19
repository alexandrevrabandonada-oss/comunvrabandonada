import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(".github/workflows/comun-48-5-a3-rollout.yml", "utf8");
const runner = fs.readFileSync("scripts/run-48-5-a3-production-rollout.sh", "utf8");

test("A3 R2 rollout is bound to exact main and the exact A3 migration", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /options: \[rollout, disable-only\]/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(workflow, /20260818120000_comun_cultural_specialized_handoff\.sql/);
  assert.match(workflow, /A3_MIGRATION_SHA256: 0cadb9/);
  assert.match(runner, /git merge-base --is-ancestor/);
  assert.match(runner, /productionReady=true/);
  assert.match(runner, /planned\[0\].*basename \"\$A3_MIGRATION\"/s);
});

test("Wave 0 excludes later A4 and external ledger files before planning", () => {
  assert.match(runner, /A4_MIGRATION/);
  assert.match(runner, /SIDEWALK_MIGRATION/);
  assert.match(runner, /supabase db push --db-url.*--dry-run/);
  assert.doesNotMatch(runner, /supabase db push[^\n]*--include-all/);
  assert.doesNotMatch(runner, /supabase (migration repair|db reset)/);
});

test("the rollout changes only the A3 Vercel flag and never submits production data", () => {
  assert.match(runner, /COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED production/);
  assert.match(runner, /a3-flag-writer-contract\.mjs/);
  assert.match(runner, /api\.vercel\.com\/v10\/projects/);
  assert.match(runner, /api\.vercel\.com\/v1\/env/);
  assert.match(runner, /a3-flag-write-receipt/);
  assert.doesNotMatch(runner, /COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED production/);
  assert.doesNotMatch(runner, /-X POST| -X POST|curl[^\n]*POST/);
  assert.match(runner, /newTargets=0/);
  assert.match(runner, /productionRequests=GET_HEAD_ONLY/);
  assert.match(runner, /rollback_flag/);
  assert.match(runner, /COMUN_48_5_A3_R2_PRECHECK_FLAG_RESTORED_OFF/);
});
