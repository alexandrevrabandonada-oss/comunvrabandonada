import assert from "node:assert/strict";
import test from "node:test";

import {
  A3_FLAG_WRITER_ID,
  assertA3MetadataOwnership,
  assertA3Transition,
  createA3WriteReceipt,
} from "./a3-flag-writer-contract.mjs";

test("A3 writer allows only the controlled transitions", () => {
  assert.equal(assertA3Transition({ mode: "rollout", currentState: "OFF", desiredState: "enabled" }).allowed, true);
  assert.equal(assertA3Transition({ mode: "rollout", currentState: "ABSENT", desiredState: "enabled" }).allowed, true);
  assert.equal(assertA3Transition({ mode: "wave0-only", currentState: "OFF", desiredState: "enabled" }).allowed, true);
  assert.equal(assertA3Transition({ mode: "disable-only", currentState: "ON", desiredState: "disabled" }).allowed, true);
  assert.equal(assertA3Transition({ mode: "disable-only", currentState: "OFF", desiredState: "disabled" }).allowed, true);
  assert.throws(() => assertA3Transition({ mode: "rollout", currentState: "ON", desiredState: "enabled" }), /TRANSITION_BLOCKED/);
  assert.throws(() => assertA3Transition({ mode: "disable-only", currentState: "ABSENT", desiredState: "disabled" }), /TRANSITION_BLOCKED/);
});

test("A3 writer fails closed on duplicate or shared Production ownership", () => {
  const row = { key: "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED", target: ["production"], id: "env_a" };
  assert.equal(assertA3MetadataOwnership({ projectRows: [row], sharedRows: [] }).projectEnvCount, 1);
  assert.throws(() => assertA3MetadataOwnership({ projectRows: [row, { ...row, id: "env_b" }], sharedRows: [] }), /DUPLICATE/);
  assert.throws(() => assertA3MetadataOwnership({ projectRows: [row], sharedRows: [row] }), /SHARED/);
});

test("write receipts contain ownership and fingerprints, never raw values", () => {
  const receipt = createA3WriteReceipt({ mode: "disable-only", currentState: "ON", desiredState: "disabled", envId: "env_a", runId: "123", sha: "a".repeat(40), phase: "after_write" });
  assert.equal(receipt.writer, A3_FLAG_WRITER_ID);
  assert.equal(receipt.envId, "sha256:de194369dfe7c2b8");
  assert.equal(receipt.rawValuePersisted, false);
  assert.equal(receipt.tokenPersisted, false);
  assert.doesNotMatch(JSON.stringify(receipt), /env_a/);
});
