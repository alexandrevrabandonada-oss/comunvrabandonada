import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePromotion } from "./authorize-promotion.mjs";
import {
  buildTransactionalPackage,
  validateForwardOnlySql,
} from "./sql-contract.mjs";
import { releaseMarker } from "./apply-forward-only.mjs";
import { readFileSync, readdirSync } from "node:fs";

const sha = "a".repeat(40);
const valid = {
  eventName: "pull_request",
  label: "comun:promover",
  permission: "admin",
  pr: "23",
  expectedSha: sha,
  actualSha: sha,
  mergeable: "MERGEABLE",
};

test("push and unknown labels cannot promote", () => {
  assert.equal(evaluatePromotion({ ...valid, eventName: "push" }).ok, false);
  assert.equal(
    evaluatePromotion({ ...valid, label: "pr23:run-backup" }).reason,
    "SOLO_LABEL_NOT_ALLOWED",
  );
});

test("only maintain/admin and immutable mergeable SHA promote", () => {
  assert.equal(evaluatePromotion(valid).ok, true);
  assert.equal(
    evaluatePromotion({ ...valid, permission: "write" }).reason,
    "SOLO_OPERATOR_PERMISSION_DENIED",
  );
  assert.equal(
    evaluatePromotion({ ...valid, actualSha: "b".repeat(40) }).reason,
    "SOLO_SHA_CHANGED",
  );
  assert.equal(
    evaluatePromotion({ ...valid, mergeable: "CONFLICTING" }).reason,
    "SOLO_PR_NOT_MERGEABLE",
  );
});

test("destructive SQL is rejected", () => {
  for (const sql of [
    "DROP TABLE x",
    "DROP SCHEMA x",
    "TRUNCATE x",
    "DELETE FROM x;",
    "ALTER TABLE x DROP COLUMN y",
    "CREATE TABLE x AS SELECT * FROM y",
    "supabase migration repair",
  ]) {
    assert.throws(() => validateForwardOnlySql(sql), /SOLO_DESTRUCTIVE_SQL/);
  }
  assert.equal(
    validateForwardOnlySql("DELETE FROM x WHERE expired_at < now();"),
    true,
  );
});

test("reconciliation package has one fail-fast transaction", () => {
  const sql = buildTransactionalPackage();
  const executor = readFileSync("scripts/solo/apply-forward-only.mjs", "utf8");
  assert.match(sql, /^\\set ON_ERROR_STOP on\nBEGIN;/);
  assert.match(sql, /postflight_assertions\.sql/);
  assert.match(sql, /COMMIT;\n$/);
  assert.match(executor, /executeSql\(configuredMigration\)/);
  assert.match(executor, /--read-only-preflight/);
});

test("release markers are selected by release contract", () => {
  const canonical = { release: "20260723220112-canonical-security-hardening" };
  const operational = {
    release: "20260724233256-comun-sidewalk-operational-hardening",
  };
  assert.equal(
    releaseMarker(canonical, "ALREADY_APPLIED"),
    "COMUN_CANONICAL_SECURITY_HARDENING_ALREADY_APPLIED",
  );
  assert.equal(
    releaseMarker(operational, "ALREADY_APPLIED"),
    "COMUN_SIDEWALK_OPERATIONAL_HARDENING_ALREADY_APPLIED",
  );
  assert.equal(
    releaseMarker(canonical, "OK"),
    "COMUN_CANONICAL_SECURITY_HARDENING_OK",
  );
  assert.equal(
    releaseMarker(operational, "OK"),
    "COMUN_SIDEWALK_OPERATIONAL_HARDENING_OK",
  );
});

test("promotion checkpoint is short-lived, sanitized and not a full backup", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const checkpoint = readFileSync("scripts/solo/create-checkpoint.mjs", "utf8");
  assert.match(workflow, /retention-days: 7/);
  assert.match(checkpoint, /--schema-only/);
  assert.match(checkpoint, /aggregate-counts\.csv/);
  assert.match(checkpoint, /static-sanitized-metadata/);
  assert.match(
    workflow,
    /actions\/upload-artifact@v4[\s\S]*continue-on-error: true/,
  );
  assert.doesNotMatch(
    workflow,
    /PR23_BACKUP_|required reviewers|environment:/i,
  );
  assert.doesNotMatch(checkpoint, /select\s+\*/i);
  assert.match(checkpoint, /api\.vercel\.com\/v6\/deployments/);
});

