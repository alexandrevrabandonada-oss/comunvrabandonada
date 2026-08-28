import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  canonicalVercelBinding,
  createSanitizedKeyMetadataDiagnostic,
} from "./run-48-6-b2-a2-r4-key-metadata-diagnostic.mjs";
import { validateR4Artifact } from "./assert-sanitized-artifact.mjs";

const location = "COMUN_RELATA_LOCATION_ENCRYPTION_KEY";
const spatial = "COMUN_RELATA_SPATIAL_HMAC_KEY";

const baseProject = (rows = []) => ({ envs: rows });
const shared = (rows = []) => ({ data: rows });
const workflow = fs.readFileSync(
  path.resolve(import.meta.dirname, "../.github/workflows/comun-48-6-b2-a2-r4-key-metadata-diagnostic.yml"),
  "utf8",
);

test("workflow is metadata-only and keeps raw responses in RUNNER_TEMP", () => {
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /expected_main_sha/);
  assert.match(workflow, /decrypt=false/);
  assert.match(workflow, /RUNNER_TEMP/);
  assert.match(workflow, /diagnostic\.json/);
  assert.doesNotMatch(workflow, /vercel\s+env\s+pull|decrypt=true|\/v1\/env\//i);
  assert.doesNotMatch(workflow, /-X\s+(POST|PATCH|DELETE)/i);
});

test("absence is classified without inventing metadata", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject(),
    sharedLocationPayload: shared(),
    sharedSpatialPayload: shared(),
  });
  assert.equal(result.locationKey.resultCode, "KEY_ABSENT");
  assert.equal(result.spatialKey.resultCode, "KEY_ABSENT");
  assert.equal(result.productionWrites, 0);
});

test("canonical project metadata is recognized", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject([{ key: location, type: "sensitive", target: ["production"] }]),
    sharedLocationPayload: shared(),
    sharedSpatialPayload: shared(),
  });
  assert.deepEqual(result.locationKey.projectTargets, ["production"]);
  assert.equal(result.locationKey.resultCode, "KEY_PROJECT_CANONICAL_SENSITIVE");
  validateR4Artifact(result);
});

test("preview combinations, plain values, branches, and custom environments are surfaced as reasons", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject([
      { key: location, type: "sensitive", target: ["production", "preview"] },
      { key: spatial, type: "plain", target: ["production"], gitBranch: "feature/test" },
      { key: spatial, type: "sensitive", target: ["production"], customEnvironmentIds: ["custom-1"] },
    ]),
    sharedLocationPayload: shared(),
    sharedSpatialPayload: shared(),
  });
  assert.equal(result.locationKey.resultCode, "KEY_PROJECT_WRONG_TARGET");
  assert.ok(result.spatialKey.reasons.includes("project_duplicate"));
  assert.ok(result.spatialKey.reasons.includes("wrong_type"));
  assert.ok(result.spatialKey.reasons.includes("branch_scoped"));
  assert.ok(result.spatialKey.reasons.includes("custom_environment_scoped"));
});

test("shared linkage is classified without exposing project identifiers", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject(),
    sharedLocationPayload: shared([{ key: location, type: "sensitive", target: ["production"], projectIds: [canonicalVercelBinding.projectId] }]),
    sharedSpatialPayload: shared([{ key: spatial, type: "sensitive", target: ["production"], projects: [{ id: "other-project" }, { id: canonicalVercelBinding.projectId }] }]),
  });
  assert.equal(result.locationKey.resultCode, "KEY_SHARED_ONLY");
  assert.equal(result.locationKey.sharedLinkedToThisProject, true);
  assert.equal(result.spatialKey.resultCode, "KEY_SHARED_MULTI_PROJECT");
  assert.equal(result.spatialKey.sharedProjectCount, 2);
  assert.doesNotMatch(JSON.stringify(result), /prj_|other-project|id/i);
});

test("shared variables not linked to this project remain distinguishable", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject(),
    sharedLocationPayload: shared([{ key: location, type: "sensitive", target: ["production"], projectId: ["other-project"] }]),
    sharedSpatialPayload: shared(),
  });
  assert.equal(result.locationKey.resultCode, "KEY_SHARED_ONLY");
  assert.equal(result.locationKey.sharedLinkedToThisProject, false);
  assert.ok(result.locationKey.reasons.includes("shared_not_linked_to_project"));
});

test("project and shared together retain both sources", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject([{ key: location, type: "sensitive", target: ["production"] }]),
    sharedLocationPayload: shared([{ key: location, target: ["production"], projectId: canonicalVercelBinding.projectId }]),
    sharedSpatialPayload: shared(),
  });
  assert.equal(result.locationKey.source, "project_and_shared");
  assert.equal(result.locationKey.resultCode, "KEY_PROJECT_AND_SHARED");
});

test("value and id-shaped fields are never propagated", () => {
  const result = createSanitizedKeyMetadataDiagnostic({
    projectPayload: baseProject([{ key: location, type: "sensitive", target: ["production"], value: "secret-value", id: "env-secret" }]),
    sharedLocationPayload: shared([{ key: location, value: "shared-secret", id: "shared-secret-id", createdBy: "owner" }]),
    sharedSpatialPayload: shared(),
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /secret-value|shared-secret|env-secret|shared-secret-id|createdBy|value/i);
  assert.equal(result.productionWrites, 0);
});

test("the real sanitizer rejects forbidden fields even when rg is unavailable", () => {
  const file = path.resolve(import.meta.dirname, ".r5-forbidden-artifact-test.json");
  fs.writeFileSync(file, JSON.stringify({ locationKey: { present: true, type: "sensitive", productionOnly: true, provenance: "p3b_runtime_validated", written: false }, spatialKey: { present: true, type: "sensitive", productionOnly: true, provenance: "r5_independent_random_32_bytes", generatedShape: "32_byte_base64url", written: true }, secretReadback: false, productionEnvWrites: 1, productionSchemaWrites: 0, productionBusinessWrites: 0, artifactSanitizerActuallyExecuted: true, value: "secret-value" }));
  const result = spawnSync(process.execPath, [path.resolve(import.meta.dirname, "assert-sanitized-artifact.mjs"), file, "r5"], { env: { PATH: "" }, encoding: "utf8" });
  fs.rmSync(file, { force: true });
  assert.notEqual(result.status, 0);
});

test("decrypted responses fail closed", () => {
  assert.throws(
    () => createSanitizedKeyMetadataDiagnostic({
      projectPayload: { decrypted: true, envs: [] },
      sharedLocationPayload: shared(),
      sharedSpatialPayload: shared(),
    }),
    /DECRYPTED_METADATA_REJECTED/,
  );
});
