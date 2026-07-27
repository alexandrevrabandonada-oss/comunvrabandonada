import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DiagnosticError,
  assertReadOnlySql,
  classifyRemoteDrift,
  compareScopedObjects,
  readOnlyTransaction,
  runReadOnlyQuery,
  sanitizeArtifact,
  validateCanonicalRelease,
  validateRemoteEnvironment,
} from "./diagnose-sidewalk-remote-drift.mjs";
import {
  buildDocument as buildScopedDocument,
  fingerprint as fingerprintScoped,
  scopedObjects,
} from "./sidewalk-operational-fingerprint.mjs";

const marker = (expected) => (error) =>
  error instanceof DiagnosticError && error.marker === expected;

const base = (overrides = {}) => ({
  globalPre: "global-pre",
  globalPost: "global-post",
  globalObserved: "global-pre",
  scopedPre: "scoped-pre",
  scopedPost: "scoped-post",
  scopedObserved: "scoped-pre",
  ledger: "ABSENT",
  objects: [{ state: "equal" }],
  blockingFindings: 0,
  ...overrides,
});

const remoteUrl = (host = "database.internal") =>
  ["postgresql:", "//reader:placeholder@", host, "/postgres"].join("");

test("rejects INSERT before opening a PostgreSQL connection", () => {
  let calls = 0;
  assert.throws(
    () =>
      runReadOnlyQuery("insert into public.anything values (1)", {
        databaseUrl: remoteUrl("database.example"),
        run: () => {
          calls += 1;
        },
      }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SQL_REJECTED"),
  );
  assert.equal(calls, 0);
});

test("rejects ALTER before opening a PostgreSQL connection", () => {
  assert.throws(
    () => assertReadOnlySql("alter table public.anything add column x text"),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SQL_REJECTED"),
  );
});

test("allows a fixed SELECT inside a mandatory read-only transaction", () => {
  const wrapped = readOnlyTransaction("select 1");
  assert.match(
    wrapped,
    /^set default_transaction_read_only = on; begin transaction read only;/,
  );
  assert.match(wrapped, /rollback;$/);
});

test("accepts one explicitly allowlisted remote target without printing its connection", () => {
  const result = validateRemoteEnvironment({
    PR23_ALLOWED_PROJECT_REFS: "projectref",
    SUPABASE_PROJECT_REF: "projectref",
    PR23_DATABASE_URL: remoteUrl(),
  });
  assert.equal(result.projectRef, "projectref");
  assert.equal(result.databaseUrl.includes("placeholder"), true);
});

test("rejects a local or mismatched protected target", () => {
  assert.throws(
    () =>
      validateRemoteEnvironment({
        PR23_ALLOWED_PROJECT_REFS: "projectref",
        SUPABASE_PROJECT_REF: "projectref",
        PR23_DATABASE_URL: remoteUrl("localhost"),
      }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_DESTINATION_INVALID"),
  );
  assert.throws(
    () =>
      validateRemoteEnvironment({
        PR23_ALLOWED_PROJECT_REFS: "projectref",
        SUPABASE_PROJECT_REF: "other",
        PR23_DATABASE_URL: remoteUrl(),
      }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_PROJECT_NOT_ALLOWLISTED"),
  );
});

test("classifies global drift when the scoped pre-state and absent ledger are exact", () => {
  assert.equal(
    classifyRemoteDrift(base({ globalObserved: "different-global" })),
    "GLOBAL_ONLY_DRIFT",
  );
});

test("classifies a divergent sidewalk scope without treating it as global-only drift", () => {
  assert.equal(
    classifyRemoteDrift(base({ scopedObserved: "third-state" })),
    "SIDEWALK_SCOPE_PRE_DRIFT",
  );
});

test("classifies a proven object mixture as partial release state", () => {
  assert.equal(
    classifyRemoteDrift(
      base({
        scopedObserved: "third-state",
        objects: [{ state: "pre" }, { state: "post" }],
      }),
    ),
    "PARTIAL_RELEASE_STATE",
  );
});

test("classifies matching post state without the ledger as mismatch", () => {
  assert.equal(
    classifyRemoteDrift(base({ scopedObserved: "scoped-post" })),
    "POST_WITH_LEDGER_MISMATCH",
  );
});

test("classifies mismatched ledger beside post state as mismatch", () => {
  assert.equal(
    classifyRemoteDrift(
      base({ scopedObserved: "scoped-post", ledger: "PRESENT_MISMATCH" }),
    ),
    "POST_WITH_LEDGER_MISMATCH",
  );
});

test("classifies accepted post state only with accepted ledger and no blocking finding", () => {
  assert.equal(
    classifyRemoteDrift(
      base({ scopedObserved: "scoped-post", ledger: "PRESENT_ACCEPTED" }),
    ),
    "ALREADY_APPLIED_ACCEPTED",
  );
});

test("classifies unreadable evidence as insufficient permission rather than equality", () => {
  assert.equal(
    classifyRemoteDrift(base({ unreadable: true })),
    "INSUFFICIENT_READ_PERMISSION",
  );
});

test("hashes remote definitions and never serializes them in the object comparison", () => {
  const compared = compareScopedObjects(
    [{ type: "policy", name: "records.owner", hash: "observed" }],
    [{ type: "policy", name: "records.owner", hash: "pre" }],
    [{ type: "policy", name: "records.owner", hash: "post" }],
  );
  assert.deepEqual(compared[0], {
    type: "policy",
    name: "records.owner",
    expectedPreHash: "pre",
    expectedPostHash: "post",
    observedHash: "observed",
    state: "changed",
  });
});

test("scoped fingerprint remains deterministic over the versioned sidewalk object scope", () => {
  const raw = {
    relations: [],
    columns: [],
    constraints: [],
    indexes: [],
    policies: [],
    grants: [],
    ledger: [],
  };
  assert.equal(
    fingerprintScoped(buildScopedDocument(raw)),
    fingerprintScoped(buildScopedDocument(raw)),
  );
  assert.ok(scopedObjects.includes("comun_sidewalk_records"));
});

test("blocks secrets in artifact JSON and Markdown", () => {
  assert.throws(
    () => sanitizeArtifact({ value: remoteUrl("database.private") }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SENSITIVE_ARTIFACT"),
  );
  assert.throws(
    () => sanitizeArtifact(["Author", "ization: bearer"].join("")),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SENSITIVE_ARTIFACT"),
  );
});

test("diagnostic code imports no database write executor", () => {
  const source = readFileSync(
    new URL("./diagnose-sidewalk-remote-drift.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /executeSql\s*\(/);
  assert.doesNotMatch(source, /apply-forward-only\.mjs/);
});

test("workflow is dispatch-only and never invokes the activation path", () => {
  const workflow = readFileSync(
    new URL(
      "../../.github/workflows/comun-sidewalk-remote-diagnostic.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /diagnose-sidewalk-remote-drift\.mjs/);
  assert.doesNotMatch(workflow, /\bactivate\b/i);
  assert.doesNotMatch(workflow, /supabase\s+(?:db\s+push|migration\s+up)/i);
});

test("canonical migration and manifest hashes remain immutable", async () => {
  const { release } = await validateCanonicalRelease();
  assert.equal(
    release.migrationSha256,
    "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  );
});
