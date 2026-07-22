import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReviews } from "./verify-independent-reviews.mjs";
import { evaluateEnvironment } from "./verify-environment-protection.mjs";
import { compute } from "./compute-readiness.mjs";
import { evaluateProtectedRequest } from "./verify-protected-request.mjs";
import { validateStatus } from "./publish-status.mjs";
import { buildPlan } from "./configure-github-protections.mjs";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const sha = "a".repeat(40);
const pull = { number: 23, head: { ref: "codex/sprint-40-1-mobile-preview", sha } };
const review = (login, state = "APPROVED", commit = sha, type = "User", submitted = "2026-07-22T00:00:00Z") => ({ user: { login, type }, state, commit_id: commit, submitted_at: submitted });

test("requires two distinct approvals for current SHA", () => {
  assert.equal(evaluateReviews({ pull, reviews: [review("one"), review("two")], commits: [{ author: { login: "author" } }] }).ok, true);
  assert.equal(evaluateReviews({ pull, reviews: [review("one"), review("one")], commits: [{ author: { login: "author" } }] }).ok, false);
});

test("rejects author, bot, stale SHA and later changes requested", () => {
  assert.equal(evaluateReviews({ pull, reviews: [review("author"), review("bot[bot]", "APPROVED", sha, "Bot")], commits: [{ author: { login: "author" } }] }).ok, false);
  assert.equal(evaluateReviews({ pull, reviews: [review("one", "APPROVED", "b".repeat(40)), review("two")], commits: [{ author: { login: "author" } }] }).ok, false);
  assert.equal(evaluateReviews({ pull, reviews: [review("one"), review("two"), review("one", "CHANGES_REQUESTED", sha, "User", "2026-07-22T01:00:00Z")], commits: [{ author: { login: "author" } }] }).reason, "PR23_CHANGES_REQUESTED");
});

test("environment must have reviewers and canonical-only policy", () => {
  const environment = { name: "pr23-backup-gate", protection_rules: [{ type: "required_reviewers", reviewers: [{ reviewer: { login: "human" } }] }], deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } };
  assert.equal(evaluateEnvironment({ environment, branchPolicies: [{ name: "codex/sprint-40-1-mobile-preview" }] }, "pr23-backup-gate").ok, true);
  assert.equal(evaluateEnvironment({ environment: { ...environment, protection_rules: [] }, branchPolicies: [{ name: "codex/sprint-40-1-mobile-preview" }] }, "pr23-backup-gate").ok, false);
});

test("readiness remains fail closed", () => {
  const base = { sha, ci: true, fullLocal: true, reviews: true, environmentProtection: true, vercelPreview: true, mainUnchanged: true };
  assert.equal(compute(base).decision, "NO_GO_REMOTE_INTEGRATION");
  assert.equal(compute({ ...base, backupRestore: true, productionLike: true, migrationEnvironmentApproval: true }).decision, "READY_FOR_CONTROLLED_REMOTE_MIGRATION");
  assert.equal(compute({ ...base, backupRestore: true, productionLike: true, migration: true, remotePreview: true, domain: true, mergeEnvironmentApproval: true }).decision, "READY_TO_MERGE_AND_MONITOR");
});

test("remote workflows are dispatch-only and protected", () => {
  const remote = ["pr23-backup-restore.yml", "pr23-controlled-migration.yml", "pr23-history-alignment.yml", "pr23-domain-transfer.yml", "pr23-final-merge.yml", "pr23-rollback.yml"];
  for (const name of remote) {
    const yaml = readFileSync(`.github/workflows/${name}`, "utf8");
    assert.match(yaml, /workflow_dispatch:/);
    assert.doesNotMatch(yaml, /\n\s+pull_request:/);
  }
  const backup = readFileSync(".github/workflows/pr23-backup-restore.yml", "utf8");
  assert.doesNotMatch(backup, /actions\/upload-artifact/);
  assert.match(backup, /environment: pr23-backup-gate/);
});

test("missing secrets fail closed without exposing values", () => {
  const result = spawnSync(process.execPath, ["scripts/pr23/check-contract.mjs", "--mode=backup"], { encoding: "utf8", env: {} });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /PR23_MISSING_SECRETS:SUPABASE_ACCESS_TOKEN/);
});

