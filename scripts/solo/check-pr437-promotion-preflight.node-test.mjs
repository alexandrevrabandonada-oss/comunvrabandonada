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
  releasePresent: false,
  releaseLedgerState: "ABSENT",
};
const reference = {
  preRunnerFingerprint: hash("a"),
  preCanonicalFingerprint: hash("b"),
  preBlockingFindings: 74,
  preFindingRules: ["DEFINER_SEARCH_PATH"],
  postRunnerFingerprint: hash("c"),
  postCanonicalFingerprint: hash("d"),
  postBlockingFindings: 0,
  postFindingRules: [],
  migrations: ["202605070001"],
  legacyRelations: ["comments"],
  publicRelations: ["comments"],
};
const release = {
  expectedPreFingerprint: hash("a"),
  expectedPostFingerprint: hash("c"),
};

test("exact read-only preflight match", () => {
  assert.equal(
    comparePreflight(actual, reference, release).state,
    "PRE_PENDING",
  );
});
test("accepted POST release is recognized without another migration", () => {
  const post = {
    ...actual,
    runnerFingerprint: hash("c"),
    canonicalFingerprint: hash("d"),
    blockingFindings: 0,
    findingRules: [],
    releasePresent: true,
    releaseLedgerState: "PRESENT_ACCEPTED",
  };
  assert.equal(
    comparePreflight(post, reference, release).state,
    "POST_ALREADY_APPLIED",
  );
  for (const drift of [
    { releasePresent: false, releaseLedgerState: "ABSENT" },
    { blockingFindings: 1 },
    { releaseLedgerState: "PRESENT_MISMATCH" },
    { consentObjectCount: 1 },
  ])
    assert.equal(
      comparePreflight({ ...post, ...drift }, reference, release).state,
      "BLOCKED",
    );
  assert.equal(
    comparePreflight(
      {
        ...actual,
        releasePresent: true,
        releaseLedgerState: "PRESENT_ACCEPTED",
      },
      reference,
      release,
    ).state,
    "BLOCKED",
  );
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
