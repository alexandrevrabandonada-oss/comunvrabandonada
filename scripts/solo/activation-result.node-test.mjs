import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildActivationAuthorization,
  classifyActivationFailure,
  createActivationResult,
  extractConsumedActivationEvidence,
  findSensitiveArtifactFindings,
  writeActivationResultArtifact,
} from "./activation-result.mjs";

const attemptId = "sidewalk-activate-20260728-02";
const mainSha = "04ff13d45f624dd0109a9587a59e12e31092b0ad";
const ledgerHash =
  "e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793";

function marker(value) {
  return { type: "marker", value };
}

function state(value) {
  return { type: "state", value };
}

test("consumed activation evidence excludes workflow-source marker strings when no summary was published", () => {
  const evidence = extractConsumedActivationEvidence({
    checkRun: {
      conclusion: "failure",
      output: { title: "", summary: "", text: "" },
      details_url: "present-but-never-published",
    },
    jobLog:
      "marker SOLO_ACTIVATION_DEPLOYMENT_COMMAND_FAILED\nProcess completed with exit code 1",
  });

  assert.equal(evidence.checkRunSummary, "absent");
  assert.deepEqual(evidence.sequence, []);
  assert.equal(evidence.exitStatus, 1);
  assert.equal(
    evidence.originalFailurePhase,
    "MONITOR_FAILED_UNKNOWN_SUBPHASE",
  );
  assert.match(evidence.evidenceLimit, /excluded/);
});

test("sanitized summary produces one ordered activation failure phase", () => {
  const phase = classifyActivationFailure([
    state("FLAG_ENABLED"),
    marker("SOLO_ACTIVATION_DEPLOYMENT_CREATED"),
    marker("SOLO_ACTIVATION_DEPLOYMENT_URL_INVALID"),
  ]);
  assert.equal(phase, "DEPLOYMENT_URL_INVALID");
});

test("each known activation marker maps to exactly one original failure phase", () => {
  const cases = [
    ["SOLO_ACTIVATION_FLAG_ENABLE_FAILED", "FLAG_ENABLE_FAILED"],
    ["SOLO_ACTIVATION_DEPLOYMENT_COMMAND_FAILED", "DEPLOYMENT_COMMAND_FAILED"],
    ["SOLO_ACTIVATION_DEPLOYMENT_URL_INVALID", "DEPLOYMENT_URL_INVALID"],
    ["SOLO_ACTIVATION_DEPLOYMENT_NOT_READY", "DEPLOYMENT_NOT_READY"],
    [
      "SOLO_ACTIVATION_DEPLOYMENT_FLAG_NOT_READY",
      "DEPLOYMENT_FLAG_NOT_VISIBLE",
    ],
    ["SOLO_ACTIVATION_ALIAS_PROPAGATION_TIMEOUT", "ALIAS_PROPAGATION_TIMEOUT"],
    ["SOLO_ACTIVATION_FUNCTIONAL_SMOKE_FAILED", "FUNCTIONAL_SMOKE_FAILED"],
    [
      "SOLO_ACTIVATION_MONITOR_FAILED_UNKNOWN_SUBPHASE",
      "MONITOR_FAILED_UNKNOWN_SUBPHASE",
    ],
  ];
  for (const [observed, expected] of cases) {
    assert.equal(classifyActivationFailure([marker(observed)]), expected);
  }
  assert.equal(
    classifyActivationFailure([marker("SOLO_ACTIVATION_ROLLBACK_FAILED")]),
    "ROLLBACK_FAILED",
  );
});

test("rollback failure does not replace the original failure phase", () => {
  const phase = classifyActivationFailure([
    state("FLAG_ENABLED"),
    marker("SOLO_ACTIVATION_DEPLOYMENT_COMMAND_FAILED"),
    marker("SOLO_ACTIVATION_ROLLBACK_FAILED"),
  ]);
  assert.equal(phase, "DEPLOYMENT_COMMAND_FAILED");
});

