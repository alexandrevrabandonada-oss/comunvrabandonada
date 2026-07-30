import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPautaActionCyclePreflight,
  PAUTA_ACTION_CYCLE_MIGRATIONS,
} from "./preflight-pauta-action-cycle.mjs";

const complete = {
  appliedVersions: PAUTA_ACTION_CYCLE_MIGRATIONS,
  objectCount: 11,
  rlsCount: 11,
  functionPresent: true,
};

test("fresh remote state is ready only when history and objects are absent", () => {
  assert.equal(
    classifyPautaActionCyclePreflight({
      appliedVersions: [],
      objectCount: 0,
      rlsCount: 0,
      functionPresent: false,
    }),
    "ABSENT_READY",
  );
});

test("complete state is accepted before and required after migration", () => {
  assert.equal(classifyPautaActionCyclePreflight(complete), "APPLIED_EXACT");
  assert.equal(
    classifyPautaActionCyclePreflight(complete, "after"),
    "APPLIED_EXACT",
  );
});

test("partial history, partial objects or missing RLS fail closed", () => {
  for (const state of [
    { ...complete, appliedVersions: PAUTA_ACTION_CYCLE_MIGRATIONS.slice(0, 2) },
    { ...complete, objectCount: 10 },
    { ...complete, rlsCount: 10 },
    { ...complete, functionPresent: false },
  ]) {
    assert.equal(
      classifyPautaActionCyclePreflight(state),
      "PARTIAL_OR_INCOMPATIBLE",
    );
    assert.equal(
      classifyPautaActionCyclePreflight(state, "after"),
      "INCOMPATIBLE",
    );
  }
});
