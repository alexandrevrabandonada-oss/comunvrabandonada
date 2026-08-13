import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync(".github/workflows/comun-48-3-b1-preflight.yml", "utf8");
const disposable = readFileSync(".github/workflows/comun-48-3-b1-disposable.yml", "utf8");
const activation = readFileSync(".github/workflows/comun-48-3-b1-activation.yml", "utf8");
const wave = readFileSync("scripts/pautas/run-48-3-b1-production-wave.sh", "utf8");

test("B1 preflight reads metadata only and requires an empty migration plan", () => {
  assert.match(preflight, /begin read only;/);
  assert.match(preflight, /businessContentRead', false/);
  assert.match(preflight, /COMUN_48_3_B1_REMOTE_PLAN_EMPTY_GREEN/);
  assert.doesNotMatch(preflight, /select\s+\*\s+from/i);
  assert.doesNotMatch(preflight, /migration repair|db reset|--include-all|\bseed\b/i);
});

test("B1 disposable proof writes once and rolls back without side effects", () => {
  assert.match(disposable, /COMUN_48_3_B1_DISPOSABLE_SUBMISSION_GREEN/);
  assert.match(disposable, /dual write/);
  assert.match(disposable, /membership side effect/);
  assert.match(disposable, /rollback;/);
});

test("B1 rollout binds exact main, preserves A1, and rolls back fail closed", () => {
  assert.match(activation, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/);
  assert.match(wave, /COMUN_RODAS_VIVAS_ENABLED production/);
  assert.match(wave, /COMUN_48_3_B1_FLAGS_OFF_PRODUCTION_GREEN/);
  assert.match(wave, /COMUN_48_3_B1_WAVE1_RODAS_VIVAS_PRODUCTION_GREEN/);
  assert.match(wave, /rollback/);
  assert.match(wave, /businessWrites=0/);
});
