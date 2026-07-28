import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const attemptPattern = /^sidewalk-activate-[0-9]{8}-[0-9]{2}$/;
const forbiddenArtifactPatterns = [
  /postgres(?:ql)?:\/\//i,
  /\b(?:token|password|authorization|cookie|service[_ -]?role)\b/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /https?:\/\//i,
  /(?:^|[\\/])(?:tmp|var|home|users)(?:[\\/]|$)/i,
  /(?:dsn|connection string|private_notes|object_key|exact_latitude|exact_longitude)/i,
];

const failurePhaseByMarker = new Map([
  ["SOLO_ACTIVATION_AUTHORIZATION_INVALID", "AUTHORIZATION_INVALID"],
  ["SOLO_ACTIVATION_FLAG_ENABLE_FAILED", "FLAG_ENABLE_FAILED"],
  ["SOLO_ACTIVATION_DEPLOYMENT_COMMAND_FAILED", "DEPLOYMENT_COMMAND_FAILED"],
  ["SOLO_ACTIVATION_DEPLOYMENT_URL_INVALID", "DEPLOYMENT_URL_INVALID"],
  ["SOLO_ACTIVATION_DEPLOYMENT_NOT_READY", "DEPLOYMENT_NOT_READY"],
  ["SOLO_ACTIVATION_DEPLOYMENT_FLAG_NOT_READY", "DEPLOYMENT_FLAG_NOT_VISIBLE"],
  ["SOLO_ACTIVATION_ALIAS_PROPAGATION_TIMEOUT", "ALIAS_PROPAGATION_TIMEOUT"],
  ["SOLO_ACTIVATION_FUNCTIONAL_SMOKE_FAILED", "FUNCTIONAL_SMOKE_FAILED"],
  [
    "SOLO_ACTIVATION_MONITOR_FAILED_UNKNOWN_SUBPHASE",
    "MONITOR_FAILED_UNKNOWN_SUBPHASE",
  ],
]);

const terminalMarkerByPhase = {
  AUTHORIZATION_INVALID: "COMUN_SIDEWALK_ACTIVATION_FAILED_AUTHORIZATION",
  FLAG_ENABLE_FAILED: "COMUN_SIDEWALK_ACTIVATION_FAILED_FLAG_ENABLE",
  DEPLOYMENT_COMMAND_FAILED:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_DEPLOYMENT_COMMAND_ROLLED_BACK",
  DEPLOYMENT_URL_INVALID:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_DEPLOYMENT_URL_ROLLED_BACK",
  DEPLOYMENT_NOT_READY:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_DEPLOYMENT_READINESS_ROLLED_BACK",
  DEPLOYMENT_FLAG_NOT_VISIBLE:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_FLAG_VISIBILITY_ROLLED_BACK",
  ALIAS_PROPAGATION_TIMEOUT:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_ALIAS_PROPAGATION_ROLLED_BACK",
  FUNCTIONAL_SMOKE_FAILED:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_FUNCTIONAL_SMOKE_ROLLED_BACK",
  MONITOR_FAILED_UNKNOWN_SUBPHASE:
    "COMUN_SIDEWALK_ACTIVATION_FAILED_MONITOR_UNKNOWN_ROLLED_BACK",
  ROLLBACK_FAILED: "COMUN_SIDEWALK_ACTIVATION_FAILED_ROLLBACK_INCOMPLETE",
};

