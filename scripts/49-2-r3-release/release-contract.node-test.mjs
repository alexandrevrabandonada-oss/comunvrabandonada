import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadValidatedR3Manifest,
  validateR3Manifest,
  MANIFEST_PATH,
  BASELINE_PATH,
  DERIVED_PATH,
} from "./validate-manifest.mjs";
import {
  requireDisposableUrl,
  requireR3WriteAuthorization,
} from "./postgres-adapter.mjs";

const manifestBytes = readFileSync(MANIFEST_PATH);
const baselineBytes = readFileSync(BASELINE_PATH);
const derivedBytes = readFileSync(DERIVED_PATH);
const manifest = JSON.parse(manifestBytes);
const baseline = JSON.parse(baselineBytes);
const derived = JSON.parse(derivedBytes);
const migrationBytes = readFileSync(manifest.migrations[0].path);
const validate = (overrides = {}) =>
  validateR3Manifest({
    manifest,
    baseline,
    derived,
    baselineBytes,
    derivedBytes,
    migrationBytes,
    ...overrides,
  });

test("manifest pins real PRE, disposable POST and exact migration bytes", () => {
  assert.equal(loadValidatedR3Manifest().manifest.release, manifest.release);
});
test("manifest rejects changed migration and captured PRE", () => {
  assert.throws(
    () => validate({ migrationBytes: Buffer.from("changed") }),
    /MANIFEST_INVALID/,
  );
  assert.throws(
    () => validate({ baselineBytes: Buffer.from("changed") }),
    /MANIFEST_INVALID/,
  );
});
test("manifest rejects changed disposable POST fingerprint or release ledger", () => {
  assert.throws(
    () =>
      validate({
        manifest: { ...manifest, expectedPostFingerprint: "0".repeat(64) },
      }),
    /MANIFEST_INVALID/,
  );
  assert.throws(
    () =>
      validate({
        manifest: {
          ...manifest,
          releaseLedger: {
            ...manifest.releaseLedger,
            migrationSha256: "0".repeat(64),
          },
        },
      }),
    /MANIFEST_INVALID/,
  );
});
test("disposable destination is strictly local", () => {
  assert.equal(
    requireDisposableUrl(
      "postgresql://postgres:postgres@127.0.0.1:57532/comun_pr437_prodlike_post_123",
    ),
    "postgresql://postgres:postgres@127.0.0.1:57532/comun_pr437_prodlike_post_123",
  );
  assert.throws(
    () =>
      requireDisposableUrl(
        "postgresql://postgres:postgres@db.supabase.co:5432/postgres",
      ),
    /DISPOSABLE_DESTINATION/,
  );
});
test("Production write needs R3-specific authorization and exact main event", () => {
  assert.throws(
    () =>
      requireR3WriteAuthorization({
        authorization: "COMUN_49_2_PRODUCTION_SCHEMA_WRITE",
        expectedSha: "a".repeat(40),
        disposable: false,
      }),
    /WRITE_AUTHORIZATION/,
  );
  assert.throws(
    () =>
      requireR3WriteAuthorization({
        authorization: "COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE",
        expectedSha: "a".repeat(40),
        disposable: false,
      }),
    /WRITE_AUTHORIZATION/,
  );
  assert.doesNotThrow(() => requireR3WriteAuthorization({ disposable: true }));
});
test("promotion workflow is prepared but cannot dispatch, run on PR or call candidate RPC", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-49-2-r3-private-schema-promotion.yml",
    "utf8",
  );
  assert.match(workflow, /types: \[labeled\]/);
  assert.match(
    workflow,
    /AUTHOR_ASSOCIATION.*OWNER|test "\$AUTHOR_ASSOCIATION" = OWNER/s,
  );
  assert.match(workflow, /COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE/);
  assert.match(workflow, /git ls-remote origin refs\/heads\/main/);
  assert.match(workflow, /--mode=preflight/);
  assert.match(workflow, /--mode=postflight/);
  assert.doesNotMatch(
    workflow,
    /workflow_dispatch|pull_request|supabase db push|candidate_prepare\(/,
  );
});
test("Production PRE workflow and script are read-only and credential-scoped", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-49-2-r3-production-pre-capture.yml",
    "utf8",
  );
  const capture = readFileSync(
    "scripts/49-2-r3-release/capture-production-pre.mjs",
    "utf8",
  );
  assert.match(workflow, /types: \[opened\]/);
  assert.match(workflow, /PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(capture, /BEGIN READ ONLY/);
  assert.match(capture, /ROLLBACK/);
  assert.doesNotMatch(
    workflow,
    /workflow_dispatch|CREATE EXTENSION|supabase db lint/,
  );
});
