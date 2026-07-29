import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const attemptPattern = /^sidewalk-db-env-[0-9]{8}-[0-9]{2}$/;
const canonicalProjectId = "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X";
const forbiddenArtifactPatterns = [
  /postgres(?:ql)?:\/\//i,
  /\b(?:token|password|authorization|cookie|service[_ -]?role)\b/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /https?:\/\//i,
  /(?:^|[\\/])(?:tmp|var|home|users)(?:[\\/]|$)/i,
  /(?:dsn|connection string|private_notes|object_key|exact_latitude|exact_longitude)/i,
];

function optionValue(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

function safeSha(value) {
  if (!/^[0-9a-f]{7,64}$/i.test(value ?? "")) {
    throw new Error("COMUN_DATABASE_ENV_RESULT_MAIN_SHA_INVALID");
  }
  return value;
}

function safeRunId(value) {
  if (!/^[0-9]+$/.test(value ?? "")) {
    throw new Error("COMUN_DATABASE_ENV_RESULT_RUN_ID_INVALID");
  }
  return value;
}

function safeDuration(value) {
  const duration = Number(value ?? 0);
  if (!Number.isInteger(duration) || duration < 0) {
    throw new Error("COMUN_DATABASE_ENV_RESULT_DURATION_INVALID");
  }
  return duration;
}

export function validateConfigurationAttemptId(attemptId) {
  if (!attemptPattern.test(attemptId ?? "")) {
    throw new Error("COMUN_DATABASE_ENV_CONFIGURATION_ATTEMPT_ID_INVALID");
  }
  return attemptId;
}

export function buildDatabaseUrlConfigurationAuthorization({
  projectId,
  mainSha,
  ledgerHash,
  configurationAttemptId,
}) {
  if (projectId !== canonicalProjectId) {
    throw new Error("COMUN_DATABASE_ENV_CONFIGURATION_PROJECT_INVALID");
  }
  safeSha(mainSha);
  if (!/^[0-9a-f]{64}$/i.test(ledgerHash ?? "")) {
    throw new Error("COMUN_DATABASE_ENV_CONFIGURATION_LEDGER_INVALID");
  }
  validateConfigurationAttemptId(configurationAttemptId);
  return `AUTORIZO_CONFIGURAR_CALCADAS_DATABASE_URL_${projectId}_${mainSha}_${ledgerHash}_${configurationAttemptId}_MANTER_FLAG_DISABLED`;
}

export function findSensitiveDatabaseEnvArtifactFindings(text) {
  const value = String(text ?? "");
  return forbiddenArtifactPatterns
    .filter((pattern) => pattern.test(value))
    .map((pattern) => pattern.source);
}

export function assertSanitizedDatabaseEnvArtifact(files) {
  for (const [name, content] of Object.entries(files)) {
    if (findSensitiveDatabaseEnvArtifactFindings(content).length) {
      throw new Error(
        `COMUN_DATABASE_ENV_CONFIGURATION_ARTIFACT_SENSITIVE:${name}`,
      );
    }
  }
}

function parseEvents(raw) {
  return String(raw ?? "")
    .split(/\r?\n/)
    .map((line) => /^(marker|state)=([A-Z0-9_]+)$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => ({ type: match[1], value: match[2] }));
}

function hasState(events, value) {
  return events.some(
    (event) => event.type === "state" && event.value === value,
  );
}

function hasMarker(events, value) {
  return events.some(
    (event) => event.type === "marker" && event.value === value,
  );
}

export function createDatabaseEnvConfigurationResult({
  events,
  expectedMainSha,
  runId,
  configurationAttemptId,
  durationSeconds,
}) {
  const configured = hasState(events, "DATABASE_ENV_CONFIGURED");
  const deploymentReady = hasState(events, "DEPLOYMENT_READY");
  const databaseReachable = hasState(events, "DATABASE_REACHABLE");
  const ledgerExact = hasState(events, "LEDGER_EXACT");
  const flagDisabled = hasState(events, "FLAG_DISABLED_CONFIRMED");
  const publicPaused = hasState(events, "PUBLIC_PAUSED_CONFIRMED");
  const green =
    hasState(events, "CONFIGURATION_GREEN") &&
    configured &&
    deploymentReady &&
    databaseReachable &&
    ledgerExact &&
    flagDisabled &&
    publicPaused;
  const rollbackAttempted = hasState(events, "ROLLBACK_ATTEMPTED");
  const rollbackResult = hasMarker(events, "SOLO_DATABASE_ENV_ROLLBACK_FAILED")
    ? "incomplete"
    : rollbackAttempted
      ? "completed"
      : "not_required";
  const terminalMarker = green
    ? "COMUN_SIDEWALK_DATABASE_ENV_CONFIGURED_RUNTIME_GREEN_FLAG_DISABLED"
    : rollbackResult === "incomplete"
      ? "COMUN_SIDEWALK_DATABASE_ENV_CONFIGURATION_FAILED_ROLLBACK_INCOMPLETE"
      : "COMUN_SIDEWALK_DATABASE_ENV_CONFIGURATION_FAILED_ROLLED_BACK";

  return {
    formatVersion: 1,
    configurationAttemptId: validateConfigurationAttemptId(
      configurationAttemptId,
    ),
    expectedMainSha: safeSha(expectedMainSha),
    runId: safeRunId(runId),
    variableConfigured: configured,
    deploymentReady,
    databaseReachable,
    ledgerExact,
    flagDisabled,
    publicPaused,
    rollbackAttempted,
    rollbackResult,
    durationSeconds: safeDuration(durationSeconds),
    databaseWrites: "none",
    storageWrites: "none",
    terminalMarker,
  };
}

export function renderDatabaseEnvConfigurationMarkdown(result) {
  return [
    "# COMUN sidewalk database environment configuration result",
    "",
    `- terminal_marker: ${result.terminalMarker}`,
    `- configuration_attempt_id: ${result.configurationAttemptId}`,
    `- expected_main_sha: ${result.expectedMainSha}`,
    `- run_id: ${result.runId}`,
    `- variable_configured: ${result.variableConfigured}`,
    `- deployment_ready: ${result.deploymentReady}`,
    `- database_reachable: ${result.databaseReachable}`,
    `- ledger_exact: ${result.ledgerExact}`,
    `- flag_disabled: ${result.flagDisabled}`,
    `- public_paused: ${result.publicPaused}`,
    `- rollback_attempted: ${result.rollbackAttempted}`,
    `- rollback_result: ${result.rollbackResult}`,
    `- duration_seconds: ${result.durationSeconds}`,
    "- database_writes: none",
    "- storage_writes: none",
    "",
  ].join("\n");
}

export async function writeDatabaseEnvConfigurationArtifact({
  eventFile,
  outputDirectory,
  expectedMainSha,
  runId,
  configurationAttemptId,
  durationSeconds,
}) {
  const result = createDatabaseEnvConfigurationResult({
    events: parseEvents(await readFile(eventFile, "utf8")),
    expectedMainSha,
    runId,
    configurationAttemptId,
    durationSeconds,
  });
  const files = {
    "configuration-result.json": `${JSON.stringify(result, null, 2)}\n`,
    "configuration-result.md": renderDatabaseEnvConfigurationMarkdown(result),
    "sanitization-report.json": `${JSON.stringify(
      {
        formatVersion: 1,
        sanitized: true,
        files: ["configuration-result.json", "configuration-result.md"],
        findings: [],
      },
      null,
      2,
    )}\n`,
  };
  assertSanitizedDatabaseEnvArtifact(files);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(path.join(outputDirectory, name), content, "utf8"),
    ),
  );
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await writeDatabaseEnvConfigurationArtifact({
    eventFile: optionValue(argv, "--events"),
    outputDirectory: optionValue(argv, "--output-dir"),
    expectedMainSha: optionValue(argv, "--expected-main-sha"),
    runId: optionValue(argv, "--run-id"),
    configurationAttemptId: optionValue(argv, "--configuration-attempt-id"),
    durationSeconds: optionValue(argv, "--duration-seconds"),
  });
  process.stdout.write(
    `${result.terminalMarker} main_sha=${result.expectedMainSha} configuration_attempt_id=${result.configurationAttemptId} variable_configured=${result.variableConfigured} deployment_ready=${result.deploymentReady} database_reachable=${result.databaseReachable} ledger_exact=${result.ledgerExact} flag_disabled=${result.flagDisabled} public_paused=${result.publicPaused} rollback_result=${result.rollbackResult} duration_seconds=${result.durationSeconds}\n`,
  );
}

if (process.argv[1]?.endsWith("database-env-configuration-result.mjs")) {
  await main();
}
