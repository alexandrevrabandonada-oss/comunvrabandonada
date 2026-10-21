import assert from "node:assert/strict";
import test from "node:test";
import { COMUN_COMPETENCY_EVIDENCE_VERSION } from "../../lib/comun-competency-evidence.ts";

test("C1 publishes its version through the module API", () => {
  assert.equal(COMUN_COMPETENCY_EVIDENCE_VERSION, "comun-competency-evidence-v0");
});