function valueAfter(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

function safeSha(value) {
  if (!/^[0-9a-f]{7,64}$/i.test(value ?? ""))
    throw new Error("COMUN_ACTIVATION_RESULT_MAIN_SHA_INVALID");
  return value;
}

function safeRunId(value) {
  if (!/^[0-9]+$/.test(value ?? ""))
    throw new Error("COMUN_ACTIVATION_RESULT_RUN_ID_INVALID");
  return value;
}

function safeDuration(value) {
  const duration = Number(value ?? 0);
  if (!Number.isInteger(duration) || duration < 0)
    throw new Error("COMUN_ACTIVATION_RESULT_DURATION_INVALID");
  return duration;
}

export function validateActivationAttemptId(attemptId) {
  if (!attemptPattern.test(attemptId ?? ""))
    throw new Error("COMUN_ACTIVATION_ATTEMPT_ID_INVALID");
  return attemptId;
}

export function buildActivationAuthorization({
  projectRef,
  mainSha,
  ledgerHash,
  attemptId,
}) {
  if (!/^[a-z0-9]{20}$/i.test(projectRef ?? ""))
    throw new Error("COMUN_ACTIVATION_PROJECT_REF_INVALID");
  safeSha(mainSha);
  if (!/^[0-9a-f]{64}$/i.test(ledgerHash ?? ""))
    throw new Error("COMUN_ACTIVATION_LEDGER_HASH_INVALID");
  validateActivationAttemptId(attemptId);
  return `AUTORIZO_ATIVAR_CALCADAS_${projectRef}_${mainSha}_${ledgerHash}_${attemptId}`;
}

export function findSensitiveArtifactFindings(text) {
  const value = String(text ?? "");
  return forbiddenArtifactPatterns
    .filter((pattern) => pattern.test(value))
    .map((pattern) => pattern.source);
}

export function assertSanitizedArtifact(files) {
  for (const [name, content] of Object.entries(files)) {
    const findings = findSensitiveArtifactFindings(content);
    if (findings.length)
      throw new Error(`COMUN_ACTIVATION_ARTIFACT_SENSITIVE:${name}`);
  }
}

function parseEventLines(raw) {
  const events = [];
  for (const line of String(raw ?? "").split(/\r?\n/)) {
    const match = /^(marker|state)=([A-Z0-9_]+)$/.exec(line.trim());
    if (match) events.push({ type: match[1], value: match[2] });
  }
  return events;
}

export function classifyActivationFailure(events) {
  const markers = events
    .filter((event) => event.type === "marker")
    .map((event) => event.value);

  for (const marker of markers) {
    const phase = failurePhaseByMarker.get(marker);
    if (phase) return phase;
  }
  if (markers.includes("SOLO_ACTIVATION_ROLLBACK_FAILED"))
    return "ROLLBACK_FAILED";
  return "MONITOR_FAILED_UNKNOWN_SUBPHASE";
}

export function lastGreenActivationPhase(events) {
  const states = events
    .filter((event) => event.type === "state")
    .map((event) => event.value);
  const greenStates = [
    "FLAG_DISABLED_INITIAL",
    "FLAG_ENABLED",
    "DEPLOYMENT_CREATED",
    "DEPLOYMENT_READY",
    "DEPLOYMENT_FLAG_VISIBLE",
    "ALIAS_READY",
    "FUNCTIONAL_SMOKE_GREEN",
    "MONITOR_GREEN",
    "ACTIVATION_GREEN",
  ];
  return (
    [...states].reverse().find((state) => greenStates.includes(state)) ?? null
  );
}

export function createActivationResult({
  events,
  expectedMainSha,
  runId,
  attemptId,
  durationSeconds,
}) {
  const markers = events
    .filter((event) => event.type === "marker")
    .map((event) => event.value);
  const states = events
    .filter((event) => event.type === "state")
    .map((event) => event.value);
  const succeeded = states.includes("ACTIVATION_GREEN");
  const finalPublicState = states.includes("FINAL_PUBLIC_UNSAFE")
    ? "unsafe"
    : states.includes("FINAL_PUBLIC_PAUSED") || !succeeded
      ? "paused"
      : "active";
  const rollbackAttempted = states.includes("ROLLBACK_ATTEMPTED");
  const rollbackResult = markers.includes("SOLO_ACTIVATION_ROLLBACK_FAILED")
    ? "incomplete"
    : rollbackAttempted
      ? "completed"
      : "not_required";
  const originalFailurePhase = succeeded
    ? null
    : classifyActivationFailure(events);
  const terminalMarker = succeeded
    ? "COMUN_SIDEWALK_ACTIVATION_GREEN"
    : finalPublicState === "unsafe"
      ? "COMUN_SIDEWALK_ACTIVATION_FAILED_FINAL_STATE_UNSAFE"
      : rollbackResult === "incomplete"
        ? "COMUN_SIDEWALK_ACTIVATION_FAILED_ROLLBACK_INCOMPLETE"
        : terminalMarkerByPhase[originalFailurePhase];

  if (!terminalMarker) throw new Error("COMUN_ACTIVATION_TERMINAL_INVALID");

  return {
    formatVersion: 1,
    attemptId: validateActivationAttemptId(attemptId),
    expectedMainSha: safeSha(expectedMainSha),
    runId: safeRunId(runId),
    lastGreenPhase: lastGreenActivationPhase(events),
    originalFailurePhase,
    originalFailureMarker:
      markers.find((marker) => failurePhaseByMarker.has(marker)) ?? null,
    rollbackAttempted,
    rollbackResult,
    finalPublicState,
    durationSeconds: safeDuration(durationSeconds),
    databaseWrites: "none",
    storageWrites: "none",
    terminalMarker,
  };
}

export function renderActivationResultMarkdown(result) {
  return [
    "# COMUN Sidewalk activation result",
    "",
    `- terminal_marker: ${result.terminalMarker}`,
    `- attempt_id: ${result.attemptId}`,
    `- expected_main_sha: ${result.expectedMainSha}`,
    `- run_id: ${result.runId}`,
    `- last_green_phase: ${result.lastGreenPhase ?? "none"}`,
    `- original_failure_phase: ${result.originalFailurePhase ?? "none"}`,
    `- rollback_attempted: ${result.rollbackAttempted}`,
    `- rollback_result: ${result.rollbackResult}`,
    `- final_public_state: ${result.finalPublicState}`,
    `- duration_seconds: ${result.durationSeconds}`,
    "- database_writes: none",
    "- storage_writes: none",
    "",
  ].join("\n");
}

export async function writeActivationResultArtifact({
  eventFile,
  outputDirectory,
  expectedMainSha,
  runId,
  attemptId,
  durationSeconds,
}) {
  const events = parseEventLines(await readFile(eventFile, "utf8"));
  const result = createActivationResult({
    events,
    expectedMainSha,
    runId,
    attemptId,
    durationSeconds,
  });
  const markdown = renderActivationResultMarkdown(result);
  const report = {
    formatVersion: 1,
    sanitized: true,
    files: ["activation-result.json", "activation-result.md"],
    findings: [],
  };
  const files = {
    "activation-result.json": `${JSON.stringify(result, null, 2)}\n`,
    "activation-result.md": markdown,
    "sanitization-report.json": `${JSON.stringify(report, null, 2)}\n`,
  };
  assertSanitizedArtifact(files);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(path.join(outputDirectory, name), content, "utf8"),
    ),
  );
  return result;
}

