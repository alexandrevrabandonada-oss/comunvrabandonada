import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync(
  ".github/workflows/comun-48-3-c1-preflight.yml",
  "utf8",
);
const disposable = readFileSync(
  ".github/workflows/comun-48-3-c1-disposable.yml",
  "utf8",
);
const activation = readFileSync(
  ".github/workflows/comun-48-3-c1-activation.yml",
  "utf8",
);
const wave = readFileSync(
  "scripts/pautas/run-48-3-c1-production-wave.sh",
  "utf8",
);

test("C1 preflight is metadata-only and requires an empty migration plan", () => {
  assert.match(preflight, /begin read only;/);
  assert.match(preflight, /businessContentRead', false/);
  assert.match(preflight, /COMUN_48_3_C1_REMOTE_PLAN_EMPTY_GREEN/);
  assert.match(preflight, /failedChecks=/);
  assert.match(preflight, /comun_mobilization_actions/);
  assert.doesNotMatch(preflight, /select\s+\*\s+from/i);
  assert.doesNotMatch(
    preflight,
    /migration repair|db reset|--include-all|\bseed\b/i,
  );
});

test("C1 disposable proof rolls back without membership, role, legacy, or automatic action writes", () => {
  assert.match(disposable, /COMUN_48_3_C1_DISPOSABLE_MEMBER_JOURNEY_GREEN/);
  assert.match(disposable, /capacity guard accepted second claim/);
  assert.match(disposable, /expired task accepted claim/);
  assert.match(disposable, /automatic collective action created/);
  assert.match(disposable, /pauta membership side effect/);
  assert.match(disposable, /community membership side effect/);
  assert.match(disposable, /role side effect/);
  assert.match(disposable, /legacy write/);
  assert.match(disposable, /rollback;/);
});

test("C1 rollout binds exact main, preserves prior routes, and rolls back fail closed", () => {
  assert.match(
    activation,
    /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/,
  );
  assert.match(
    wave,
    /COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED production/,
  );
  assert.match(wave, /COMUN_48_3_C1_FLAGS_OFF_PRODUCTION_GREEN/);
  assert.match(wave, /COMUN_48_3_C1_WAVE1_CANONICAL_ACTIONS_PRODUCTION_GREEN/);
  assert.match(wave, /rollback/);
  assert.match(wave, /businessWrites=0/);
});