test("terminal result is unique for green, rollback failure, and unsafe public state", () => {
  const base = {
    expectedMainSha: mainSha,
    runId: "30348219144",
    attemptId,
    durationSeconds: 10,
  };
  assert.equal(
    createActivationResult({
      ...base,
      events: [state("FLAG_ENABLED"), state("ACTIVATION_GREEN")],
    }).terminalMarker,
    "COMUN_SIDEWALK_ACTIVATION_GREEN",
  );
  assert.equal(
    createActivationResult({
      ...base,
      events: [
        state("FLAG_ENABLED"),
        marker("SOLO_ACTIVATION_DEPLOYMENT_COMMAND_FAILED"),
        state("ROLLBACK_ATTEMPTED"),
        marker("SOLO_ACTIVATION_ROLLBACK_FAILED"),
        state("FINAL_PUBLIC_PAUSED"),
      ],
    }).terminalMarker,
    "COMUN_SIDEWALK_ACTIVATION_FAILED_ROLLBACK_INCOMPLETE",
  );
  assert.equal(
    createActivationResult({
      ...base,
      events: [
        marker("SOLO_ACTIVATION_DEPLOYMENT_NOT_READY"),
        state("FINAL_PUBLIC_UNSAFE"),
      ],
    }).terminalMarker,
    "COMUN_SIDEWALK_ACTIVATION_FAILED_FINAL_STATE_UNSAFE",
  );
});

test("activation artifact is always persisted, sanitized, and has no authorization or deployment URL", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "comun-activation-"));
  const eventFile = path.join(root, "events.txt");
  const outputDirectory = path.join(root, "nested", "artifact");
  await writeFile(
    eventFile,
    [
      "state=FLAG_ENABLED",
      "marker=SOLO_ACTIVATION_DEPLOYMENT_NOT_READY",
      "state=ROLLBACK_ATTEMPTED",
      "state=FINAL_PUBLIC_PAUSED",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = await writeActivationResultArtifact({
    eventFile,
    outputDirectory,
    expectedMainSha: mainSha,
    runId: "30348219144",
    attemptId,
    durationSeconds: 42,
  });
  assert.equal(result.rollbackResult, "completed");
  const content = await Promise.all(
    [
      "activation-result.json",
      "activation-result.md",
      "sanitization-report.json",
    ].map((name) => readFile(path.join(outputDirectory, name), "utf8")),
  );
  assert.equal(findSensitiveArtifactFindings(content.join("\n")).length, 0);
  assert.doesNotMatch(content.join("\n"), /AUTORIZO_ATIVAR_CALCADAS/);
  assert.doesNotMatch(content.join("\n"), /https?:\/\//);
});

test("activation authorization requires a valid unique attempt identifier", () => {
  assert.throws(
    () =>
      buildActivationAuthorization({
        projectRef: "nvmdszymrtacfehdynpg",
        mainSha,
        ledgerHash,
        attemptId: "",
      }),
    /COMUN_ACTIVATION_ATTEMPT_ID_INVALID/,
  );
  assert.throws(
    () =>
      buildActivationAuthorization({
        projectRef: "nvmdszymrtacfehdynpg",
        mainSha,
        ledgerHash,
        attemptId: "sidewalk-activate-invalid",
      }),
    /COMUN_ACTIVATION_ATTEMPT_ID_INVALID/,
  );
  const first = buildActivationAuthorization({
    projectRef: "nvmdszymrtacfehdynpg",
    mainSha,
    ledgerHash,
    attemptId,
  });
  const second = buildActivationAuthorization({
    projectRef: "nvmdszymrtacfehdynpg",
    mainSha,
    ledgerHash,
    attemptId: "sidewalk-activate-20260728-03",
  });
  assert.match(first, new RegExp(`${attemptId}$`));
  assert.notEqual(first, second);
});

test("artifact scanner rejects secrets, connection strings, and immutable URLs", () => {
  for (const value of [
    "postgresql://redacted",
    "authorization: redacted",
    "https://immutable.example",
    "service_role",
  ]) {
    assert.notEqual(findSensitiveArtifactFindings(value).length, 0);
  }
});

test("canonical migration and manifest remain byte-identical", async () => {
  const sha256 = async (file) =>
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  assert.equal(
    await sha256(
      "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
    ),
    "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  );
  assert.equal(
    await sha256(
      "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json",
    ),
    "ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335",
  );
});
