import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(".github/workflows/comun-48-5-a3-rollout.yml", "utf8");
const runner = fs.readFileSync("scripts/run-48-5-a3-production-rollout.sh", "utf8");

test("A3 R2 rollout is bound to exact main and the exact A3 migration", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /options: \[wave1-only, wave0-only, rollout, disable-only\]/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(workflow, /20260818120000_comun_cultural_specialized_handoff\.sql/);
  assert.match(workflow, /A3_MIGRATION_SHA256: 0cadb9/);
  assert.match(runner, /git merge-base --is-ancestor/);
  assert.match(runner, /productionReady=true/);
  assert.match(runner, /planned\[0\].*basename \"\$A3_MIGRATION\"/s);
  assert.match(runner, /Remote database is up to date\./);
  assert.match(runner, /migration_already_applied_verified/);
});

test("Wave 0 excludes later A4 and external ledger files before planning", () => {
  assert.match(runner, /A4_MIGRATION/);
  assert.match(runner, /SIDEWALK_MIGRATION/);
  assert.match(runner, /supabase db push --db-url.*--dry-run/);
  assert.doesNotMatch(runner, /supabase db push[^\n]*--include-all/);
  assert.doesNotMatch(runner, /supabase (migration repair|db reset)/);
  assert.match(runner, /MIGRATION_PLAN_HELD_A4/);
  assert.match(runner, /MIGRATION_PLAN_HELD_SIDEWALK/);
  assert.doesNotMatch(runner, /local held_a[34]|local held_sidewalk/);
});

test("the rollout changes only the A3 Vercel flag and never submits production data", () => {
  assert.match(runner, /v9\/projects\/\$VERCEL_PROJECT_ID\/env\/\$env_id\?teamId=/);
  assert.doesNotMatch(runner, /env add COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED production --force/);
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

test("wave0-only applies schema, rechecks OFF, and exits before Wave 1", () => {
  assert.match(workflow, /wave0-only/);
  assert.match(runner, /if test "\$MODE" = "wave0-only"; then/);
  assert.match(runner, /flag_off_post_migration_verified/);
  assert.match(runner, /a3-wave0-final-receipt\.json/);
  assert.match(runner, /exit 0/);
  assert.match(runner, /flag_started=true/);
});

test("wave1-only has an independent no-migration path and read-only smoke proof", () => {
  assert.match(workflow, /wave1-only/);
  assert.match(runner, /if test "\$MODE" = "wave1-only"; then/);
  assert.match(runner, /schema_preflight_green/);
  assert.match(runner, /zero_write_snapshot/);
  assert.match(runner, /featureDetection=handoff_bundle_markers_green/);
  assert.match(runner, /verify_a3_flag_metadata/);
  assert.doesNotMatch(runner.split('if test "$MODE" = "wave1-only"; then')[1].split('\nassert_exact_migration_plan')[0], /supabase db push/);
});
