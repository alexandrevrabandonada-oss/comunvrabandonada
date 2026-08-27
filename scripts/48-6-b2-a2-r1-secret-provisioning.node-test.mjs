import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workflow = read(".github/workflows/comun-48-6-b2-a2-r1-secret-provisioning.yml");
const runner = read("scripts/run-48-6-b2-a2-r1-secret-provisioning.sh");

test("R1 is Production-only and uses the canonical project", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(workflow, /prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X/);
  assert.match(workflow, /environment: production/);
  assert.match(runner, /target: \["production"\]/);
  assert.doesNotMatch(runner, /(?:target|environment|env add)[^\n]*(?:preview|development)/i);
});

test("R1 never exposes or persists secret values", () => {
  assert.doesNotMatch(runner, /set -x/);
  assert.doesNotMatch(runner, /\.ci-artifacts[^\n]*(?:LOCATION|SPATIAL)_KEY_FILE/i);
  assert.doesNotMatch(runner, /summary\([^\n]*(?:LOCATION|SPATIAL)_KEY_FILE/i);
  assert.doesNotMatch(runner, /console\.log|process\.stdout\.write\(.*env|getenv/i);
  assert.match(runner, /rm -f .*LOCATION_KEY_FILE/);
  assert.match(runner, /trap cleanup EXIT/);
  assert.match(runner, /validShape/);
  assert.match(runner, /keysDistinct/);
});

test("R1 blocks key rotation when dependent rows exist", () => {
  assert.match(runner, /privateLocationCount/);
  assert.match(runner, /matchKeyCount/);
  assert.match(runner, /BLOCKED_LOCATION_KEY_ROTATION_REQUIRED/);
  assert.match(runner, /BLOCKED_SPATIAL_KEY_ROTATION_REQUIRED/);
});

test("R1 has no schema migration, business write, or map enable", () => {
  assert.doesNotMatch(runner, /supabase db push|migration repair|db reset|seed/i);
  assert.match(runner, /productionBusinessWrites=0/);
  assert.match(runner, /productionSchemaWrites=0/);
  assert.match(runner, /map=OFF_OR_ABSENT/);
  assert.doesNotMatch(runner, /COMUN_RELATA_COLLECTIVE_ENABLED.*enabled/);
});

test("R1 creates only encrypted Production envs and checks the result", () => {
  assert.match(runner, /type: "encrypted"/);
  assert.match(runner, /v10\/projects\/\$VERCEL_PROJECT_ID\/env\?teamId=/);
  assert.match(runner, /v10\/projects\/\$VERCEL_PROJECT_ID\/env\?teamId=.*decrypt=false/);
  assert.match(runner, /BLOCKED_KEY_POSTCHECK/);
  assert.match(runner, /SECRET_PROVISIONING_GREEN_READY_FOR_PREFLIGHT/);
});
