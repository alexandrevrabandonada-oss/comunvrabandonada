import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyVersionEquivalence,
  requireDisposableCapture,
  requireProductionCapture,
  sha256,
} from "./pr437-search-proof-contract.mjs";
import {
  requireRawFindings,
  requireTempColumns,
} from "./prove-search-sync-local-temp-table.mjs";
import { aggregateProof } from "./aggregate-pr437-search-proof.mjs";

const fixture = JSON.parse(
  readFileSync("tests/fixtures/pr437-post/fixture-manifest.json", "utf8"),
);
const reference = JSON.parse(
  readFileSync(
    "reports/current/comun-pr437-production-preflight-reference.json",
    "utf8",
  ),
);
const releaseText = readFileSync(
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
);
const release = JSON.parse(releaseText);
// Committed contract tests use synthetic captures; no external artifact or DB is required.
const makeProduction = () => ({
  scope: "COMUN_PR437_PROMOTION_FINGERPRINT_READ_ONLY",
  target: "PRODUCTION",
  runnerFingerprint: reference.postRunnerFingerprint,
  canonicalFingerprint: reference.postCanonicalFingerprint,
  blockingFindings: 0,
  releaseLedgerState: "PRESENT_ACCEPTED",
  releasePresent: true,
  consentMigrationPresent: false,
  consentObjectCount: 0,
  postgresVersion: "17.6",
  plpgsqlCheckCatalog: {
    name: "plpgsql_check",
    installed: null,
    available: { defaultVersion: "2.7", installedVersion: null },
    versions: [{ name: "plpgsql_check", version: "2.7", installed: false }],
  },
  searchFunction: {
    identity: "public.comun_sync_public_search_projection()",
    language: "plpgsql",
    owner: reference.searchSyncOwner,
    securityDefiner: true,
    config: ["search_path=pg_catalog"],
    definitionSha256: reference.searchSyncDefinitionSha256,
  },
  releaseIdentity: {
    release: release.release,
    migration: release.migration,
    migrationSha256: release.migrationSha256,
    manifestSha256: sha256(releaseText),
    expectedPostFingerprint: release.expectedPostFingerprint,
  },
});
const checkedProduction = () => {
  const capture = makeProduction();
  requireProductionCapture(capture, reference, release, sha256(releaseText));
  return capture;
};
const makeDisposable = (production = checkedProduction()) => ({
  ...structuredClone(production),
  target: "DISPOSABLE",
  plpgsqlCheckCatalog: {
    ...production.plpgsqlCheckCatalog,
    installed: { version: "2.7" },
  },
});

test("extension version contract never invents a patch", () => {
  assert.equal(classifyVersionEquivalence("2.7.11", "2.7.11"), "EXACT");
  assert.equal(
    classifyVersionEquivalence("2.7", "2.7"),
    "SAME_MINOR_PATCH_UNKNOWN",
  );
  assert.equal(classifyVersionEquivalence("2.7", "2.8"), "MISMATCH");
  assert.equal(classifyVersionEquivalence(undefined, "2.7"), "MISMATCH");
});

test("Production capture rejects missing versions, altered function and identity", () => {
  const production = checkedProduction();
  for (const [change, marker] of [
    [(p) => (p.plpgsqlCheckCatalog.versions = []), "EXTENSION_CATALOG_DRIFT"],
    [
      (p) => (p.searchFunction.definitionSha256 = "0".repeat(64)),
      "FUNCTION_DRIFT",
    ],
    [(p) => (p.searchFunction.owner = "anon"), "FUNCTION_DRIFT"],
    [
      (p) => (p.releaseIdentity.migrationSha256 = "0".repeat(64)),
      "RELEASE_IDENTITY_DRIFT",
    ],
    [(p) => (p.runnerFingerprint = "0".repeat(64)), "POST_DRIFT"],
  ]) {
    const changed = structuredClone(production);
    change(changed);
    assert.throws(
      () =>
        requireProductionCapture(
          changed,
          reference,
          release,
          sha256(releaseText),
        ),
      new RegExp(marker),
    );
  }
  assert.throws(
    () =>
      requireProductionCapture(
        undefined,
        reference,
        release,
        sha256(releaseText),
      ),
    /ARTIFACT_MISSING/,
  );
});

test("disposable capture rejects same-run function drift and changed fingerprints", () => {
  const production = checkedProduction();
  const disposable = makeDisposable(production);
  requireDisposableCapture(disposable, production, fixture);
  disposable.searchFunction.definitionSha256 = "0".repeat(64);
  assert.throws(
    () => requireDisposableCapture(disposable, production, fixture),
    /FIXTURE_DRIFT/,
  );
  disposable.searchFunction.definitionSha256 =
    production.searchFunction.definitionSha256;
  disposable.canonicalFingerprint = "0".repeat(64);
  assert.throws(
    () => requireDisposableCapture(disposable, production, fixture),
    /FIXTURE_DRIFT/,
  );
});

