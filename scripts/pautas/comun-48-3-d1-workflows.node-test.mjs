import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync(".github/workflows/comun-48-3-d1-preflight.yml", "utf8");
const disposable = readFileSync(".github/workflows/comun-48-3-d1-disposable.yml", "utf8");
const activation = readFileSync(".github/workflows/comun-48-3-d1-activation.yml", "utf8");
const wave = readFileSync("scripts/pautas/run-48-3-d1-production-wave.sh", "utf8");

test("D1 preflight is metadata-only and requires an empty migration plan", () => {
  assert.match(preflight, /begin read only;/);
  assert.match(preflight, /businessContentRead', false/);
  assert.match(preflight, /searchDeclaredDiscoveryOnly/);
  assert.match(preflight, /COMUN_48_3_D1_REMOTE_PLAN_EMPTY_GREEN/);
  assert.doesNotMatch(preflight, /select\s+\*\s+from/i);
  assert.doesNotMatch(preflight, /migration repair|db reset|--include-all|\bseed\b/i);
});

test("D1 disposable proof builds the canonical chain and rolls it back", () => {
  assert.match(disposable, /comun_construction_circles/);
  assert.match(disposable, /comun_circle_syntheses/);
  assert.match(disposable, /comun_pauta_decisions/);
  assert.match(disposable, /comun_collective_actions/);
  assert.match(disposable, /comun_hub_results/);
  assert.match(disposable, /DIVERGENT_SEARCH_INDEX_SENTINEL/);
  assert.match(disposable, /COMUN_48_3_D1_DISPOSABLE_CANONICAL_MEMORY_GREEN/);
  assert.match(disposable, /rollback;/);
});

test("D1 rollout binds exact main, GET-only smoke, and rolls back fail closed", () => {
  assert.match(activation, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/);
  assert.match(wave, /COMUN_PAUTA_CYCLE_MEMORY_ENABLED production/);
  assert.match(wave, /COMUN_48_3_D1_FLAGS_OFF_PRODUCTION_GREEN/);
  assert.match(wave, /COMUN_48_3_D1_WAVE1_CANONICAL_MEMORY_PRODUCTION_GREEN/);
  assert.match(wave, /COMUN_48_3_D1_BLOCKED_VERCEL_ROLLBACK_REQUIRED/);
  assert.match(wave, /productionRequests=GET_ONLY/);
  assert.match(wave, /businessWrites=0/);
  assert.doesNotMatch(wave, /curl[^\n]*(?:-X|--request)\s+(?:POST|PUT|PATCH|DELETE)/i);
});
