import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPreviewGateDiff,
  evaluatePreviewGate,
  findLatestPreviewCheckpoint,
  selectValidPreviewDeployment,
} from "./verify-codex-preview-checkpoint.mjs";

const runtimeDiff = { available: true, files: ["app/page.tsx"] };
const safeDiff = { available: true, files: ["docs/cost-02.md"] };
const validPreview = {
  deployment: { id: 1, sha: "a".repeat(40), environment: "Preview" },
  status: { state: "success", environment_url: "https://comun-preview.vercel.app" },
};

test("locates the newest checkpoint marker", () => {
  assert.equal(
    findLatestPreviewCheckpoint([
      { sha: "a", message: "fix: follow-up" },
      { sha: "b", message: "feat: [comun-preview]" },
    ]),
    "b",
  );
  assert.equal(findLatestPreviewCheckpoint([{ sha: "a", message: "fix" }]), null);
});

test("accepts only a successful Preview deployment with a Vercel URL", () => {
  assert.deepEqual(
    selectValidPreviewDeployment({
      deployments: [
        { id: 1, sha: "a".repeat(40), environment: "Preview" },
        { id: 2, sha: "b".repeat(40), environment: "Production" },
      ],
      statusesByDeployment: {
        1: [{ state: "success", environment_url: "https://comun-preview.vercel.app" }],
        2: [{ state: "success", environment_url: "https://comun-preview.vercel.app" }],
      },
      expectedSha: "a".repeat(40),
    }),
    validPreview,
  );
});

test("rejects a Preview deployment whose SHA differs from the checkpoint", () => {
  assert.equal(
    selectValidPreviewDeployment({
      deployments: [{ id: 1, sha: "b".repeat(40), environment: "Preview" }],
      statusesByDeployment: {
        1: [{ state: "success", environment_url: "https://comun-preview.vercel.app" }],
      },
      expectedSha: "a".repeat(40),
    }),
    null,
  );
});

test("missing Preview status is invalid", () => {
  assert.equal(
    selectValidPreviewDeployment({
      deployments: [{ id: 1, sha: "a".repeat(40), environment: "Preview" }],
      statusesByDeployment: { 1: [{ state: "error", environment_url: "https://comun-preview.vercel.app" }] },
    }),
    null,
  );
});

test("non-Codex branches do not use the checkpoint exception", () => {
  assert.deepEqual(
    evaluatePreviewGate({ branch: "feature/other", fullDiff: runtimeDiff }),
    { decision: "PASS", reason: "non-codex-branch" },
  );
});

test("safe-only Codex PRs pass without a checkpoint", () => {
  assert.deepEqual(
    evaluatePreviewGate({ branch: "codex/cost-02", fullDiff: safeDiff }),
    { decision: "PASS", reason: "no-runtime-change" },
  );
});

test("runtime PR without checkpoint fails", () => {
  assert.deepEqual(
    evaluatePreviewGate({ branch: "codex/cost-02", fullDiff: runtimeDiff }),
    { decision: "FAIL", reason: "checkpoint-missing" },
  );
});

test("runtime PR with checkpoint but no valid Preview fails", () => {
  assert.deepEqual(
    evaluatePreviewGate({
      branch: "codex/cost-02",
      fullDiff: runtimeDiff,
      checkpointSha: "a".repeat(40),
      preview: null,
      postCheckpointDiff: { available: true, files: [] },
    }),
    { decision: "FAIL", reason: "preview-not-valid-for-checkpoint" },
  );
});

test("valid checkpoint Preview passes when no code follows it", () => {
  assert.deepEqual(
    evaluatePreviewGate({
      branch: "codex/cost-02",
      fullDiff: runtimeDiff,
      checkpointSha: "a".repeat(40),
      preview: validPreview,
      postCheckpointDiff: { available: true, files: [] },
    }),
    { decision: "PASS", reason: "checkpoint-fresh" },
  );
});

test("runtime after checkpoint fails as stale", () => {
  assert.deepEqual(
    evaluatePreviewGate({
      branch: "codex/cost-02",
      fullDiff: runtimeDiff,
      checkpointSha: "a".repeat(40),
      preview: validPreview,
      postCheckpointDiff: runtimeDiff,
    }),
    { decision: "FAIL", reason: "checkpoint-stale" },
  );
});

test("safe docs/tests after checkpoint pass without a new Preview", () => {
  assert.deepEqual(
    evaluatePreviewGate({
      branch: "codex/cost-02",
      fullDiff: runtimeDiff,
      checkpointSha: "a".repeat(40),
      preview: validPreview,
      postCheckpointDiff: safeDiff,
    }),
    { decision: "PASS", reason: "checkpoint-fresh-safe-followup" },
  );
});

test("unavailable post-checkpoint diff fails closed", () => {
  assert.deepEqual(
    evaluatePreviewGate({
      branch: "codex/cost-02",
      fullDiff: runtimeDiff,
      checkpointSha: "a".repeat(40),
      preview: validPreview,
      postCheckpointDiff: { files: [] },
      postCheckpointDiffAvailable: false,
    }),
    { decision: "FAIL", reason: "checkpoint-diff-unavailable" },
  );
});

test("non-main PR bases fail closed", () => {
  assert.deepEqual(
    evaluatePreviewGate({ branch: "codex/cost-02", baseBranch: "develop", fullDiff: runtimeDiff }),
    { decision: "FAIL", reason: "base-not-main" },
  );
});

test("high-risk classes require a checkpoint even on Codex", () => {
  const result = classifyPreviewGateDiff({
    branch: "codex/cost-02",
    files: ["scripts/ci/verify-codex-preview-checkpoint.mjs"],
  });
  assert.equal(result.requiresCheckpoint, true);
  assert.equal(result.reason, "build-script-change");
});
