import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  CONTROLLED_CONTRIBUTION_CYCLE_ID,
  CONTROLLED_CONTRIBUTION_DESCRIPTION,
  CONTROLLED_CONTRIBUTION_FILENAME,
  assertSanitizedControlledContributionArtifact,
  controlledContributionPayload,
  createAfterSnapshot,
  createBeforeSnapshot,
  createControlledContributionResult,
  renderControlledContributionMarkdown,
} from "./controlled-sidewalk-production-contribution.mjs";

const sha = "a".repeat(40);
const deployment = "production-ready-aaaaaaaa";
const row = {
  upload_id: "upload-1",
  member_user_id: "actor-1",
  object_key: "never-persisted",
  upload_status: "confirmed",
  confirmation_state: "confirmed",
  record_id: "record-1",
  original_filename: CONTROLLED_CONTRIBUTION_FILENAME,
  declared_mime_type: "image/jpeg",
  record_status: "under_review",
  record_visibility: "internal",
  verification_status: "community_report",
  private_notes: CONTROLLED_CONTRIBUTION_DESCRIPTION,
  photo_count: 1,
  asset_count: 1,
  storage_object_count: 1,
};

function browser() {
  return {
    formatVersion: 1,
    cycleId: CONTROLLED_CONTRIBUTION_CYCLE_ID,
    formOpened: true,
    submissionAttempt: 1,
    retryExecuted: false,
    confirmationSeen: true,
    consoleErrors: 0,
    requestErrorCount: 0,
    mutableRequestMethods: ["POST", "PUT"],
    contributionSubmitted: true,
    sensitivePatternsObserved: 0,
  };
}

test("controlled production payload is fixed, neutral, and cycle-bound", () => {
  assert.deepEqual(controlledContributionPayload(), {
    cycleId: CONTROLLED_CONTRIBUTION_CYCLE_ID,
    contributionType: "controlled_validation",
    title: "Validação inaugural do Mapa de Calçadas",
    description: CONTROLLED_CONTRIBUTION_DESCRIPTION,
    filename: CONTROLLED_CONTRIBUTION_FILENAME,
    condition: "regular",
    category: "irregular",
    affectedGroups: ["general_public"],
    consentPublish: true,
    location: "project_documented_generic_center",
  });
});

test("before snapshot fails closed when the fixed cycle already exists", () => {
  assert.throws(
    () =>
      createBeforeSnapshot({
        candidateSha: sha,
        deploymentRef: deployment,
        targetUploadCount: 1,
        targetRecordCount: 0,
        targetStorageObjectCount: 0,
      }),
    /CYCLE_ALREADY_EXISTS/,
  );
});

test("after snapshot requires exactly one confirmed internal contribution and one private original", () => {
  const result = createAfterSnapshot({
    candidateSha: sha,
    deploymentRef: deployment,
    rows: [row],
  });
  assert.equal(result.targetRecordCount, 1);
  assert.equal(result.recordVisibility, "internal");
  assert.equal(result.storageWrites, "one_private_original");
  assert.equal(JSON.stringify(result).includes("never-persisted"), false);
});

test("postflight rejects duplicate contributions and incomplete photo evidence", () => {
  assert.throws(
    () =>
      createAfterSnapshot({
        candidateSha: sha,
        deploymentRef: deployment,
        rows: [row, row],
      }),
    /RECORD_COUNT_INVALID/,
  );
  assert.throws(
    () =>
      createAfterSnapshot({
        candidateSha: sha,
        deploymentRef: deployment,
        rows: [{ ...row, storage_object_count: 0 }],
      }),
    /POSTCONDITION_INVALID/,
  );
});

test("green result requires the one browser submission, confirmation, and no retry", () => {
  const before = createBeforeSnapshot({
    candidateSha: sha,
    deploymentRef: deployment,
    targetUploadCount: 0,
    targetRecordCount: 0,
    targetStorageObjectCount: 0,
  });
  const after = createAfterSnapshot({
    candidateSha: sha,
    deploymentRef: deployment,
    rows: [row],
  });
  const result = createControlledContributionResult({
    before,
    after,
    browser: browser(),
  });
  assert.equal(
    result.checkpointResult,
    "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_GREEN_PRESERVED",
  );
  assert.equal(result.removalExecuted, false);
  assert.match(
    renderControlledContributionMarkdown(result),
    /COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_GREEN_PRESERVED/,
  );
});

test("a missing confirmation does not become a green result", () => {
  const before = createBeforeSnapshot({
    candidateSha: sha,
    deploymentRef: deployment,
    targetUploadCount: 0,
    targetRecordCount: 0,
    targetStorageObjectCount: 0,
  });
  const after = createAfterSnapshot({
    candidateSha: sha,
    deploymentRef: deployment,
    rows: [row],
  });
  const result = createControlledContributionResult({
    before,
    after,
    browser: { ...browser(), confirmationSeen: false },
  });
  assert.equal(
    result.checkpointResult,
    "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_CONTAINED",
  );
});

test("sanitization rejects secrets, urls, and private database labels", () => {
  for (const value of [
    { connection: "postgresql://secret" },
    { url: "https://unsafe.example" },
    { private_notes: "never" },
  ]) {
    assert.throws(
      () => assertSanitizedControlledContributionArtifact(value),
      /ARTIFACT_SENSITIVE/,
    );
  }
});

test("the production workflow permits one fixed cycle and never accepts a mutable payload input", async () => {
  const workflow = await readFile(
    path.resolve(
      ".github/workflows/comun-sidewalk-first-production-contribution.yml",
    ),
    "utf8",
  );
  assert.match(
    workflow,
    /cycle_id:[\s\S]*?default: sidewalk-first-production-contribution-20260729-07/,
  );
  assert.match(
    workflow,
    /group: comun-sidewalk-first-production-contribution-\$\{\{ inputs\.cycle_id \}\}/,
  );
  assert.match(
    workflow,
    /EXECUTAR_UNICA_CONTRIBUICAO_CONTROLADA_CALCADAS_\$\{EXPECTED_MAIN_SHA\}_\$\{CYCLE_ID\}/,
  );
  assert.match(workflow, /--mode=preflight/);
  assert.match(workflow, /--mode=postflight/);
  assert.match(
    workflow,
    /npx playwright test -c playwright\.sidewalk-production-controlled\.config\.ts/,
  );
  assert.doesNotMatch(workflow, /\b(?:migrate|activate)\b/);
  const inputs = workflow.match(/inputs:\n([\s\S]*?)\nconcurrency:/)?.[1] ?? "";
  assert.doesNotMatch(inputs, /payload:|base_url:|database_url:/i);
});
