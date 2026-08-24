import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runner=fs.readFileSync("scripts/run-48-5-a5-a2-r1-production.sh","utf8");
const workflow=fs.readFileSync(".github/workflows/comun-48-5-a5-a2-r1-production.yml","utf8");

test("A5-A2-R1 is manual, exact-main and Production-bound",()=>{
  assert.match(workflow,/workflow_dispatch:/); assert.match(workflow,/environment: production/); assert.match(workflow,/ref: \$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(runner,/nvmdszymrtacfehdynpg/); assert.match(workflow,/b9da07e8da93aa22d41119eb3a0f406176595bd4fbdf96bf1d75e16ddfd02354/);
});
test("planner excludes only the validated Sidewalk exception and requires exact Art",()=>{
  for(const x of ["validate-sidewalk-external-ledger-exception","COMUN_SIDEWALK_EXTERNAL_LEDGER_EVOLVED_SCOPE_GREEN","BLOCKED_UNEXPECTED_MIGRATION_PLAN","trap cleanup EXIT"]) assert.match(runner,new RegExp(x));
  assert.match(workflow,/20260824001340_comun_artwork_submission_private_materialization\.sql/);
  assert.match(runner,/planner-before\.txt" 2>&1/);
  assert.match(runner,/planner-after\.txt" 2>&1/);
  assert.doesNotMatch(runner,/--include-all|migration repair|db reset|\bseed\b/);
});
test("the only persistent write is one migration apply",()=>{
  assert.equal((runner.match(/supabase db push --db-url "\$SUPABASE_DB_URL" > "\$TEMP_ROOT\/apply\.log"/g)??[]).length,1);
  assert.match(runner,/begin read only;/); assert.match(runner,/ProductionBusinessWrites:0/); assert.match(runner,/ProductionSchemaWrites":"1_migration_only/);
});
test("postflight proves grants, RLS, no backfill and empty planner",()=>{
  for(const x of ["clientExecuteClosed","serviceRoleExecute","artworkRls","ArtworkSubmissionBackfill:0","publicAssetPromotions:0","planner-after.txt"]) assert.match(runner,new RegExp(x));
});