function safeSummaryLines(raw) {
  const lines = [];
  for (const line of String(raw ?? "").split(/\r?\n/)) {
    const match =
      /\b((?:COMUN|SOLO)_[A-Z0-9_]+|(?:FLAG|DEPLOYMENT|ALIAS|ROLLBACK)_[A-Z0-9_]+)\b/.exec(
        line,
      );
    if (match) lines.push(match[1]);
  }
  return [...new Set(lines)];
}

export function extractConsumedActivationEvidence({ checkRun, jobLog }) {
  const output = checkRun?.output ?? {};
  const summary = [output.title, output.summary, output.text]
    .filter(Boolean)
    .join("\n");
  const unsafeSummary = findSensitiveArtifactFindings(summary);
  if (unsafeSummary.length)
    throw new Error("COMUN_ACTIVATION_SUMMARY_SENSITIVE");
  const exitMatch = /Process completed with exit code ([0-9]+)/.exec(
    String(jobLog ?? ""),
  );
  const sequence = safeSummaryLines(summary);
  const events = sequence.map((value) => ({
    type:
      value.startsWith("SOLO_") || value.startsWith("COMUN_")
        ? "marker"
        : "state",
    value,
  }));
  const phase = classifyActivationFailure(events);
  return {
    formatVersion: 1,
    conclusion: checkRun?.conclusion ?? "unknown",
    startedAt: checkRun?.started_at ?? null,
    completedAt: checkRun?.completed_at ?? null,
    exitStatus: exitMatch ? Number(exitMatch[1]) : null,
    checkRunSummary: summary ? "present" : "absent",
    detailsUrlPresent: Boolean(checkRun?.details_url),
    sequence,
    lastGreenPhase: lastGreenActivationPhase(events),
    originalFailurePhase: phase,
    evidenceLimit: summary
      ? null
      : "No runtime summary was published; workflow-source marker strings in the log were excluded.",
  };
}

