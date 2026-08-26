import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const runner = read("scripts/run-48-6-b1-production.sh");
const workflow = read(".github/workflows/comun-48-6-b1-production.yml");

test("B1 production runner is exact, scoped and map-off", () => {
  assert.match(runner, /20260826120000_comun_denuncias_public_projection_opt_in\.sql/);
  assert.match(runner, /supabase db push .*--dry-run/);
  assert.doesNotMatch(
    runner,
    /(^|\n)\s*supabase\s+(?:migration repair|db reset|seed)\b/i,
  );
  assert.doesNotMatch(runner, /supabase db push[^\n]*--include-all/i);
  assert.match(runner, /COMUN_48_6_B1_SCHEMA_GREEN_MAP_OFF/);
  assert.match(runner, /publicMapProduction.*false/);
  assert.match(runner, /schemaWrites.*1_migration_only/);
});

test("B1 production workflow never has a flag or business-data writer", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /vercel env|supabase.*seed|SUPABASE_SERVICE_ROLE_KEY.*run/i);
});
