import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runners = [
  ["B2-A2", fs.readFileSync("scripts/run-48-6-b2-a2-production.sh", "utf8")],
  ["R5", fs.readFileSync("scripts/run-48-6-b2-a2-r5-sensitive-spatial-key.sh", "utf8")],
];

for (const [name, source] of runners) {
  test(`${name} gates Production deploy behind causal reconsult`, () => {
    assert.match(source, /vercel-production-redeploy-causality\.mjs/);
    assert.match(source, /api\.vercel\.com\/v6\/deployments/);
    assert.match(source, /target=production/);
    assert.match(source, /env-write=/);
    assert.match(source, /causal_production_redeploy/);
    assert.match(source, /create_production_deployment\(\)/);
    assert.match(source, /if \[\[ \"\$needs_build\" == true \]\]/);
  });
}

test("the shared core exposes distinct build and promotion outcomes", () => {
  const core = fs.readFileSync("scripts/ci/vercel-production-redeploy-causality.mjs", "utf8");
  assert.match(core, /REUSE_FRESH_READY/);
  assert.match(core, /REUSE_READY_PROMOTE_ONLY/);
  assert.match(core, /BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT/);
  assert.match(core, /WAIT_FOR_EXISTING_EXACT_SHA/);
});
