import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSyntheticEnvironment,
  parseMemoryEvents,
  exitStatus,
} from "./run-soc-d08-browser-proof.mjs";

test("external credentials are refused without disclosing their value", () => {
  assert.doesNotThrow(() => assertSyntheticEnvironment({}));
  assert.throws(
    () => assertSyntheticEnvironment({ SUPABASE_DB_URL: "private-value" }),
    /^Error: SOC_D08_DIAGNOSTICS_EXTERNAL_ENV_REFUSED$/,
  );
});
test("resource evidence includes only numeric allowlisted counters", () => {
  assert.deepEqual(
    parseMemoryEvents("oom 2\noom_kill 1\nsecret private\nlow invalid"),
    { oom: 2, oom_kill: 1 },
  );
});
test("native termination and nonzero exits remain failures", () => {
  assert.equal(exitStatus(0, null), 0);
  assert.equal(exitStatus(7, null), 7);
  assert.equal(exitStatus(null, "SIGKILL"), 1);
  assert.equal(exitStatus(null, null), 1);
});