test("CI calls full local gate and readiness as reusable workflows", () => {
  const ci = readFileSync(".github/workflows/pr23-ci.yml", "utf8");
  assert.match(ci, /uses: \.\/\.github\/workflows\/pr23-full-local-gate\.yml/);
  assert.match(ci, /uses: \.\/\.github\/workflows\/pr23-readiness\.yml/);
  assert.match(ci, /needs: fast-gate/);
  assert.match(ci, /needs: full-local-gate/);
});

test("local and remote workflows keep dispatch and expose workflow_call", () => {
  const names = [
    "pr23-full-local-gate.yml",
    "pr23-readiness.yml",
    "pr23-backup-restore.yml",
    "pr23-controlled-migration.yml",
    "pr23-domain-transfer.yml",
    "pr23-final-merge.yml",
    "pr23-rollback.yml",
  ];
  for (const name of names) {
    const yaml = readFileSync(`.github/workflows/${name}`, "utf8");
    assert.match(yaml, /workflow_dispatch:/);
    assert.match(yaml, /workflow_call:/);
    assert.doesNotMatch(yaml, /secrets:\s*inherit/);
  }
});

test("protected orchestrator is label-gated and synchronize only invalidates", () => {
  const yaml = readFileSync(".github/workflows/pr23-protected-orchestrator.yml", "utf8");
  assert.match(yaml, /types: \[labeled, synchronize, reopened\]/);
  assert.match(yaml, /cancel-in-progress: true/);
  assert.match(yaml, /github\.event\.action == 'labeled'/);
  assert.match(yaml, /github\.event\.action == 'synchronize'/);
  assert.doesNotMatch(yaml, /secrets:\s*inherit/);
  assert.match(yaml, /issues\/23\/labels/);
  assert.match(yaml, /pr23-request:\$SHA:\$LABEL/);
});

const protectedBase = {
  label: "pr23:run-backup",
  expectedSha: sha,
  actor: "operator",
  permission: "write",
  pull,
  reviews: [review("one"), review("two")],
  commits: [{ author: { login: "author" } }],
  statuses: [
    { context: "pr23/fast-gate", state: "success" },
    { context: "pr23/full-local-gate", state: "success" },
    { context: "pr23/readiness", state: "success" },
  ],
};

test("unknown label is ignored and known label without reviews fails", () => {
  assert.equal(evaluateProtectedRequest({ ...protectedBase, label: "unknown" }).reason, "PR23_LABEL_NOT_ALLOWED");
  assert.notEqual(evaluateProtectedRequest({ ...protectedBase, reviews: [] }).ok, true);
});

test("changed SHA and stale status cannot authorize an operation", () => {
  assert.equal(evaluateProtectedRequest({ ...protectedBase, expectedSha: "b".repeat(40) }).reason, "PR23_SHA_CHANGED");
  const statuses = [
    { context: "pr23/fast-gate", state: "pending" },
    { context: "pr23/fast-gate", state: "success" },
    ...protectedBase.statuses.slice(1),
  ];
  assert.match(evaluateProtectedRequest({ ...protectedBase, statuses }).reason, /PR23_PRIOR_CHECKS_MISSING/);
});

test("valid protected request requires current successful checks", () => {
  const result = evaluateProtectedRequest(protectedBase);
  assert.equal(result.ok, true);
  assert.equal(result.operation, "backup");
});

test("status publisher validates SHA, context and state without network", () => {
  assert.equal(validateStatus({ sha, context: "pr23/readiness", state: "success", description: "NO_GO" }).context, "pr23/readiness");
  assert.throws(() => validateStatus({ sha: "old", context: "pr23/readiness", state: "success", description: "NO_GO" }), /SHA_INVALID/);
  assert.throws(() => validateStatus({ sha, context: "unknown", state: "success", description: "NO_GO" }), /CONTEXT_INVALID/);
});

test("GitHub protection defaults to dry-run and never chooses a reviewer", () => {
  const plan = buildPlan();
  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.reviewer, "REQUIRED_BEFORE_APPLY");
  assert.equal(plan.environments.every((environment) => environment.requiredReviewers.length === 0), true);
  const result = spawnSync(process.execPath, ["scripts/pr23/configure-github-protections.mjs"], { encoding: "utf8", env: {} });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /REQUIRED_BEFORE_APPLY/);
});

test("GitHub protection apply fails closed without reviewer or token", () => {
  const result = spawnSync(process.execPath, ["scripts/pr23/configure-github-protections.mjs", "--apply"], { encoding: "utf8", env: {} });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /PR23_REQUIRED_REVIEWER_MISSING/);
});
