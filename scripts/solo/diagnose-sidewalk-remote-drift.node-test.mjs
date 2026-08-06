import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GRANT_CLASSIFICATIONS,
  DiagnosticError,
  assessAuditGrantDrift,
  auditGrantProvenance,
  assertReadOnlySql,
  auditGrantMatrixQuery,
  buildFingerprintDocument,
  classifyScopedExternalLedger,
  classifyRemoteDrift,
  compareScopedObjects,
  diffAuditGrantMatrices,
  normalizeAuditGrantMatrix,
  readOnlyTransaction,
  runReadOnlyQuery,
  sanitizeGrantRole,
  sanitizeArtifact,
  summarizeScopedObjects,
  validateCanonicalRelease,
  validateReference,
  validateRemoteEnvironment,
} from "./diagnose-sidewalk-remote-drift.mjs";
import {
  buildDocument as buildScopedDocument,
  buildStructuralDocument,
  fingerprint as fingerprintScoped,
  fingerprintScope,
  scopedObjects,
  structuralFingerprintScope,
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

const auditGrant = (role, privilege, isGrantable = false) => ({
  schema: "public",
  table: "comun_admin_audit_log",
  role,
  privilege,
  isGrantable,
});

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

test("accepts the versioned structural v2 reference while preserving v1 support", () => {
  const raw = {
    relations: [],
    columns: [],
    constraints: [],
    indexes: [],
    policies: [],
    grants: [],
    ledger: [],
  };
  const v1 = fingerprintScoped(buildFingerprintDocument(raw, fingerprintScope));
  const v2 = fingerprintScoped(
    buildFingerprintDocument(raw, structuralFingerprintScope),
  );

  assert.equal(v1, fingerprintScoped(buildScopedDocument(raw)));
  assert.equal(v2, fingerprintScoped(buildStructuralDocument(raw)));
  assert.doesNotThrow(() =>
    validateReference({
      scope: structuralFingerprintScope,
      scopedPre: "a".repeat(64),
      scopedPost: "b".repeat(64),
      objectsPre: [],
      objectsPost: [],
      auditGrantsPre: [],
      auditGrantsPost: [],
    }),
  );
  assert.throws(
    () =>
      validateReference({
        scope: "unversioned",
        scopedPre: "a".repeat(64),
        scopedPost: "b".repeat(64),
        objectsPre: [],
        objectsPost: [],
        auditGrantsPre: [],
        auditGrantsPost: [],
      }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_REFERENCE_INVALID"),
  );
});

test("keeps every grant in a scoped table distinct instead of collapsing it by table", () => {
  const pre = summarizeScopedObjects({
    canonical: {
      grants: [
        {
          table: "comun_admin_audit_log",
          grantee: "anon",
          privilege: "SELECT",
        },
        {
          table: "comun_admin_audit_log",
          grantee: "authenticated",
          privilege: "SELECT",
        },
        {
          table: "comun_admin_audit_log",
          grantee: "untrusted_role",
          privilege: "UPDATE",
        },
      ],
    },
  });
  const remote = summarizeScopedObjects({
    canonical: {
      grants: [
        {
          table: "comun_admin_audit_log",
          grantee: "anon",
          privilege: "SELECT",
        },
        {
          table: "comun_admin_audit_log",
          grantee: "authenticated",
          privilege: "UPDATE",
        },
        {
          table: "comun_admin_audit_log",
          grantee: "untrusted_role",
          privilege: "UPDATE",
        },
      ],
    },
  });
  const compared = compareScopedObjects(remote, pre, pre);

  assert.equal(compared.length, 4);
  assert.deepEqual(
    compared.map(({ name, state }) => ({ name, state })),
    [
      {
        name: "comun_admin_audit_log.anon.SELECT",
        state: "equal",
      },
      {
        name: "comun_admin_audit_log.authenticated.SELECT",
        state: "missing",
      },
      {
        name: "comun_admin_audit_log.authenticated.UPDATE",
        state: "unexpected",
      },
      {
        name: "comun_admin_audit_log.other-role-f553a25e0d58.UPDATE",
        state: "equal",
      },
    ],
  );
});

test("treats an object created only in POST and absent remotely as PRE", () => {
  const [object] = compareScopedObjects(
    [],
    [],
    [{ type: "table", name: "created_later", hash: "post" }],
  );
  assert.equal(object.state, "pre");
  assert.equal(object.observedHash, null);
});

test("treats an object removed in POST and absent remotely as POST", () => {
  const [object] = compareScopedObjects(
    [],
    [{ type: "policy", name: "removed_later", hash: "pre" }],
    [],
  );
  assert.equal(object.state, "post");
  assert.equal(object.observedHash, null);
});

test("does not classify a complete PRE with future POST objects absent as partial", () => {
  const objects = compareScopedObjects(
    [{ type: "table", name: "legacy", hash: "pre" }],
    [{ type: "table", name: "legacy", hash: "pre" }],
    [{ type: "table", name: "future", hash: "post" }],
  );
  assert.deepEqual(
    objects.map(({ state }) => state),
    ["pre", "pre"],
  );
  assert.notEqual(
    classifyRemoteDrift(base({ objects })),
    "PARTIAL_RELEASE_STATE",
  );
});

test("does not classify a complete POST with removed PRE objects absent as partial", () => {
  const objects = compareScopedObjects(
    [{ type: "table", name: "future", hash: "post" }],
    [{ type: "table", name: "legacy", hash: "pre" }],
    [{ type: "table", name: "future", hash: "post" }],
  );
  assert.deepEqual(
    objects.map(({ state }) => state),
    ["post", "post"],
  );
  assert.notEqual(
    classifyRemoteDrift(base({ scopedObserved: "scoped-post", objects })),
    "PARTIAL_RELEASE_STATE",
  );
});

test("classifies a verified PRE and POST object mixture as partial", () => {
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

test("classifies a PRE state with a changed grant as sidewalk scope PRE drift", () => {
  assert.equal(
    classifyRemoteDrift(
      base({
        scopedObserved: "third-state",
        objects: [{ state: "pre" }, { state: "changed" }],
      }),
    ),
    "SIDEWALK_SCOPE_PRE_DRIFT",
  );
});

test("classifies a PRE state with an unexpected object as sidewalk scope PRE drift", () => {
  assert.equal(
    classifyRemoteDrift(
      base({
        scopedObserved: "third-state",
        objects: [{ state: "pre" }, { state: "unexpected" }],
      }),
    ),
    "SIDEWALK_SCOPE_PRE_DRIFT",
  );
});

test("marks an absent object required in PRE and POST as missing", () => {
  const [object] = compareScopedObjects(
    [],
    [{ type: "grant", name: "required", hash: "same" }],
    [{ type: "grant", name: "required", hash: "same" }],
  );
  assert.equal(object.state, "missing");
});

test("marks an absent object required by distinct PRE and POST states as missing", () => {
  const [object] = compareScopedObjects(
    [],
    [{ type: "policy", name: "required", hash: "pre" }],
    [{ type: "policy", name: "required", hash: "post" }],
  );
  assert.equal(object.state, "missing");
});

test("reclassifies the sanitized 30235576480 artifact deterministically", () => {
  const objects = [
    ...Array.from({ length: 124 }, () => ({ state: "equal" })),
    ...Array.from({ length: 31 }, () => ({ state: "pre" })),
    { state: "pre" },
    { state: "changed" },
  ];
  assert.equal(
    classifyRemoteDrift(
      base({
        globalObserved:
          "df68dc13bb7693d45806d79acd3bd002f7304b41a086f9d19b625d9883bc6a01",
        scopedObserved:
          "8e673f05b6976dfb4675133e7ad4c90c300b18585596279d600fa0d6442535fd",
        objects,
      }),
    ),
    "SIDEWALK_SCOPE_PRE_DRIFT",
  );
});

test("always returns exactly one supported drift classification", () => {
  const classification = classifyRemoteDrift(
    base({ scopedObserved: "third-state", objects: [{ state: "changed" }] }),
  );
  assert.deepEqual(
    [
      "GLOBAL_ONLY_DRIFT",
      "SIDEWALK_SCOPE_PRE_DRIFT",
      "PARTIAL_RELEASE_STATE",
      "POST_WITH_LEDGER_MISMATCH",
      "ALREADY_APPLIED_ACCEPTED",
      "INSUFFICIENT_READ_PERMISSION",
    ].filter((value) => value === classification),
    [classification],
  );
});

test("offline reclassification needs neither a connection nor a secret", () => {
  const objects = compareScopedObjects(
    [{ type: "grant", name: "public.audit", hash: "changed" }],
    [{ type: "grant", name: "public.audit", hash: "pre" }],
    [{ type: "grant", name: "public.audit", hash: "post" }],
  );
  const replay = {
    objects,
    classification: classifyRemoteDrift(
      base({ scopedObserved: "third-state", objects }),
    ),
  };
  assert.doesNotMatch(
    JSON.stringify(replay),
    /postgres(?:ql)?:|password|token/i,
  );
  assert.equal(replay.classification, "SIDEWALK_SCOPE_PRE_DRIFT");
});

test("classifies an audit grant matrix equal to local PRE", () => {
  const pre = [
    auditGrant("anon", "TRIGGER"),
    auditGrant("authenticated", "TRUNCATE"),
  ];
  const assessment = assessAuditGrantDrift({ pre, post: [], remote: pre });
  assert.equal(assessment.classification, "REMOTE_EQUIVALENT_TO_PRE");
  assert.equal(assessment.risk, "equivalent_pre");
});

test("classifies an audit grant matrix equal to local POST", () => {
  const pre = [auditGrant("anon", "TRIGGER")];
  const post = [auditGrant("service_role", "SELECT")];
  const assessment = assessAuditGrantDrift({ pre, post, remote: post });
  assert.equal(assessment.classification, "REMOTE_EQUIVALENT_TO_POST");
  assert.equal(assessment.risk, "equivalent_post");
});

test("marks PRE=POST grants as equal_pre_post", () => {
  const grants = [auditGrant("service_role", "SELECT")];
  const assessment = assessAuditGrantDrift({
    pre: grants,
    post: grants,
    remote: grants,
  });
  assert.equal(assessment.classification, "EQUAL_PRE_POST");
  assert.equal(assessment.risk, "equal_pre_post");
  assert.equal(assessment.prePostEqual, true);
});

test("accepts exact scoped POST despite global fingerprint evolution", () => {
  const grants = [auditGrant("service_role", "SELECT")];
  const assessment = assessAuditGrantDrift({
    pre: grants,
    post: grants,
    remote: grants,
  });
  assert.equal(
    classifyScopedExternalLedger({
      globalObserved: "later-global",
      globalPre: "historical-pre",
      globalPost: "historical-post",
      scopedObserved: "scoped-post",
      scopedPost: "scoped-post",
      ledger: "PRESENT_ACCEPTED",
      objects: [{ type: "relations", state: "equal" }, { type: "columns", state: "post" }],
      grantAudit: assessment,
    }),
    "APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER",
  );
});

test("blocks a partial scoped object even when global state evolved", () => {
  const grants = [auditGrant("service_role", "SELECT")];
  const assessment = assessAuditGrantDrift({
    pre: grants,
    post: grants,
    remote: grants,
  });
  assert.equal(
    classifyScopedExternalLedger({
      scopedObserved: "scoped-post",
      scopedPost: "scoped-post",
      ledger: "PRESENT_ACCEPTED",
      objects: [{ type: "columns", state: "post" }, { type: "policies", state: "changed" }],
      grantAudit: assessment,
    }),
    "BLOCKED_SCOPED_REMOTE_MISMATCH",
  );
});

test("blocks only when a scoped catalog read is actually unreadable", () => {
  assert.equal(
    classifyScopedExternalLedger({
      scopedObserved: "scoped-post",
      scopedPost: "scoped-post",
      ledger: "PRESENT_ACCEPTED",
      scopedUnreadable: true,
      objects: [],
    }),
    "BLOCKED_SCOPED_OBJECT_READ_PERMISSION",
  );
});

test("classifies TRIGGER and TRUNCATE already revoked as more restrictive than PRE", () => {
  const pre = [
    auditGrant("anon", "TRIGGER"),
    auditGrant("authenticated", "TRUNCATE"),
  ];
  const assessment = assessAuditGrantDrift({ pre, post: pre, remote: [] });
  assert.equal(assessment.classification, "REMOTE_MORE_RESTRICTIVE_THAN_PRE");
  assert.equal(assessment.risk, "safer_than_pre");
});

test("marks an extra SELECT grant for anon as more exposed", () => {
  const pre = [auditGrant("service_role", "SELECT")];
  const remote = [...pre, auditGrant("anon", "SELECT")];
  const assessment = assessAuditGrantDrift({ pre, post: pre, remote });
  assert.equal(assessment.classification, "REMOTE_MORE_PERMISSIVE_THAN_PRE");
  assert.equal(assessment.risk, "more_exposed");
});

test("marks an extra INSERT grant for authenticated as more exposed", () => {
  const pre = [auditGrant("service_role", "SELECT")];
  const remote = [...pre, auditGrant("authenticated", "INSERT")];
  assert.equal(
    assessAuditGrantDrift({ pre, post: pre, remote }).classification,
    "REMOTE_MORE_PERMISSIVE_THAN_PRE",
  );
});

test("marks incomplete service role CRUD as incompatible service grant drift", () => {
  const pre = [
    auditGrant("service_role", "SELECT"),
    auditGrant("service_role", "INSERT"),
    auditGrant("service_role", "UPDATE"),
    auditGrant("service_role", "DELETE"),
  ];
  const remote = pre.filter((grant) => grant.privilege !== "DELETE");
  const assessment = assessAuditGrantDrift({ pre, post: pre, remote });
  assert.equal(assessment.classification, "SERVICE_ROLE_GRANT_DRIFT");
  assert.equal(assessment.risk, "service_role_incompatible");
});

test("classifies an additional unknown role grant as other drift and masks the role", () => {
  const pre = [auditGrant("service_role", "SELECT")];
  const remote = [...pre, auditGrant("project_owner", "SELECT")];
  const assessment = assessAuditGrantDrift({ pre, post: pre, remote });
  assert.equal(assessment.classification, "OTHER_GRANT_DRIFT");
  assert.match(
    assessment.remote.find((grant) => grant.role.startsWith("other-role-"))
      .role,
    /^other-role-[a-f0-9]{12}$/,
  );
});

test("treats a public is_grantable escalation as more exposed", () => {
  const pre = [auditGrant("anon", "SELECT", false)];
  const remote = [auditGrant("anon", "SELECT", true)];
  assert.equal(
    assessAuditGrantDrift({ pre, post: pre, remote }).classification,
    "REMOTE_MORE_PERMISSIVE_THAN_PRE",
  );
});

test("does not infer audit grant equality when read permission is insufficient", () => {
  const assessment = assessAuditGrantDrift({
    pre: [auditGrant("anon", "SELECT")],
    post: [],
    remote: null,
    unreadable: true,
  });
  assert.equal(assessment.classification, "INSUFFICIENT_READ_PERMISSION");
  assert.equal(assessment.risk, "unknown");
});

test("audit grant classification is exactly one supported state", () => {
  const assessment = assessAuditGrantDrift({
    pre: [auditGrant("anon", "TRIGGER")],
    post: [],
    remote: [],
  });
  assert.deepEqual(
    GRANT_CLASSIFICATIONS.filter(
      (classification) => classification === assessment.classification,
    ),
    [assessment.classification],
  );
});

test("sanitizes every unknown grant role deterministically", () => {
  const masked = sanitizeGrantRole("project_owner");
  assert.equal(masked, sanitizeGrantRole("project_owner"));
  assert.match(masked, /^other-role-[a-f0-9]{12}$/);
  assert.equal(sanitizeGrantRole(masked), masked);
});

test("rejects connection strings while allowing the service_role matrix entry", () => {
  assert.deepEqual(
    sanitizeArtifact({ grants: [auditGrant("service_role", "SELECT")] }),
    { grants: [auditGrant("service_role", "SELECT")] },
  );
  assert.throws(
    () => sanitizeArtifact({ connection: remoteUrl("database.private") }),
    marker("COMUN_SIDEWALK_REMOTE_DIAGNOSTIC_SENSITIVE_ARTIFACT"),
  );
});

test("sorts the audit grant matrix deterministically", () => {
  const first = normalizeAuditGrantMatrix([
    auditGrant("authenticated", "INSERT"),
    auditGrant("anon", "SELECT"),
  ]);
  const second = normalizeAuditGrantMatrix([...first].reverse());
  assert.deepEqual(first, second);
});

test("uses fixed read-only SQL for the audit grant matrix", () => {
  assert.doesNotThrow(() => assertReadOnlySql(auditGrantMatrixQuery));
  assert.doesNotMatch(
    auditGrantMatrixQuery,
    /\b(?:insert|update|delete|grant|revoke)\b/i,
  );
});

test("builds deterministic PRE and POST deltas without a remote connection", () => {
  const pre = [auditGrant("anon", "TRIGGER")];
  const remote = [auditGrant("authenticated", "TRUNCATE")];
  assert.deepEqual(diffAuditGrantMatrices(pre, remote), {
    missingInRemote: pre,
    extraInRemote: remote,
    equal: [],
  });
});

test("builds grant provenance from local migrations without reading remote SQL", async () => {
  const timeline = await auditGrantProvenance(["20260708175500"]);
  const hardening = timeline.find(
    (entry) => entry.migration === "20260708175500",
  );
  const operational = timeline.find(
    (entry) => entry.migration === "20260724233256",
  );
  assert.equal(hardening.presentInRemoteHistory, true);
  assert.equal(hardening.causality, "likely");
  assert.deepEqual(operational.operations[0], {
    operation: "revoke",
    roles: ["anon", "authenticated"],
    privileges: ["TRIGGER", "TRUNCATE"],
  });
  assert.equal(operational.presentInRemoteHistory, false);
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

test("workflow accepts only the canonical or safer PRE v2 local reference profiles", () => {
  const workflow = readFileSync(
    new URL(
      "../../.github/workflows/comun-sidewalk-remote-diagnostic.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(workflow, /reference_profile:/);
  assert.match(workflow, /- canonical/);
  assert.match(workflow, /- safer-pre-v2/);
  assert.match(
    workflow,
    /derive-sidewalk-safer-pre-v2-reference\.mjs --output=\.ci-artifacts\/local-reference\.json/,
  );
  assert.match(workflow, /canonical\|safer-pre-v2\) ;;/);
  assert.doesNotMatch(workflow, /mode:\s*(?:migrate|activate)/i);
});

test("canonical migration and manifest hashes remain immutable", async () => {
  const { release } = await validateCanonicalRelease();
  assert.equal(
    release.migrationSha256,
    "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  );
});
