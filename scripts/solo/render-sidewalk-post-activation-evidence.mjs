import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const POST_ACTIVATION_RENDERER_RESULT =
  "COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_CORRECTED_RUNTIME_UNCHANGED";
export const POST_ACTIVATION_RENDERER_BLOCKED =
  "COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_CORRECTION_BLOCKED";
export const POST_ACTIVATION_RENDERER_INSUFFICIENT =
  "COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_CORRECTION_INSUFFICIENT_EVIDENCE";

const forbidden = [
  /postgres(?:ql)?:\/\//i,
  /https?:\/\//i,
  /\b(?:password|token|authorization|cookie|service[_ -]?role(?:[_ -]?(?:key|token))?)\s*(?:=|:)\s*\S+/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /(?:vercel\.app|supabase\.co)/i,
  /(?:\bdsn\b|connection string|private_notes|object_key|exact_latitude|exact_longitude)/i,
];

const inventoryKeys = [
  "flagKeyPresent",
  "flagTargetsProduction",
  "databaseUrlKeyPresent",
  "databaseUrlTargetsProduction",
  "publicSupabaseUrlPresent",
  "serviceRoleKeyPresent",
];
const runtimeKeys = [
  "formatVersion",
  "flag",
  "databaseUrl",
  "database",
  "ledger",
  "operationalState",
];
const snapshotKeys = [
  "deploymentState",
  "migrationRequired",
  "migrationExecuted",
  "publicState",
  "mapHttpStatus",
  "contributionInterfaceHttpStatus",
  "contributionSubmitted",
  "databaseWrites",
  "storageWrites",
  "activationExecutedByFix",
  "activationAttempt03Reused",
  "secondActivationDetected",
  "rollbackExecuted",
  "runtimeChangedByFix",
  "deploymentChangedByFix",
  "environmentChangedByFix",
  "attemptConsumptionControl",
  "remotePersistentNonce",
];
const sourceContractKeys = [
  "rendererFixId",
  "evidenceScope",
  "activationRun",
  "activationAttempt",
  "activationMainSha",
  "inventoryRun",
  "protectedDiagnosisRun",
  "expectedInventory",
  "expectedRuntime",
  "expectedSnapshot",
];
const activationPayloadKeys = [
  "formatVersion",
  "attemptId",
  "expectedMainSha",
  "runId",
  "lastGreenPhase",
  "originalFailurePhase",
  "originalFailureMarker",
  "rollbackAttempted",
  "rollbackResult",
  "finalPublicState",
  "durationSeconds",
  "databaseWrites",
  "storageWrites",
  "terminalMarker",
];
const evidenceInputKeys = [
  "sourceContract",
  "activationArtifacts",
  "inventory",
  "runtime",
  "snapshot",
];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return (
    isRecord(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fail(code) {
  throw new Error(`COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_${code}`);
}

function assertSha(value, code) {
  if (!/^[0-9a-f]{40}$/i.test(value ?? "")) fail(code);
  return value;
}

function assertRun(value, code) {
  if (!/^\d+$/.test(value ?? "")) fail(code);
  return value;
}

function assertAttempt(value, code) {
  if (!/^sidewalk-activate-\d{8}-\d{2}$/.test(value ?? "")) fail(code);
  return value;
}

function assertSanitized(value, code) {
  const serialized = JSON.stringify(value);
  if (forbidden.some((pattern) => pattern.test(serialized))) fail(code);
  return value;
}

function assertInventory(inventory) {
  if (
    !hasExactKeys(inventory, inventoryKeys) ||
    !inventoryKeys.every((key) => typeof inventory[key] === "boolean")
  ) {
    fail("INVENTORY_INVALID");
  }
  return inventory;
}

function assertRuntime(runtime) {
  if (
    !hasExactKeys(runtime, runtimeKeys) ||
    runtime.formatVersion !== 1 ||
    !runtimeKeys.slice(1).every((key) => typeof runtime[key] === "string")
  ) {
    fail("RUNTIME_INVALID");
  }
  return runtime;
}

function assertSnapshot(snapshot) {
  if (!hasExactKeys(snapshot, snapshotKeys)) fail("SNAPSHOT_INVALID");
  return snapshot;
}

function assertSourceContract(sourceContract) {
  if (!isRecord(sourceContract)) fail("SOURCE_CONTRACT_INVALID");
  if (!hasExactKeys(sourceContract, sourceContractKeys)) {
    fail("SOURCE_CONTRACT_INVALID");
  }
  if (
    sourceContract.evidenceScope !== "current_post_activation" ||
    typeof sourceContract.rendererFixId !== "string" ||
    sourceContract.rendererFixId.length === 0
  ) {
    fail("SOURCE_CONTRACT_INVALID");
  }
  assertRun(sourceContract.activationRun, "ACTIVATION_RUN_INVALID");
  assertAttempt(sourceContract.activationAttempt, "ACTIVATION_ATTEMPT_INVALID");
  assertSha(sourceContract.activationMainSha, "ACTIVATION_SHA_INVALID");
  assertRun(sourceContract.inventoryRun, "INVENTORY_RUN_INVALID");
  assertRun(sourceContract.protectedDiagnosisRun, "DIAGNOSTIC_RUN_INVALID");
  assertInventory(sourceContract.expectedInventory);
  assertRuntime(sourceContract.expectedRuntime);
  assertSnapshot(sourceContract.expectedSnapshot);
  return sourceContract;
}

function assertActivationCandidate(candidate) {
  const keys = [
    "artifactType",
    "evidenceScope",
    "runId",
    "attemptId",
    "mainSha",
    "payload",
  ];
  if (!hasExactKeys(candidate, keys)) fail("ACTIVATION_ARTIFACT_INVALID");
  if (candidate.artifactType !== "comun-sidewalk-activation-result") {
    fail("ACTIVATION_ARTIFACT_TYPE_INVALID");
  }
  if (
    candidate.evidenceScope !== "current_post_activation" &&
    candidate.evidenceScope !== "historical"
  ) {
    fail("ACTIVATION_ARTIFACT_SCOPE_INVALID");
  }
  assertRun(candidate.runId, "ACTIVATION_RUN_INVALID");
  assertAttempt(candidate.attemptId, "ACTIVATION_ATTEMPT_INVALID");
  assertSha(candidate.mainSha, "ACTIVATION_SHA_INVALID");
  if (!hasExactKeys(candidate.payload, activationPayloadKeys)) {
    fail("ACTIVATION_ARTIFACT_INVALID");
  }
  return candidate;
}

function candidateMatchesSource(candidate, sourceContract) {
  return (
    candidate.evidenceScope === "current_post_activation" &&
    candidate.runId === sourceContract.activationRun &&
    candidate.attemptId === sourceContract.activationAttempt &&
    candidate.mainSha === sourceContract.activationMainSha
  );
}

function candidatePartiallyMatchesSource(candidate, sourceContract) {
  const fields = [
    [candidate.runId, sourceContract.activationRun],
    [candidate.attemptId, sourceContract.activationAttempt],
    [candidate.mainSha, sourceContract.activationMainSha],
  ];
  const matches = fields.filter(
    ([actual, expected]) => actual === expected,
  ).length;
  return matches > 0 && matches < fields.length;
}

export function selectCurrentActivationArtifact({
  sourceContract,
  candidates,
}) {
  assertSourceContract(sourceContract);
  if (!Array.isArray(candidates)) fail("ACTIVATION_ARTIFACTS_INVALID");
  const checked = candidates.map(assertActivationCandidate);
  if (
    checked.some((candidate) =>
      candidatePartiallyMatchesSource(candidate, sourceContract),
    )
  ) {
    fail("ACTIVATION_SOURCE_CONFLICT");
  }
  const current = checked.filter((candidate) =>
    candidateMatchesSource(candidate, sourceContract),
  );
  if (current.length === 0) fail("EVIDENCE_SOURCE_MISSING");
  if (current.length !== 1) fail("ACTIVATION_SOURCE_AMBIGUOUS");
  return { candidate: current[0] };
}

function assertActivationPayload(candidate, sourceContract) {
  const { payload } = candidate;
  if (
    payload.attemptId !== candidate.attemptId ||
    payload.runId !== candidate.runId ||
    payload.expectedMainSha !== candidate.mainSha
  ) {
    fail("ACTIVATION_PAYLOAD_SOURCE_CONFLICT");
  }
  if (
    payload.terminalMarker !== "COMUN_SIDEWALK_ACTIVATION_GREEN" ||
    payload.finalPublicState !== sourceContract.expectedSnapshot.publicState ||
    payload.databaseWrites !== sourceContract.expectedSnapshot.databaseWrites ||
    payload.storageWrites !== sourceContract.expectedSnapshot.storageWrites ||
    payload.rollbackAttempted !==
      sourceContract.expectedSnapshot.rollbackExecuted
  ) {
    fail("ACTIVATION_PAYLOAD_RUNTIME_CONFLICT");
  }
  return payload;
}

function assertExpectedEvidence({
  sourceContract,
  inventory,
  runtime,
  snapshot,
}) {
  assertInventory(inventory);
  assertRuntime(runtime);
  assertSnapshot(snapshot);
  if (!sameJson(inventory, sourceContract.expectedInventory)) {
    fail("INVENTORY_CONFLICT");
  }
  if (!sameJson(runtime, sourceContract.expectedRuntime)) {
    fail("RUNTIME_CONFLICT");
  }
  if (!sameJson(snapshot, sourceContract.expectedSnapshot)) {
    fail("SNAPSHOT_CONFLICT");
  }
}

export function createPostActivationEvidence(input) {
  assertSanitized(input, "SOURCE_SENSITIVE");
  if (!hasExactKeys(input, evidenceInputKeys)) fail("SOURCE_INPUT_INVALID");
  const { sourceContract, activationArtifacts, inventory, runtime, snapshot } =
    input;
  assertSourceContract(sourceContract);
  assertExpectedEvidence({ sourceContract, inventory, runtime, snapshot });
  const { candidate } = selectCurrentActivationArtifact({
    sourceContract,
    candidates: activationArtifacts,
  });
  assertActivationPayload(candidate, sourceContract);
  const report = {
    formatVersion: 1,
    rendererFixId: sourceContract.rendererFixId,
    rendererSchemaVersion: 1,
    evidenceScope: sourceContract.evidenceScope,
    sourceActivationRun: sourceContract.activationRun,
    sourceActivationAttempt: sourceContract.activationAttempt,
    sourceActivationMainSha: sourceContract.activationMainSha,
    sourceInventoryRun: sourceContract.inventoryRun,
    sourceProtectedDiagnosisRun: sourceContract.protectedDiagnosisRun,
    deploymentState: snapshot.deploymentState,
    database: runtime.database,
    ledger: runtime.ledger,
    migrationRequired: snapshot.migrationRequired,
    migrationExecuted: snapshot.migrationExecuted,
    flag: runtime.flag,
    operationalState: runtime.operationalState,
    publicState: snapshot.publicState,
    mapHttpStatus: snapshot.mapHttpStatus,
    contributionInterfaceHttpStatus: snapshot.contributionInterfaceHttpStatus,
    contributionSubmitted: snapshot.contributionSubmitted,
    databaseWrites: snapshot.databaseWrites,
    storageWrites: snapshot.storageWrites,
    activationExecutedByFix: snapshot.activationExecutedByFix,
    activationAttempt03Reused: snapshot.activationAttempt03Reused,
    secondActivationDetected: snapshot.secondActivationDetected,
    rollbackExecuted: snapshot.rollbackExecuted,
    runtimeChangedByFix: snapshot.runtimeChangedByFix,
    deploymentChangedByFix: snapshot.deploymentChangedByFix,
    environmentChangedByFix: snapshot.environmentChangedByFix,
    attemptConsumptionControl: snapshot.attemptConsumptionControl,
    remotePersistentNonce: snapshot.remotePersistentNonce,
    historicalArtifactSelected: false,
    rendererValidation: "passed",
    rendererResult: POST_ACTIVATION_RENDERER_RESULT,
  };
  return assertSanitized(report, "REPORT_SENSITIVE");
}

export function classifyPostActivationEvidence(input) {
  try {
    createPostActivationEvidence(input);
    return POST_ACTIVATION_RENDERER_RESULT;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_EVIDENCE_SOURCE_MISSING"
    ) {
      return POST_ACTIVATION_RENDERER_INSUFFICIENT;
    }
    return POST_ACTIVATION_RENDERER_BLOCKED;
  }
}

export function assertSanitizedPostActivationEvidence(report) {
  return assertSanitized(report, "REPORT_SENSITIVE");
}

function markdown(report) {
  return [
    "# Tijolo 45.5 — renderer de evidências pós-ativação",
    "",
    `- renderer_fix_id: ${report.rendererFixId}`,
    `- source_activation_run: ${report.sourceActivationRun}`,
    `- source_activation_attempt: ${report.sourceActivationAttempt}`,
    `- source_activation_main_sha: ${report.sourceActivationMainSha}`,
    `- source_inventory_run: ${report.sourceInventoryRun}`,
    `- source_protected_diagnosis_run: ${report.sourceProtectedDiagnosisRun}`,
    `- evidence_scope: ${report.evidenceScope}`,
    `- deployment_state: ${report.deploymentState}`,
    `- database: ${report.database}`,
    `- ledger: ${report.ledger}`,
    `- flag: ${report.flag}`,
    `- operational_state: ${report.operationalState}`,
    `- public_state: ${report.publicState}`,
    `- historical_artifact_selected: false`,
    `- renderer_result: ${report.rendererResult}`,
    "",
    "O pacote legado do attempt 02 permanece apenas como evidência histórica e não foi usado para o estado atual.",
    "",
  ].join("\n");
}

export async function writePostActivationEvidence({ outputDirectory, report }) {
  assertSanitizedPostActivationEvidence(report);
  const reportDirectory = path.resolve(outputDirectory, "reports", "current");
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(
        reportDirectory,
        "comun-sidewalk-post-activation-renderer-evidence.json",
      ),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(
        reportDirectory,
        "comun-sidewalk-post-activation-renderer-evidence.md",
      ),
      markdown(report),
      "utf8",
    ),
  ]);
}

function optionValue(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

async function main() {
  const sourcePath = optionValue(process.argv.slice(2), "--source");
  const outputDirectory = optionValue(
    process.argv.slice(2),
    "--output-directory",
  );
  if (!sourcePath || !outputDirectory) fail("ARGUMENTS_INVALID");
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const report = createPostActivationEvidence(source);
  await writePostActivationEvidence({ outputDirectory, report });
  console.log("COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_SANITIZED");
}

if (process.argv[1]?.endsWith("render-sidewalk-post-activation-evidence.mjs")) {
  await main();
}