test("raw finding contract rejects extras, SQLSTATE, message and query changes", () => {
  const query = "select * from comun_search_candidates";
  const rows = fixture.expectedRawFindings.map((item) => ({
    lineno: item.line,
    sqlstate: "42P01",
    message: 'relation "comun_search_candidates" does not exist',
    query,
  }));
  for (const modify of [
    (r) => r.push(structuredClone(r[0])),
    (r) => (r[0].sqlstate = "42501"),
    (r) => (r[0].message = "another relation"),
    (r) => (r[0].query = "select * from another_relation"),
  ]) {
    const changed = structuredClone(rows);
    modify(changed);
    assert.throws(
      () => requireRawFindings(changed, fixture.expectedRawFindings),
      /RAW_FINDING_CHANGED/,
    );
  }
});

test("temp table contract rejects a missing column", () => {
  const names = [
    "domain",
    "source_type",
    "source_key",
    "source_version",
    "canonical_route",
    "title",
    "summary",
    "public_text",
    "territory_id",
    "pauta_id",
    "process_state",
    "source_date",
    "content_checksum",
  ];
  const rows = names.map((name) => ({
    name,
    type:
      name === "territory_id" || name === "pauta_id"
        ? "uuid"
        : name === "source_date"
          ? "timestamp with time zone"
          : "text",
  }));
  assert.equal(requireTempColumns(rows), 13);
  assert.throws(
    () => requireTempColumns(rows.slice(0, 12)),
    /TEMP_TABLE_STRUCTURE_CHANGED/,
  );
});

test("workflow isolates the Production secret and read-only capture", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-pr437-promotion-fingerprint.yml",
    "utf8",
  );
  const disposable = workflow.split("  disposable-proof:")[1];
  assert.ok(disposable);
  assert.doesNotMatch(
    disposable,
    /secrets\.|SUPABASE_DB_URL|supabase db lint|CREATE EXTENSION/i,
  );
  const capture = workflow
    .split("  production-capture:")[1]
    .split("  disposable-proof:")[0];
  assert.match(
    capture,
    /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/,
  );
  assert.doesNotMatch(capture, /supabase db lint|CREATE EXTENSION/i);
  const runner = readFileSync(
    "scripts/solo/run-pr437-disposable-proof.sh",
    "utf8",
  );
  assert.match(runner, /COMUN_DISPOSABLE_PRODUCTION_SECRET_PRESENT/);
  assert.doesNotMatch(runner, /secrets\./);
});

test("aggregator fails closed on changed capture hash, post-checker error, and negative control", () => {
  const production = checkedProduction();
  const disposableBefore = makeDisposable(production);
  const disposableAfter = structuredClone(disposableBefore);
  const captureSha256 = "a".repeat(64);
  const runSha = "b".repeat(40);
  const runId = "123456";
  const proof = {
    status: "GREEN",
    productionCaptureSha256: captureSha256,
    runSha,
    runId,
    imageDigest: fixture.postgresImage,
    productionDefinitionSha256: production.searchFunction.definitionSha256,
    disposableDefinitionSha256: production.searchFunction.definitionSha256,
    runnerFingerprint: production.runnerFingerprint,
    canonicalFingerprint: production.canonicalFingerprint,
    releaseLedgerState: "PRESENT_ACCEPTED",
    migrationSha256: production.releaseIdentity.migrationSha256,
    manifestSha256: production.releaseIdentity.manifestSha256,
    rawFindingContract: fixture.expectedRawFindings,
    rawFindingCount: 3,
    tempTableColumnCount: 13,
    checkerErrors: 0,
    negativeFixtureDetected: true,
    countsRestored: true,
    tempTableRemoved: true,
    negativeFixtureRemoved: true,
    definitionMatchesProduction: true,
    postgresVersion: "17.6",
    plpgsqlCheckVersion: "2.7",
    rawFindingExact: true,
    tempTablePresent: true,
    runtimeSqlState: null,
    versionEquivalence: "SAME_MINOR_PATCH_UNKNOWN",
  };
  const input = {
    production,
    disposableBefore,
    disposableAfter,
    proof,
    fixture,
    captureSha256,
    runSha,
    runId,
  };
  assert.equal(
    aggregateProof(input).marker,
    "SEARCH_SYNC_RUNTIME_CONTRACT_PROVED",
  );
  for (const modify of [
    (x) => (x.proof.productionCaptureSha256 = "0".repeat(64)),
    (x) => (x.proof.checkerErrors = 1),
    (x) => (x.proof.negativeFixtureDetected = false),
    (x) => (x.proof.rawFindingCount = 2),
    (x) => (x.proof.versionEquivalence = "EXACT"),
    (x) => (x.disposableAfter.canonicalFingerprint = "0".repeat(64)),
  ]) {
    const changed = structuredClone(input);
    modify(changed);
    assert.throws(() => aggregateProof(changed), /COMUN_SEARCH_LINT_/);
  }
});
