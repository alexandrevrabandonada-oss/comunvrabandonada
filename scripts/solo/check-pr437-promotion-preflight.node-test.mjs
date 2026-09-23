import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { comparePreflight } from "./check-pr437-promotion-preflight.mjs";

const hash = (digit) => digit.repeat(64);
const actual = {
  runnerFingerprint: hash("a"),
  canonicalFingerprint: hash("b"),
  blockingFindings: 74,
  findingRules: ["DEFINER_SEARCH_PATH"],
  migrations: ["202605070001"],
  legacyRelations: ["comments"],
  publicRelations: ["comments"],
  consentMigrationPresent: false,
  consentObjectCount: 0,
};
const reference = {
  canonicalFingerprint: hash("b"),
  expectedBlockingFindings: 74,
  expectedFindingRules: ["DEFINER_SEARCH_PATH"],
  migrations: ["202605070001"],
  legacyRelations: ["comments"],
  publicRelations: ["comments"],
};
const release = { expectedPreFingerprint: hash("a") };

test("exact read-only preflight match", () => {
  assert.equal(comparePreflight(actual, reference, release).status, "PASS");
});
test("runner fingerprint mismatch blocks", () => {
  assert.equal(
    comparePreflight(
      { ...actual, runnerFingerprint: hash("c") },
      reference,
      release,
    ).status,
    "BLOCKED",
  );
});
test("extra and missing legacy relations block", () => {
  assert.deepEqual(
    comparePreflight(
      { ...actual, legacyRelations: ["posts"] },
      reference,
      release,
    ).missingLegacyRelations,
    ["comments"],
  );
  assert.equal(
    comparePreflight(
      { ...actual, legacyRelations: ["comments", "posts"] },
      reference,
      release,
    ).status,
    "BLOCKED",
  );
});
test("an eighth public relation is reported and blocks", () => {
  const diagnostic = comparePreflight(
    { ...actual, publicRelations: ["comments", "eighth_relation"] },
    reference,
    release,
  );
  assert.equal(diagnostic.status, "BLOCKED");
  assert.deepEqual(diagnostic.extraRelations, ["eighth_relation"]);
});
test("pending consent never becomes authorized", () => {
  assert.equal(
    comparePreflight(
      { ...actual, consentMigrationPresent: true },
      reference,
      release,
    ).status,
    "BLOCKED",
  );
  assert.equal(
    comparePreflight({ ...actual, consentObjectCount: 1 }, reference, release)
      .status,
    "BLOCKED",
  );
});
test("diagnostic includes only sanitized identities and counts", () => {
  assert.throws(
    () =>
      comparePreflight(
        { ...actual, legacyRelations: ["user@example.com"] },
        reference,
        release,
      ),
    /UNSAFE_IDENTITY/,
  );
  assert.deepEqual(
    comparePreflight(
      { ...actual, migrations: ["202605080001"] },
      reference,
      release,
    ).extraMigrations,
    ["202605080001"],
  );
});
test("PR437 capture is read-only and promotion preflight precedes every write", () => {
  const capture = readFileSync(
    ".github/workflows/comun-pr437-promotion-fingerprint.yml",
    "utf8",
  );
  const promote = readFileSync(".github/workflows/comun-promote.yml", "utf8");
  const script = readFileSync(
    "scripts/solo/capture-promotion-fingerprint.mjs",
    "utf8",
  );
  assert.match(capture, /pull_request:\s*\n\s*types: \[synchronize\]/);
  assert.match(capture, /contents: read/);
  assert.doesNotMatch(
    capture,
    /workflow_dispatch|service_role|comun:promover/i,
  );
  assert.match(script, /BEGIN READ ONLY/);
  assert.match(script, /ROLLBACK/);
  assert.ok(
    promote.indexOf("name: Canonical Production preflight") <
      promote.indexOf("name: Apply transactional forward-only package"),
  );
});
