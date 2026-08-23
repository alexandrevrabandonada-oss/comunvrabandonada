import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runner = fs.readFileSync("scripts/run-48-5-a5-a1-r1-production.sh", "utf8");
const workflow = fs.readFileSync(".github/workflows/comun-48-5-a5-a1-r1-production.yml", "utf8");
const plannerBridgeWorkflow = fs.readFileSync(".github/workflows/comun-48-1b-r1c-external-ledger-planner-bridge.yml", "utf8");
const flags = fs.readFileSync("scripts/ci/a5-a1-r1-flag-contract.mjs", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260823003249_comun_cultural_specialized_provenance_readiness.sql", "utf8");

test("A5-A1-R1 is manual, exact-main and Production-bound", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(runner, /git merge-base --is-ancestor/);
  assert.match(runner, /nvmdszymrtacfehdynpg/);
  assert.match(runner, /771975081046474022764a8e69743cc6015ebb4a817c614719fa7d6dfc74bdfb/);
});

test("A5-A1-R1 fails closed to the exact migration plan", () => {
  assert.match(runner, /supabase migration list --db-url/);
  assert.match(runner, /supabase db push --db-url .*--dry-run/);
  assert.match(runner, /planned\[0\].*basename.*A5_A1_MIGRATION/);
  assert.match(runner, /BLOCKED_NONEXACT_MIGRATION_PLAN/);
  assert.doesNotMatch(runner, /--include-all|migration repair|db reset|\bseed\b/);
});

test("A5-A1-R1 reconciles only the validated external sidewalk ledger during CLI planning", () => {
  for (const marker of [
    "20260724233256-sidewalk-external-ledger.json",
    "20260724233256_comun_sidewalk_operational_hardening.sql",
    "COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN",
    "quarantine_sidewalk_for_cli_planning",
    "restore_sidewalk_migration",
    "COMUN_48_1B_R1C_EXTERNAL_LEDGER_PLANNER_BRIDGE_GREEN_ZERO_REMOTE_WRITES",
  ]) assert.match(runner, new RegExp(marker));
  assert.match(runner, /trap cleanup EXIT/);
  assert.match(runner, /test -z "\$\(git status --porcelain -- "\$SIDEWALK_MIGRATION"\)"/);
  assert.match(runner, /assert_a5_schema_state/);
  assert.match(runner, /verify-applied/);
  assert.match(runner, /ProductionSchemaWrites":0/);
  assert.doesNotMatch(runner, /--include-all|migration repair|db reset|\bseed\b/);
  assert.match(plannerBridgeWorkflow, /A5_A1_EXECUTION_MODE: planner-bridge/);
  assert.match(plannerBridgeWorkflow, /environment: production/);
  assert.match(plannerBridgeWorkflow, /workflow_dispatch:/);
});

test("A5-A1-R1 contains a single persistent schema-write path", () => {
  assert.equal((runner.match(/supabase db push --db-url "\$SUPABASE_DB_URL" > "\$TEMP_ROOT\/migration-apply\.log"/g) ?? []).length, 1);
  assert.match(runner, /A5_ALREADY_APPLIED/);
  assert.match(runner, /begin read only;/);
  assert.match(runner, /ProductionBusinessWrites:0/);
  assert.match(runner, /ProductionSchemaWrites":"1_migration_only/);
  assert.match(runner, /local phase="\$1"\s+local output="\$ARTIFACT_DIR\/\$\{phase\}-snapshot\.json"/);
  assert.match(runner, /c\.relname\|\|':'\|\|c\.relkind::text/);
});

test("A5-A1-R1 checks specialized schema, grants, legacy nulls and no-public effects", () => {
  for (const marker of ["private_root_archive_item_id", "comun_radio_contributions_private_root_pair_check", "comun_oral_suggestions_private_root_guard", "comun_radio_contributions_private_root_guard", "legacyBackfillFalse", "publicExecuteClosed", "serviceRoleExecute", "privateRootsCreated:0", "publicAssetPromotions:0", "SearchWrites:0"]) assert.match(runner, new RegExp(marker));
  assert.match(flags, /COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED/);
  assert.match(flags, /COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED/);
  assert.match(flags, /row\.type !== "encrypted"/);
  assert.match(migration, /create or replace function public\.comun_materialize_oral_history_suggestion_private_root_v1/);
  assert.match(runner, /legacyBackfillFalse/);
  assert.match(runner, /compare_business_delta/);
});

test("A5-A1-R1 has only GET/HEAD public smokes and sanitized artifacts", () => {
  assert.match(runner, /methods":"GET_HEAD_ONLY/);
  assert.match(runner, /resume_token_hash\|member_user_id\|private_root_archive_item_id/);
  assert.doesNotMatch(runner, /story_summary/);
  for (const artifact of ["preflight.json", "migration-plan.txt", "schema-postflight.json", "business-delta.json", "security-postflight.json", "smoke-summary.json", "closeout.json"]) assert.match(runner, new RegExp(artifact.replace(".", "\\.")));
  assert.doesNotMatch(runner, /curl[^\n]*-X\s*(?:POST|PATCH|DELETE)/i);
});
