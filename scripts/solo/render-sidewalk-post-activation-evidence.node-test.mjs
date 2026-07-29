import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  POST_ACTIVATION_RENDERER_BLOCKED,
  POST_ACTIVATION_RENDERER_INSUFFICIENT,
  POST_ACTIVATION_RENDERER_RESULT,
  assertSanitizedPostActivationEvidence,
  classifyPostActivationEvidence,
  createPostActivationEvidence,
  writePostActivationEvidence,
} from "./render-sidewalk-post-activation-evidence.mjs";

const sourceContract = {
  rendererFixId: "sidewalk-post-activation-renderer-fix-20260729-05",
  evidenceScope: "current_post_activation",
  activationRun: "30454192828",
  activationAttempt: "sidewalk-activate-20260729-03",
  activationMainSha: "9b07bcfb52c4a3b9d00c5e0fa263237f3e8b110c",
  inventoryRun: "30455092900",
  protectedDiagnosisRun: "30455096013",
  expectedInventory: {
    flagKeyPresent: true,
    flagTargetsProduction: true,
    databaseUrlKeyPresent: true,
    databaseUrlTargetsProduction: true,
    publicSupabaseUrlPresent: true,
    serviceRoleKeyPresent: true,
  },
  expectedRuntime: {
    formatVersion: 1,
    flag: "enabled",
    databaseUrl: "present",
    database: "reachable",
    ledger: "exact",
    operationalState: "OPERATIONAL_READY",
  },
  expectedSnapshot: {
    deploymentState: "READY",
    migrationRequired: false,
    migrationExecuted: false,
    publicState: "active",
    mapHttpStatus: 200,
    contributionInterfaceHttpStatus: 200,
    contributionSubmitted: false,
    databaseWrites: "none",
    storageWrites: "none",
    activationExecutedByFix: false,
    activationAttempt03Reused: false,
    secondActivationDetected: false,
    rollbackExecuted: false,
    runtimeChangedByFix: false,
    deploymentChangedByFix: false,
    environmentChangedByFix: false,
    attemptConsumptionControl: "process_controlled_consistent",
    remotePersistentNonce: false,
  },
};

function currentArtifact() {
  return {
    artifactType: "comun-sidewalk-activation-result",
    evidenceScope: "current_post_activation",
    runId: sourceContract.activationRun,
    attemptId: sourceContract.activationAttempt,
    mainSha: sourceContract.activationMainSha,
    payload: {
      formatVersion: 1,
      attemptId: sourceContract.activationAttempt,
      expectedMainSha: sourceContract.activationMainSha,
      runId: sourceContract.activationRun,
      lastGreenPhase: "ACTIVATION_GREEN",
      originalFailurePhase: null,
      originalFailureMarker: null,
      rollbackAttempted: false,
      rollbackResult: "not_required",
      finalPublicState: "active",
      durationSeconds: 177,
      databaseWrites: "none",
      storageWrites: "none",
      terminalMarker: "COMUN_SIDEWALK_ACTIVATION_GREEN",
    },
  };
}

function historicalArtifact() {
  return {
    ...currentArtifact(),
    evidenceScope: "historical",
    runId: "30391920347",
    attemptId: "sidewalk-activate-20260728-02",
    mainSha: "f5eb7b495bb4816f51dc6ee849b85a43836cabf1",
    payload: {
      ...currentArtifact().payload,
      runId: "30391920347",
      attemptId: "sidewalk-activate-20260728-02",
      expectedMainSha: "f5eb7b495bb4816f51dc6ee849b85a43836cabf1",
      finalPublicState: "paused",
      rollbackAttempted: true,
      rollbackResult: "completed",
      terminalMarker:
        "COMUN_SIDEWALK_ACTIVATION_FAILED_FLAG_VISIBILITY_ROLLED_BACK",
    },
  };
}

function input(overrides = {}) {
  return {
    sourceContract,
    activationArtifacts: [currentArtifact(), historicalArtifact()],
    inventory: sourceContract.expectedInventory,
    runtime: sourceContract.expectedRuntime,
    snapshot: sourceContract.expectedSnapshot,
    ...overrides,
  };
}

