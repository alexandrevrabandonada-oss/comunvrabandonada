import test from "node:test";
import assert from "node:assert/strict";
import { auditA4Wave0Flags } from "./a4-wave0-flag-contract.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function fixture({ a4 = "disabled", a3 = "enabled", duplicateA4 = false, sharedA4 = false } = {}) {
  const project = {
    envs: [
      { id: "a4-prod", key: "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED", target: ["production"], createdAt: 1, updatedAt: 2, gitBranch: null, customEnvironmentIds: [] },
      { id: "a4-preview", key: "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED", target: ["preview"], createdAt: 1, updatedAt: 2, gitBranch: "feature/x", customEnvironmentIds: [] },
      ...(duplicateA4 ? [{ id: "a4-prod-2", key: "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED", target: ["production"], createdAt: 1, updatedAt: 2, gitBranch: null, customEnvironmentIds: [] }] : []),
      { id: "a3-prod", key: "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED", target: ["production"], createdAt: 1, updatedAt: 2, gitBranch: null, customEnvironmentIds: [] },
    ],
    shared: { envs: sharedA4 ? [{ id: "shared-a4", key: "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED", target: ["production"] }] : [] },
    env: new Map([
      ["COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED", a4],
      ["COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED", a3],
    ]),
  };
  return project;
}

function run(input) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "comun-a4-flag-"));
  const output = path.join(directory, "audit.json");
  return auditA4Wave0Flags({ project: input.env ? input : input, shared: input.shared, env: input.env, output });
}

test("A4 OFF and A3 ON are accepted without a mutation", () => {
  const input = fixture();
  const result = run(input);
  assert.equal(result.a4.production.valueState, "OFF");
  assert.equal(result.a3.production.valueState, "ON");
  assert.equal(result.valuesPersisted, false);
});

test("A4 ON is fail-closed", () => {
  assert.throws(() => run(fixture({ a4: "enabled" })), /PROGRESSIVE_RIGHTS_ENABLED_EXPECTED_OFF_GOT_ON/);
});

test("duplicate Production key is fail-closed", () => {
  assert.throws(() => run(fixture({ duplicateA4: true })), /PRODUCTION_ENV_NOT_UNIQUE/);
});

test("shared A4 key is fail-closed", () => {
  assert.throws(() => run(fixture({ sharedA4: true })), /SHARED_ENV_CONFLICT/);
});

test("A3 must stay active during A4 Wave 0", () => {
  assert.throws(() => run(fixture({ a3: "disabled" })), /SPECIALIZED_HANDOFF_ENABLED_EXPECTED_ON_GOT_OFF/);
});
