import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/comun-48-6-b2-a1-production.yml", "utf8");
const runner = readFileSync("scripts/run-48-6-b2-a1-production.sh", "utf8");

test("B2-A1 production rollout is exact, map-off, and quarantines only the external exception", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(runner, /20260826150000_comun_denuncias_public_evidence_pauta_bridge\.sql/);
  assert.match(runner, /bea0b2363a7bacb55ea021385706cb2e6076e7ff18539ecafd59e1745e480445/);
  assert.match(runner, /COMUN_48_6_B2_A1_COLLECTIVE_PROBLEM_TO_PAUTA_ACTION_BRIDGE_GREEN_MAP_OFF/);
  assert.match(runner, /projectionRows.*0/);
  assert.match(runner, /confirmationRows.*0/);
  assert.match(runner, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED/);
  assert.match(runner, /decrypt=false/);
  assert.match(runner, /vercel@50\.28\.0 env pull/);
  assert.match(runner, /valueState: state\(env\.get\(key\)\)/);
  assert.match(runner, /raw Vercel metadata is never used as the flag value source/);
  assert.doesNotMatch(runner, /supabase\s+db\s+push[^\n]*--include-all/);
  assert.doesNotMatch(runner, /supabase\s+(?:migration\s+repair|db\s+reset|seed)\b/);
});