test("post-activation renderer binds the current package to attempt 03, run, and SHA", async () => {
  const report = createPostActivationEvidence(input());
  assert.equal(report.rendererResult, POST_ACTIVATION_RENDERER_RESULT);
  assert.equal(
    report.sourceActivationAttempt,
    sourceContract.activationAttempt,
  );
  assert.equal(report.sourceActivationRun, sourceContract.activationRun);
  assert.equal(
    report.sourceActivationMainSha,
    sourceContract.activationMainSha,
  );
  assert.equal(report.historicalArtifactSelected, false);
  assert.equal(report.flag, sourceContract.expectedRuntime.flag);
  assert.equal(report.publicState, sourceContract.expectedSnapshot.publicState);

  const directory = await mkdtemp(
    path.join(tmpdir(), "comun-post-activation-renderer-"),
  );
  await writePostActivationEvidence({ outputDirectory: directory, report });
  const output = path.join(
    directory,
    "reports",
    "current",
    "comun-sidewalk-post-activation-renderer-evidence.json",
  );
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), report);
});

test("historical attempt 02 evidence is preserved but never selected as current", () => {
  const onlyHistorical = input({ activationArtifacts: [historicalArtifact()] });
  assert.equal(
    classifyPostActivationEvidence(onlyHistorical),
    POST_ACTIVATION_RENDERER_INSUFFICIENT,
  );
  assert.throws(
    () => createPostActivationEvidence(onlyHistorical),
    /EVIDENCE_SOURCE_MISSING/,
  );
});

test("mixed attempt, run, or SHA evidence fails closed instead of falling back", () => {
  const mixed = currentArtifact();
  mixed.runId = "30391920347";
  assert.equal(
    classifyPostActivationEvidence(input({ activationArtifacts: [mixed] })),
    POST_ACTIVATION_RENDERER_BLOCKED,
  );
  assert.throws(
    () => createPostActivationEvidence(input({ activationArtifacts: [mixed] })),
    /ACTIVATION_SOURCE_CONFLICT/,
  );
});

test("current attempt with disabled flag or paused public state fails closed", () => {
  assert.equal(
    classifyPostActivationEvidence(
      input({
        runtime: { ...sourceContract.expectedRuntime, flag: "disabled" },
      }),
    ),
    POST_ACTIVATION_RENDERER_BLOCKED,
  );
  assert.equal(
    classifyPostActivationEvidence(
      input({
        snapshot: { ...sourceContract.expectedSnapshot, publicState: "paused" },
      }),
    ),
    POST_ACTIVATION_RENDERER_BLOCKED,
  );
});

test("duplicate current evidence is blocked and never selected arbitrarily", () => {
  const incompatibleDuplicate = currentArtifact();
  incompatibleDuplicate.payload.durationSeconds = 178;
  assert.equal(
    classifyPostActivationEvidence(
      input({
        activationArtifacts: [currentArtifact(), incompatibleDuplicate],
      }),
    ),
    POST_ACTIVATION_RENDERER_BLOCKED,
  );
});

test("sanitization rejects connection, token, and URL shaped content", () => {
  assert.throws(
    () =>
      assertSanitizedPostActivationEvidence({
        value: "postgresql://not-allowed",
      }),
    /REPORT_SENSITIVE/,
  );
  assert.throws(
    () =>
      assertSanitizedPostActivationEvidence({
        value: "token: not-allowed",
      }),
    /REPORT_SENSITIVE/,
  );
  assert.throws(
    () =>
      assertSanitizedPostActivationEvidence({ value: "https://not-allowed" }),
    /REPORT_SENSITIVE/,
  );
});

test("versioned renderer source reproduces the attempt 03 evidence package", async () => {
  const source = JSON.parse(
    await readFile(
      "reports/current/comun-sidewalk-post-activation-renderer-source.json",
      "utf8",
    ),
  );
  const report = createPostActivationEvidence(source);
  assert.equal(report.sourceActivationRun, "30454192828");
  assert.equal(report.sourceActivationAttempt, "sidewalk-activate-20260729-03");
  assert.equal(report.historicalArtifactSelected, false);
});

test("canonical migration and manifest hashes remain unchanged by renderer evidence", async () => {
  const hash = async (file) =>
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  assert.equal(
    await hash(
      "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
    ),
    "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  );
  assert.equal(
    await hash(
      "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json",
    ),
    "ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335",
  );
});
