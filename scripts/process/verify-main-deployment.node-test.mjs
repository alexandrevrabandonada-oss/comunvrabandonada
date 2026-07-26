import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateMainDeployment } from "./verify-main-deployment.mjs";

const SHA = "a".repeat(40);

function deployment(overrides = {}) {
  return {
    eventName: "deployment_status",
    environment: "Production",
    state: "success",
    sha: SHA,
    mainContainsSha: true,
    ...overrides,
  };
}

test("aceita deployment.ref main quando o SHA pertence à main", () => {
  assert.deepEqual(evaluateMainDeployment(deployment({ ref: "main" })), {
    eligible: true,
    reason: "main_lineage_confirmed",
  });
});

test("aceita deployment.ref SHA quando o SHA pertence à main", () => {
  assert.equal(evaluateMainDeployment(deployment({ ref: SHA })).eligible, true);
});

test("recusa branch externa mesmo que deployment.ref pareça uma branch", () => {
  assert.equal(
    evaluateMainDeployment(
      deployment({ ref: "codex/externa", mainContainsSha: false }),
    ).eligible,
    false,
  );
});

test("recusa deployment de Preview", () => {
  assert.equal(
    evaluateMainDeployment(deployment({ environment: "Preview" })).reason,
    "environment_not_production",
  );
});

test("recusa deployment em failure", () => {
  assert.equal(
    evaluateMainDeployment(deployment({ state: "failure" })).reason,
    "deployment_not_successful",
  );
});

test("recusa SHA ausente", () => {
  assert.equal(
    evaluateMainDeployment(deployment({ sha: undefined })).reason,
    "deployment_sha_missing_or_invalid",
  );
});

test("recusa SHA não encontrado", () => {
  assert.equal(
    evaluateMainDeployment(deployment({ mainContainsSha: "not_found" })).reason,
    "deployment_sha_not_found",
  );
});

test("aceita SHA ancestral quando main avançou", () => {
  assert.equal(
    evaluateMainDeployment(deployment({ mainContainsSha: true })).eligible,
    true,
  );
});

test("dados inválidos nunca produzem eligible true", () => {
  assert.equal(
    evaluateMainDeployment(
      deployment({ eventName: "push", environment: "Preview", sha: "x" }),
    ).eligible,
    false,
  );
});

test("replay executa a automação da main atual, não o merge histórico", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-retro-replay.yml",
    "utf8",
  );
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /ref: \$\{\{ inputs\.merge_sha \}\}/);
});
