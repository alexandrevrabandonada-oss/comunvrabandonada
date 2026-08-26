import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/comun-48-6-b0-production.yml", "utf8");
const runner = readFileSync("scripts/run-48-6-b0-production.sh", "utf8");

test("B0 production rollout is exact, quarantines only the external exception and keeps the map off", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /execution_mode/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(runner, /20260826090000_comun_denuncias_public_collective_projection\.sql/);
  assert.match(runner, /590fba97f44f549588b8e97b2dc88fc80a83844fa1e612facb6e5b58674328f4/);
  assert.match(runner, /20260724233256_comun_sidewalk_operational_hardening\.sql/);
  assert.match(runner, /COMUN_48_6_B0_SCHEMA_GREEN_MAP_OFF_NO_PROJECTION/);
  assert.match(runner, /projectionRows.*0/);
  assert.match(runner, /publicProjection.*false/);
  assert.doesNotMatch(runner, /\bsupabase\s+(?:migration\s+repair|db\s+reset|seed)\b/);
  assert.doesNotMatch(runner, /supabase\s+db\s+push[^\n]*--include-all/);
  assert.doesNotMatch(runner, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.*(add|rm|pull)/);
});
