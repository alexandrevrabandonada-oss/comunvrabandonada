import assert from "node:assert/strict";
import test from "node:test";
import {
  REDEPLOY_DECISIONS,
  decideProductionRedeploy,
  normalizeDeployments,
  relevantEnvMutationAt,
} from "./vercel-production-redeploy-causality.mjs";

const sha = "a".repeat(40);
const otherSha = "b".repeat(40);
const deployment = (overrides = {}) => ({
  id: "dpl_exact",
  url: "https://exact.vercel.app",
  state: "READY",
  target: "production",
  createdAt: 2_000,
  source: "git",
  sha,
  canonical: true,
  ...overrides,
});
const decide = (overrides = {}) => decideProductionRedeploy({
  exactSha: sha,
  deployments: [deployment()],
  relevantEnvMutationAt: 1_000,
  envWriteOccurred: false,
  ...overrides,
});

test("fresh READY exact SHA is reused without a build", () => {
  assert.equal(decide().decision, REDEPLOY_DECISIONS.REUSE_FRESH_READY);
  assert.equal(decide().needsBuild, false);
});

test("env write makes an older READY deployment stale", () => {
  const result = decide({ envWriteOccurred: true, relevantEnvMutationAt: 3_000 });
  assert.equal(result.decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT);
});

test("a mutation newer than a READY deployment requires a build", () => {
  assert.equal(decide({ relevantEnvMutationAt: 2_001 }).needsBuild, true);
});

test("a READY deployment created strictly after the env write is fresh", () => {
  assert.equal(decide({ relevantEnvMutationAt: 1_999, envWriteOccurred: true }).decision, REDEPLOY_DECISIONS.REUSE_FRESH_READY);
});

test("different SHA cannot be reused", () => {
  assert.equal(decide({ exactSha: otherSha }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_NO_EXACT_SHA);
});

test("Preview deployment is not a Production deployment", () => {
  assert.equal(decide({ deployments: [deployment({ target: "preview" })] }).needsBuild, true);
});

test("canceled and failed exact deployments fall back to build", () => {
  for (const state of ["CANCELED", "FAILED"]) {
    assert.equal(decide({ deployments: [deployment({ state })] }).needsBuild, true);
  }
});

test("active exact deployment is waited on", () => {
  assert.equal(decide({ deployments: [deployment({ state: "BUILDING" })] }).decision, REDEPLOY_DECISIONS.WAIT_FOR_EXISTING_EXACT_SHA);
});

test("active exact deployment older than env write is stale", () => {
  assert.equal(decide({ deployments: [deployment({ state: "BUILDING", createdAt: 900 })], envMutationAt: 1_000 }).needsBuild, true);
});

test("fresh CLI READY deployment is promote-only when canonical alias is absent", () => {
  const result = decide({ deployments: [deployment({ source: "cli", canonical: false })] });
  assert.equal(result.decision, REDEPLOY_DECISIONS.REUSE_READY_PROMOTE_ONLY);
  assert.equal(result.needsBuild, false);
  assert.equal(result.needsPromotion, true);
});

test("fresh Git READY deployment with canonical alias needs no action", () => {
  assert.deepEqual(
    decide({ deployments: [deployment({ source: "git", canonical: true })] }).decision,
    REDEPLOY_DECISIONS.REUSE_FRESH_READY,
  );
});

test("missing timestamps fail closed", () => {
  assert.equal(decide({ relevantEnvMutationAt: "not-a-date" }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
  assert.equal(decide({ deployments: [deployment({ createdAt: null })] }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
});

test("malformed deployment metadata fails closed", () => {
  assert.equal(decide({ deployments: [{ id: "broken", target: "production" }] }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
});

test("a deployment appearing on the recheck can be reused", () => {
  const first = decide({ deployments: [] });
  const second = decide({ deployments: [deployment({ id: "dpl_recheck" })] });
  assert.equal(first.needsBuild, true);
  assert.equal(second.decision, REDEPLOY_DECISIONS.REUSE_FRESH_READY);
});

test("same SHA alone is insufficient when the deployment is stale", () => {
  assert.equal(decide({ deployments: [deployment({ createdAt: 999 })] }).needsBuild, true);
});

test("env write without a timestamp fails closed", () => {
  assert.equal(decide({ envWriteOccurred: true, relevantEnvMutationAt: null }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
});

test("normalization extracts only safe deployment metadata", () => {
  const [result] = normalizeDeployments({ deployments: [{ id: "d", url: "d.vercel.app", state: "READY", target: "production", created: 10, meta: { githubCommitSha: sha }, alias: ["comunsocial.online"], secret: "drop" }] });
  assert.deepEqual(result, { id: "d", url: "https://d.vercel.app", state: "READY", target: "production", createdAt: 10, source: "unknown", sha, canonical: true });
  assert.equal("secret" in result, false);
});

test("environment mutation reads metadata timestamps only", () => {
  assert.equal(relevantEnvMutationAt({ envs: [{ key: "K", target: ["production"], createdAt: 100, updatedAt: 200, value: "never-read" }] }, "K"), 200);
  assert.equal(relevantEnvMutationAt({ envs: [{ key: "OTHER", target: ["production"], createdAt: 100 }] }, "K"), null);
});

test("invalid metadata availability always builds", () => {
  assert.equal(decide({ metadataAvailable: false }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
});

test("unknown lifecycle state fails closed", () => {
  assert.equal(decide({ deployments: [deployment({ state: "MYSTERY" })] }).decision, REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN);
});
