import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { A3_KEY, A4_KEY, assertRepairPreconditions, inspect, repairPayload, sanitizePatchResult } from "./a4-d0-r1-env-repair-contract.mjs";

function fixture({ a4Type = "sensitive", a4Value = "", policy = false, duplicate = false, shared = false } = {}) {
  const project = { envs: [
    { id: "a4", key: A4_KEY, type: a4Type, target: ["production"], gitBranch: null, customEnvironmentIds: [] },
    { id: "a3", key: A3_KEY, type: "encrypted", target: ["production"], gitBranch: null, customEnvironmentIds: [] },
  ] };
  if (duplicate) project.envs.push({ id: "a4b", key: A4_KEY, type: a4Type, target: ["production"], gitBranch: null, customEnvironmentIds: [] });
  const envFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "a4-r1-")), "env");
  fs.writeFileSync(envFile, `${A3_KEY}=enabled\n${a4Value ? `${A4_KEY}=${a4Value}\n` : ""}`);
  return { project, shared: { envs: shared ? [{ key: A4_KEY, target: ["production"] }] : [] }, envFile, team: { enforceSensitiveEnvironmentVariables: policy } };
}

test("canonical sensitive/absent row is eligible only with policy disabled", () => {
  const input = fixture();
  assert.equal(assertRepairPreconditions(input).a4.valueState, "ABSENT");
  assert.deepEqual(repairPayload(), { type: "encrypted", value: "disabled", target: ["production"] });
});

test("unknown/enforced team policy, duplicate, shared, A3 drift and non-absent state fail closed", () => {
  assert.throws(() => assertRepairPreconditions(fixture({ policy: true })), /POLICY/);
  assert.throws(() => assertRepairPreconditions(fixture({ duplicate: true })), /NOT_UNIQUE/);
  assert.throws(() => assertRepairPreconditions(fixture({ shared: true })), /SHARED/);
  assert.throws(() => assertRepairPreconditions(fixture({ a4Value: "disabled" })), /EXPECTED_ABSENT/);
  const a3Drift = fixture();
  fs.writeFileSync(a3Drift.envFile, `${A3_KEY}=disabled\n`);
  assert.throws(() => assertRepairPreconditions(a3Drift), /A3_NOT_INTACT/);
});

test("inspection and PATCH receipt keep values and tokens out", () => {
  const receipt = inspect(fixture());
  assert.equal(receipt.rawValuePersisted, false);
  assert.doesNotMatch(JSON.stringify(receipt), /"value"\s*:/);
  const failure = sanitizePatchResult({ status: 400, payload: { error: { code: "bad_request", message: "invalid target" } } });
  assert.deepEqual(failure, { httpStatus: 400, errorCode: "bad_request", errorMessage: "invalid target", successful: false, rawValuePersisted: false, tokenPersisted: false });
});