test("remote lint uses the allowlisted database URL without an admin access token", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const gate = readFileSync(
    "scripts/solo/run-production-db-lint-gate.mjs",
    "utf8",
  );
  assert.match(
    workflow,
    /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/,
  );
  assert.match(
    workflow,
    /node scripts\/solo\/run-production-db-lint-gate\.mjs/,
  );
  assert.match(gate, /"db",\s*"lint"/);
  assert.match(gate, /"--db-url",\s*connectionString/);
  assert.match(workflow, /notify pgrst, 'reload schema'/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN/);
});

test("PR437 promotion postflight reuses read-only capture and disposable proof", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const capture = workflow
    .split("      - name: PR437 postflight Production capture read-only")[1]
    ?.split("      - name: PR437 postflight disposable search proof")[0];
  const proof = workflow
    .split("      - name: PR437 postflight disposable search proof")[1]
    ?.split("      - uses: actions/upload-artifact@v4")[0];
  const legacy = workflow
    .split("      - name: Remote postflight, DB lint, schema reload and cleanup dry-run")[1]
    ?.split("      - name: Validate immutable Vercel preview")[0];
  assert.ok(capture);
  assert.ok(proof);
  assert.ok(legacy);
  assert.match(capture, /if: needs\.authorize\.outputs\.pr == '437'/);
  assert.match(capture, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(capture, /POST_ALREADY_APPLIED/);
  assert.match(proof, /run-pr437-disposable-proof\.sh/);
  assert.match(proof, /SEARCH_SYNC_RUNTIME_CONTRACT_PROVED/);
  assert.doesNotMatch(
    proof,
    /SUPABASE_DB_URL|run-production-db-lint-gate|supabase db lint|notify pgrst/i,
  );
  assert.match(legacy, /if: needs\.authorize\.outputs\.pr != '437'/);
  assert.match(legacy, /run-production-db-lint-gate\.mjs/);
});
test("Vercel production validation uses GitHub integration and canonical alias", () => {
  const checkpoint = readFileSync("scripts/solo/create-checkpoint.mjs", "utf8");
  const monitor = readFileSync("scripts/solo/monitor-production.mjs", "utf8");
  const domain = readFileSync("scripts/solo/reconcile-domain.mjs", "utf8");
  const rollback = readFileSync(
    "scripts/solo/rollback-application.mjs",
    "utf8",
  );
  assert.match(checkpoint, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(monitor, /check-runs/);
  assert.match(monitor, /comunvrabandonada\.vercel\.app/);
  assert.doesNotMatch(monitor, /api\.vercel\.com/);
  assert.match(domain, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(domain, /COMUN_DOMAIN_PUBLICLY_CANONICAL_TOKEN_UNAVAILABLE/);
  assert.match(rollback, /alexandrevrabandonada-oss-projects/);
});

test("rollback is application-only and never runs reverse SQL", () => {
  const rollback = readFileSync(
    "scripts/solo/rollback-application.mjs",
    "utf8",
  );
  assert.match(rollback, /vercel@50\.28\.0.*rollback/s);
  assert.match(rollback, /COMUN_PREMERGE_FAILURE_NO_ROLLBACK/);
  assert.doesNotMatch(
    rollback,
    /psql|supabase\s+db|DROP\s|DELETE\s|TRUNCATE\s/i,
  );
});

test("canonical workflows remain active and known additions are explicit", () => {
  const required = [
    "comun-ci.yml",
    "comun-nightly.yml",
    "comun-promote.yml",
    "comun-retro-replay.yml",
    "comun-sidewalk-activate.yml",
    "comun-sidewalk-remote-diagnostic.yml",
  ];
  const knownAdditional = new Set([
    "comun-48-1b-r1c-external-ledger-planner-bridge.yml",
    "comun-48-1c-pilot-prep.yml",
    "comun-48-2-a-activation.yml",
    "comun-48-2-a-remote-preflight.yml",
    "comun-48-2-b-activation.yml",
    "comun-48-2-c1-activation.yml",
    "comun-48-2-c2-activation.yml",
    "comun-48-2-d3c-activation.yml",
    "comun-48-2-d4b-activation.yml",
    "comun-48-2-e2-power-interruptions-activation.yml",
    "comun-48-2-f-city-panorama-activation.yml",
    "comun-48-3-a1-activation.yml",
    "comun-48-3-a1-disposable.yml",
    "comun-48-3-a1-preflight.yml",
    "comun-48-3-b0-preflight.yml",
    "comun-48-3-b1-activation.yml",
    "comun-48-3-b1-disposable.yml",
    "comun-48-3-b1-preflight.yml",
    "comun-48-3-c1-activation.yml",
    "comun-48-3-c1-disposable.yml",
    "comun-48-3-c1-preflight.yml",
    "comun-48-3-d1-activation.yml",
    "comun-48-3-d1-disposable.yml",
    "comun-48-3-d1-preflight.yml",
    "comun-48-3-e2-disposable.yml",
    "comun-48-3-e2-preflight.yml",
    "comun-48-3-e3-activation.yml",
    "comun-48-3-e3-disposable.yml",
    "comun-48-3-e3-preflight.yml",
    "comun-48-4-a0-solidarity-economy-preflight.yml",
    "comun-48-4-a1-activation.yml",
    "comun-48-4-a1-disposable.yml",
    "comun-48-4-a1-preflight.yml",
    "comun-48-4-a2-activation.yml",
    "comun-48-4-a2-disposable.yml",
    "comun-48-4-a2-preflight.yml",
    "comun-48-4-a3-activation.yml",
    "comun-48-4-a3-disposable.yml",
    "comun-48-4-a3-preflight.yml",
    "comun-48-4-a4-activation.yml",
    "comun-48-4-a4-disposable.yml",
    "comun-48-4-a4-preflight.yml",
    "comun-48-4-a5-activation.yml",
    "comun-48-4-a5-disposable.yml",
    "comun-48-4-a5-preflight.yml",
    "comun-48-4-a6-activation.yml",
    "comun-48-4-a6-disposable.yml",
    "comun-48-4-a6-preflight.yml",
    "comun-48-4-a7-activation.yml",
    "comun-48-4-a7-preflight.yml",
    "comun-48-5-a0-culture-memory-radio-preflight.yml",
    "comun-48-5-a2-r1-disposable.yml",
    "comun-48-5-a3-disposable.yml",
    "comun-48-5-a3-r2-d1-flag-drift.yml",
    "comun-48-5-a3-rollout.yml",
    "comun-48-5-a4-c0-post-activation.yml",
    "comun-48-5-a4-disposable.yml",
    "comun-48-5-a4-r2-d0-flag-bootstrap.yml",
    "comun-48-5-a4-r2-d0-r1-env-repair.yml",
    "comun-48-5-a4-r2-d0-r2-replacement.yml",
    "comun-48-5-a4-r2-d0-r3-absent-recovery.yml",
    "comun-48-5-a4-r2-e1-external-ledger.yml",
    "comun-48-5-a4-r2-wave0.yml",
    "comun-48-5-a4-r2-wave1.yml",
    "comun-48-5-a5-a1-disposable.yml",
    "comun-48-5-a5-a1-r1-production.yml",
    "comun-48-5-a5-a2-artwork-disposable.yml",
    "comun-48-5-a5-a2-r1-production.yml",
    "comun-48-6-a1-disposable.yml",
    "comun-48-6-a1-production.yml",
    "comun-48-6-a3-disposable.yml",
    "comun-48-6-a3-production.yml",
    "comun-48-6-b0-disposable.yml",
    "comun-48-6-b0-production.yml",
    "comun-48-6-b0-remote-preflight.yml",
    "comun-48-6-b1-disposable.yml",
    "comun-48-6-b1-production.yml",
    "comun-48-6-b2-a1-production.yml",
    "comun-48-6-b2-a2-disposable.yml",
    "comun-48-6-b2-a2-production.yml",
    "comun-48-6-b2-a2-r1-secret-provisioning.yml",
    "comun-48-6-b2-a2-r4-key-metadata-diagnostic.yml",
    "comun-48-6-b2-a2-r5-sensitive-spatial-key.yml",
    "comun-49-1-denuncias-map-readiness.yml",
    "comun-49-2-a0-r1-collective-entity-consent-disposable.yml",
    "comun-civic-graph.yml",
    "comun-civic-intelligence.yml",
    "comun-communities-deliverability.yml",
    "comun-core-journeys.yml",
    "comun-cultural-deliverability.yml",
    "comun-experience-coherence.yml",
    "comun-f2-c1-activation.yml",
    "comun-f2-r1-production-proof.yml",
    "comun-full-surface-migration.yml",
    "comun-launch-readiness.yml",
    "comun-operations-deliverability.yml",
    "comun-p1g-activation.yml",
    "comun-p1g-preflight.yml",
    "comun-p3b-f1-promotion.yml",
    "comun-p3b-reactivation.yml",
    "comun-p4-activation.yml",
    "comun-p4-promotion.yml",
    "comun-p5-activation.yml",
    "comun-p5-promotion.yml",
    "comun-p5-remote-preflight.yml",
    "comun-p5-runtime-e2e.yml",
    "comun-p6a-activation.yml",
    "comun-p6a-promotion.yml",
    "comun-p6a-remote-preflight.yml",
    "comun-p6a-runtime-e2e.yml",
    "comun-p6b-a-activation.yml",
    "comun-p6b-a-runtime-e2e.yml",
    "comun-p6b-b-activation.yml",
    "comun-p6b-b-promotion.yml",
    "comun-p6b-b-runtime-e2e.yml",
    "comun-p6c-a-activation.yml",
    "comun-p6c-a-preflight.yml",
    "comun-p6c-a-runtime-e2e.yml",
    "comun-p6c-b1-activation.yml",
    "comun-p6c-b1-preflight.yml",
    "comun-p6c-b1-runtime-e2e.yml",
    "comun-p6c-b2-activation.yml",
    "comun-p6c-b2-preflight.yml",
    "comun-p6c-b2-runtime-e2e.yml",
    "comun-p6c-c-activation.yml",
    "comun-p6c-c-preflight.yml",
    "comun-p6c-c-runtime-e2e.yml",
    "comun-pr437-promotion-fingerprint.yml",
    "comun-pauta-action-cycle-audit.yml",
    "comun-pauta-action-cycle-deliverability.yml",
    "comun-pauta-action-cycle-promote.yml",
    "comun-quality-performance.yml",
    "comun-security-resilience.yml",
    "comun-sidewalk-auth-captcha.yml",
    "comun-sidewalk-exact-consent-contract.yml",
    "comun-sidewalk-first-exact-publication.yml",
    "comun-sidewalk-first-production-contribution.yml",
    "comun-sidewalk-operations.yml",
    "comun-sidewalk-pilot.yml",
  ]);
  const active = readdirSync(".github/workflows").sort();
  assert.equal(new Set(active).size, active.length, "duplicate workflow names");
  for (const workflow of required)
    assert.ok(active.includes(workflow), workflow);
  assert.deepEqual(
    active.filter(
      (workflow) =>
        !required.includes(workflow) && !knownAdditional.has(workflow),
    ),
    [],
  );
  assert.deepEqual(
    active.filter((workflow) =>
      /(?:pr23|disabled|dangerous|legacy)/i.test(workflow),
    ),
    [],
  );
  const archived = readdirSync(".github/workflows-disabled/pr23");
  assert.ok(archived.includes("pr23-protected-orchestrator.yml"));
  assert.ok(archived.includes("archive-processing-scheduler.yml"));
});

test("domain reconciliation is promotion-only and restores legacy aliases on failure", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const domain = readFileSync("scripts/solo/reconcile-domain.mjs", "utf8");
  assert.match(
    workflow,
    /Wait for main deployment[\s\S]*Reconcile domain only after production is green[\s\S]*Public smoke and observation after domain transfer/,
  );
  assert.match(domain, /COMUN_DOMAIN_ALREADY_CANONICAL/);
  assert.match(domain, /SOLO_DOMAIN_PRECONDITION_MISMATCH/);
  assert.match(domain, /\[\.\.\.domains\]\.reverse\(\)/);
  assert.match(domain, /\/v10\/projects\/\$\{canonical\}\/domains/);
});

test("preview and production validate PMTiles Range in the correct domain order", () => {
  const workflow = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const preview = readFileSync("scripts/solo/verify-preview.mjs", "utf8");
  const monitor = readFileSync("scripts/solo/monitor-production.mjs", "utf8");
  assert.match(preview, /check\.name === "Vercel" && check\.state === "SUCCESS"/);
  assert.match(preview, /actions\/workflows\/comun-ci\.yml\/runs/);
  assert.match(preview, /run\.head_sha === process\.env\.SHA/);
  assert.match(preview, /run\.conclusion === "success"/);
  assert.match(preview, /SOLO_PREVIEW_CHECKS_NOT_GREEN:COMUN_CI/);
  assert.doesNotMatch(preview, /FAST \/ COMUN_CI_GREEN|FULL \/ COMUN_CI_GREEN/);
  assert.match(preview, /deployments\?sha=\$\{process\.env\.SHA\}/);
  assert.match(preview, /statuses\.find/);
  assert.match(preview, /inspectDeployment/);
  assert.match(preview, /validatePmtilesResponse/);
  assert.match(preview, /COMUN_VERCEL_PREVIEW_AUTHENTICATED_PROBE_OK/);
  assert.match(preview, /COMUN_PMTILES_PREVIEW_RANGE_OK/);
  assert.match(
    preview,
    /COMUN_VERCEL_PREVIEW_HTTP_DEFERRED_TO_PRODUCTION_SMOKE/,
  );
  assert.match(preview, /github-deployment-attestation/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN\|S_VERCEL_TOKEN/);
  const previewClient = readFileSync(
    "scripts/solo/vercel-preview-client.mjs",
    "utf8",
  );
  assert.match(previewClient, /api\.vercel\.com\/v13\/deployments/);
  assert.match(previewClient, /VERCEL_CLI_VERSION = "50\.28\.0"/);
  assert.match(previewClient, /--deployment/);
  assert.match(previewClient, /url\.href/);
  assert.match(monitor, /SOLO_PRODUCTION_PMTILES_RANGE_INVALID/);
  assert.match(monitor, /SOLO_PUBLIC_WWW_REDIRECT_INVALID/);
  assert.match(
    workflow,
    /--minutes=1 --domain=comunvrabandonada\.vercel\.app[\s\S]*reconcile-domain\.mjs[\s\S]*--minutes=15 --domain=comunsocial\.online --public/,
  );
});

test("the map checkpoint uses a scoped Vercel protection bypass for its Preview Range probe", () => {
  const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");
  assert.match(workflow, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(workflow, /x-vercel-protection-bypass/);
  assert.match(workflow, /--range 0-127/);
  assert.match(workflow, /bytes 0-127\/10147678/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN/);
});

test("the map FULL gate finds successful checks beyond the first API page", () => {
  const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");
  assert.match(workflow, /gh api --paginate.*check-runs\?per_page=100/s);
  assert.match(workflow, /jq -s --arg required/);
});

test("preview-only workflow cannot access database or mutable jobs", () => {
  const nightly = readFileSync(".github/workflows/comun-nightly.yml", "utf8");
  const previewJob =
    nightly.match(/  preview-preflight:[\s\S]*?\n  full-local:/)?.[0] ?? "";
  assert.match(nightly, /preview_preflight:/);
  assert.match(previewJob, /verify-preview\.mjs/);
  assert.match(previewJob, /comun-vercel-preview-diagnostic/);
  assert.doesNotMatch(
    previewJob,
    /SUPABASE|apply-forward-only|cleanup|db lint|migration/i,
  );
  assert.match(nightly, /!inputs\.preview_preflight/);
});

test("release preflight selects the sidewalk release explicitly and remains read-only", () => {
  const nightly = readFileSync(".github/workflows/comun-nightly.yml", "utf8");
  const job =
    nightly.match(/  release-preflight:[\s\S]*?\n  preview-preflight:/)?.[0] ??
    "";
  assert.match(
    job,
    /COMUN_RELEASE_MANIFEST:\s*supabase\/releases\/20260724233256-comun-sidewalk-operational-hardening\.json/,
  );
  assert.match(job, /apply-forward-only\.mjs --read-only-preflight/);
  assert.doesNotMatch(
    job,
    /apply-forward-only\.mjs(?! --read-only-preflight)|cleanup|full-local|production-health|capture_baseline/i,
  );
});

test("FULL compares deterministic PostgreSQL catalog fingerprints", () => {
  const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");
  const fullJob = workflow.match(/\n  full:[\s\S]*$/)?.[0] ?? "";
  const fingerprint = readFileSync(
    "scripts/solo/schema-fingerprint.mjs",
    "utf8",
  );
  assert.equal((fullJob.match(/schema-fingerprint\.mjs/g) ?? []).length, 2);
  assert.match(fullJob, /diff -u \/tmp\/comun-hash-1 \/tmp\/comun-hash-2/);
  assert.match(fingerprint, /information_schema\.columns/);
  assert.match(fingerprint, /pg_constraint/);
  assert.match(fingerprint, /pg_policies/);
  assert.match(fingerprint, /pg_get_functiondef/);
});