export function renderConsumedActivationEvidenceMarkdown(evidence) {
  return [
    "# COMUN activation failure evidence",
    "",
    `- conclusion: ${evidence.conclusion}`,
    `- check_run_summary: ${evidence.checkRunSummary}`,
    `- exit_status: ${evidence.exitStatus ?? "unknown"}`,
    `- last_green_phase: ${evidence.lastGreenPhase ?? "unknown"}`,
    `- original_failure_phase: ${evidence.originalFailurePhase}`,
    `- evidence_limit: ${evidence.evidenceLimit ?? "none"}`,
    "",
    "## Sanitized sequence",
    "",
    ...(evidence.sequence.length
      ? evidence.sequence.map((item) => `- ${item}`)
      : ["- no runtime markers published"]),
    "",
  ].join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const eventFile = valueAfter(argv, "--events");
  const outputDirectory = valueAfter(argv, "--output-dir");
  if (!outputDirectory)
    throw new Error("COMUN_ACTIVATION_RESULT_OUTPUT_REQUIRED");

  if (eventFile) {
    const result = await writeActivationResultArtifact({
      eventFile,
      outputDirectory,
      expectedMainSha: valueAfter(argv, "--expected-main-sha"),
      runId: valueAfter(argv, "--run-id"),
      attemptId: valueAfter(argv, "--attempt-id"),
      durationSeconds: valueAfter(argv, "--duration-seconds"),
    });
    process.stdout.write(
      `${result.terminalMarker} phase=${result.originalFailurePhase ?? "ACTIVATION"} result=${result.finalPublicState === "active" ? "green" : "failure"} rollback_result=${result.rollbackResult} final_public_state=${result.finalPublicState} duration_seconds=${result.durationSeconds} attempt_id=${result.attemptId} main_sha=${result.expectedMainSha}\n`,
    );
    return;
  }

  const checkRunFile = valueAfter(argv, "--check-run");
  const jobLogFile = valueAfter(argv, "--job-log");
  if (!checkRunFile || !jobLogFile)
    throw new Error("COMUN_ACTIVATION_EVIDENCE_INPUT_REQUIRED");
  const evidence = extractConsumedActivationEvidence({
    checkRun: JSON.parse(await readFile(checkRunFile, "utf8")),
    jobLog: await readFile(jobLogFile, "utf8"),
  });
  const markdown = renderConsumedActivationEvidenceMarkdown(evidence);
  const files = {
    "sanitized-sequence.json": `${JSON.stringify(evidence, null, 2)}\n`,
    "sanitized-sequence.md": markdown,
  };
  assertSanitizedArtifact(files);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(path.join(outputDirectory, name), content, "utf8"),
    ),
  );
}

if (process.argv[1]?.endsWith("activation-result.mjs")) await main();
