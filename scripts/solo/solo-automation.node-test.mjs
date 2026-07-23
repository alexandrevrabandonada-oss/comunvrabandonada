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
  assert.match(sql, /^\\set ON_ERROR_STOP on\nBEGIN;/);
  assert.match(sql, /postflight_assertions\.sql/);
  assert.match(sql, /COMMIT;\n$/);
});

test("promotion checkpoint is short-lived, sanitized and not a full backup", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const checkpoint = readFileSync("scripts/solo/create-checkpoint.mjs", "utf8");
  assert.match(workflow, /retention-days: 7/);
  assert.match(checkpoint, /--schema-only/);
  assert.match(checkpoint, /aggregate-counts\.csv/);
  assert.doesNotMatch(workflow, /PR23_BACKUP_|required reviewers|environment:/i);
  assert.doesNotMatch(checkpoint, /select\s+\*/i);
});

test("remote lint uses the allowlisted database URL without an admin access token", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  assert.match(workflow, /supabase db lint --db-url "\$SUPABASE_DB_URL"/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN/);
});

test("rollback is application-only and never runs reverse SQL", () => {
  const rollback = readFileSync("scripts/solo/rollback-application.mjs", "utf8");
  assert.match(rollback, /vercel@46\.2\.0.*rollback/s);
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
  assert.match(workflow, /Wait for main deployment[\s\S]*Reconcile domain only after production is green/);
  assert.match(domain, /COMUN_DOMAIN_ALREADY_CANONICAL/);
  assert.match(domain, /SOLO_DOMAIN_PRECONDITION_MISMATCH/);
  assert.match(domain, /\/v10\/projects\/\$\{legacy\}\/domains/);
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
