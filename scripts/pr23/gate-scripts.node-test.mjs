import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReviews } from "./verify-independent-reviews.mjs";
import { evaluateEnvironment } from "./verify-environment-protection.mjs";
import { compute } from "./compute-readiness.mjs";
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
