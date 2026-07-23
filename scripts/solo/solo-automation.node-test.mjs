import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePromotion } from "./authorize-promotion.mjs";
import { buildTransactionalPackage, validateForwardOnlySql } from "./sql-contract.mjs";
import { readFileSync, readdirSync } from "node:fs";

const sha = "a".repeat(40);
const valid = { eventName: "pull_request", label: "comun:promover", permission: "admin", pr: "23", expectedSha: sha, actualSha: sha, mergeable: "MERGEABLE" };

test("push and unknown labels cannot promote", () => {
  assert.equal(evaluatePromotion({ ...valid, eventName: "push" }).ok, false);
  assert.equal(evaluatePromotion({ ...valid, label: "pr23:run-backup" }).reason, "SOLO_LABEL_NOT_ALLOWED");
});

test("only maintain/admin and immutable mergeable SHA promote", () => {
  assert.equal(evaluatePromotion(valid).ok, true);
  assert.equal(evaluatePromotion({ ...valid, permission: "write" }).reason, "SOLO_OPERATOR_PERMISSION_DENIED");
  assert.equal(evaluatePromotion({ ...valid, actualSha: "b".repeat(40) }).reason, "SOLO_SHA_CHANGED");
  assert.equal(evaluatePromotion({ ...valid, mergeable: "CONFLICTING" }).reason, "SOLO_PR_NOT_MERGEABLE");
});

test("destructive SQL is rejected", () => {
  for (const sql of ["DROP TABLE x", "DROP SCHEMA x", "TRUNCATE x", "DELETE FROM x;", "ALTER TABLE x DROP COLUMN y", "CREATE TABLE x AS SELECT * FROM y", "supabase migration repair"]) {
    assert.throws(() => validateForwardOnlySql(sql), /SOLO_DESTRUCTIVE_SQL/);
  }
  assert.equal(validateForwardOnlySql("DELETE FROM x WHERE expired_at < now();"), true);
});

test("reconciliation package has one fail-fast transaction", () => {
  const sql = buildTransactionalPackage();
  const executor = readFileSync("scripts/solo/apply-forward-only.mjs", "utf8");
  assert.match(sql, /^\\set ON_ERROR_STOP on\nBEGIN;/);
  assert.match(sql, /postflight_assertions\.sql/);
  assert.match(sql, /COMMIT;\n$/);
  assert.match(executor, /COMUN_FORWARD_ONLY_ALREADY_RECONCILED/);
  assert.match(executor, /const current = postgres\(postflight\)/);
});

test("promotion checkpoint is short-lived, sanitized and not a full backup", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const checkpoint = readFileSync("scripts/solo/create-checkpoint.mjs", "utf8");
  assert.match(workflow, /retention-days: 7/);
  assert.match(checkpoint, /--schema-only/);
  assert.match(checkpoint, /aggregate-counts\.csv/);
  assert.match(checkpoint, /static-sanitized-metadata/);
  assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*continue-on-error: true/);
  assert.doesNotMatch(workflow, /PR23_BACKUP_|required reviewers|environment:/i);
  assert.doesNotMatch(checkpoint, /select\s+\*/i);
  assert.match(checkpoint, /api\.vercel\.com\/v6\/deployments/);
});

test("remote lint uses the allowlisted database URL without an admin access token", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  assert.match(workflow, /supabase db lint --db-url "\$SUPABASE_DB_URL"/);
  assert.match(workflow, /notify pgrst, 'reload schema'/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN/);
});

test("Vercel production validation uses GitHub integration and canonical alias", () => {
  const checkpoint = readFileSync("scripts/solo/create-checkpoint.mjs", "utf8");
  const monitor = readFileSync("scripts/solo/monitor-production.mjs", "utf8");
  const domain = readFileSync("scripts/solo/reconcile-domain.mjs", "utf8");
  const rollback = readFileSync("scripts/solo/rollback-application.mjs", "utf8");
  assert.match(checkpoint, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(monitor, /check-runs/);
  assert.match(monitor, /comunvrabandonada\.vercel\.app/);
  assert.doesNotMatch(monitor, /api\.vercel\.com/);
  assert.match(domain, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(domain, /SOLO_DOMAIN_TOKEN_UNAUTHORIZED/);
  assert.match(rollback, /alexandrevrabandonada-oss-projects/);
});

test("rollback is application-only and never runs reverse SQL", () => {
  const rollback = readFileSync("scripts/solo/rollback-application.mjs", "utf8");
  assert.match(rollback, /vercel@46\.2\.0.*rollback/s);
  assert.match(rollback, /COMUN_PREMERGE_FAILURE_NO_ROLLBACK/);
  assert.doesNotMatch(rollback, /psql|supabase\s+db|DROP\s|DELETE\s|TRUNCATE\s/i);
});

test("only three canonical workflows remain active", () => {
  assert.deepEqual(readdirSync(".github/workflows").sort(), ["comun-ci.yml", "comun-nightly.yml", "comun-promote.yml"]);
  const archived = readdirSync(".github/workflows-disabled/pr23");
  assert.ok(archived.includes("pr23-protected-orchestrator.yml"));
  assert.ok(archived.includes("archive-processing-scheduler.yml"));
});

test("domain reconciliation is promotion-only and restores legacy aliases on failure", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const domain = readFileSync("scripts/solo/reconcile-domain.mjs", "utf8");
  assert.match(workflow, /Wait for main deployment[\s\S]*Reconcile domain only after production is green[\s\S]*Public smoke and observation after domain transfer/);
  assert.match(domain, /COMUN_DOMAIN_ALREADY_CANONICAL/);
  assert.match(domain, /SOLO_DOMAIN_PRECONDITION_MISMATCH/);
  assert.match(domain, /\/v10\/projects\/\$\{canonical\}\/domains/);
});

test("preview and production validate PMTiles Range in the correct domain order", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const preview = readFileSync("scripts/solo/verify-preview.mjs", "utf8");
  const monitor = readFileSync("scripts/solo/monitor-production.mjs", "utf8");
  assert.match(preview, /requiredChecks = \["FAST \/ COMUN_CI_GREEN", "FULL \/ COMUN_CI_GREEN", "Vercel"\]/);
  assert.doesNotMatch(preview, /const failed = checks\.filter/);
  assert.match(preview, /deployments\?sha=\$\{process\.env\.SHA\}/);
  assert.match(preview, /deploymentStatuses\.find/);
  assert.doesNotMatch(preview, /api\.vercel\.com/);
  assert.match(preview, /SOLO_PMTILES_PREVIEW_RANGE_INVALID/);
  assert.match(monitor, /SOLO_PRODUCTION_PMTILES_RANGE_INVALID/);
  assert.match(monitor, /SOLO_PUBLIC_WWW_REDIRECT_INVALID/);
  assert.match(workflow, /--minutes=1 --domain=comunvrabandonada\.vercel\.app[\s\S]*reconcile-domain\.mjs[\s\S]*--minutes=15 --domain=comunsocial\.online --public/);
});

test("FULL compares deterministic PostgreSQL catalog fingerprints", () => {
  const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");
  const fingerprint = readFileSync("scripts/solo/schema-fingerprint.mjs", "utf8");
  assert.equal((workflow.match(/schema-fingerprint\.mjs/g) ?? []).length, 2);
  assert.match(workflow, /diff -u \/tmp\/comun-hash-1 \/tmp\/comun-hash-2/);
  assert.match(fingerprint, /information_schema\.columns/);
  assert.match(fingerprint, /pg_constraint/);
  assert.match(fingerprint, /pg_policies/);
  assert.match(fingerprint, /pg_get_functiondef/);
});
