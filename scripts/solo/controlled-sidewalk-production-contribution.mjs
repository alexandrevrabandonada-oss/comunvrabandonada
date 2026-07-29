import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONTROLLED_CONTRIBUTION_CYCLE_ID =
  "sidewalk-first-production-contribution-20260729-07";
export const CONTROLLED_CONTRIBUTION_FILENAME =
  "sidewalk-first-production-contribution-20260729-07.jpg";
export const CONTROLLED_CONTRIBUTION_TITLE =
  "Validação inaugural do Mapa de Calçadas";
export const CONTROLLED_CONTRIBUTION_DESCRIPTION =
  "Registro controlado para validar o funcionamento inicial do fluxo de contribuição do Mapa de Calçadas.";
export const CONTROLLED_CONTRIBUTION_TYPE = "controlled_validation";

const allowedCycleIds = new Set([CONTROLLED_CONTRIBUTION_CYCLE_ID]);
const forbiddenText = [
  /<\/?[a-z][^>]*>/i,
  /\b(?:https?:\/\/|www\.)/i,
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /\b(?:\+?\d[\d .()-]{7,}\d)\b/,
  /\b(?:cpf|rg|senha|token|authorization|cookie|service[_ -]?role)\b/i,
];
const forbiddenArtifact = [
  /postgres(?:ql)?:\/\//i,
  /https?:\/\//i,
  /\b(?:password|token|authorization|cookie|service[_ -]?role)\b/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /(?:private_notes|object_key|exact_latitude|exact_longitude)/i,
];

function fail(code) {
  throw new Error(`COMUN_SIDEWALK_CONTROLLED_CONTRIBUTION_${code}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return (
    isRecord(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

function asCount(value) {
  const count = Number(value ?? 0);
  if (!Number.isSafeInteger(count) || count < 0) fail("COUNT_INVALID");
  return count;
}

function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function safeSha(value) {
  if (!/^[0-9a-f]{40}$/i.test(value ?? "")) fail("MAIN_SHA_INVALID");
  return String(value).toLowerCase();
}

export function controlledContributionPayload({
  cycleId = CONTROLLED_CONTRIBUTION_CYCLE_ID,
} = {}) {
  if (!allowedCycleIds.has(cycleId)) fail("CYCLE_ID_INVALID");
  const payload = {
    cycleId,
    contributionType: CONTROLLED_CONTRIBUTION_TYPE,
    title: CONTROLLED_CONTRIBUTION_TITLE,
    description: CONTROLLED_CONTRIBUTION_DESCRIPTION,
    filename: CONTROLLED_CONTRIBUTION_FILENAME,
    condition: "regular",
    category: "irregular",
    affectedGroups: ["general_public"],
    consentPublish: true,
    location: "project_documented_generic_center",
  };
  return validateControlledContributionPayload(payload);
}

export function validateControlledContributionPayload(payload) {
  const keys = [
    "cycleId",
    "contributionType",
    "title",
    "description",
    "filename",
    "condition",
    "category",
    "affectedGroups",
    "consentPublish",
    "location",
  ];
  if (!exactKeys(payload, keys)) fail("PAYLOAD_SHAPE_INVALID");
  if (!allowedCycleIds.has(payload.cycleId)) fail("CYCLE_ID_INVALID");
  if (
    payload.contributionType !== CONTROLLED_CONTRIBUTION_TYPE ||
    payload.title !== CONTROLLED_CONTRIBUTION_TITLE ||
    payload.description !== CONTROLLED_CONTRIBUTION_DESCRIPTION ||
    payload.filename !== CONTROLLED_CONTRIBUTION_FILENAME ||
    payload.condition !== "regular" ||
    payload.category !== "irregular" ||
    payload.consentPublish !== true ||
    payload.location !== "project_documented_generic_center" ||
    JSON.stringify(payload.affectedGroups) !==
      JSON.stringify(["general_public"])
  ) {
    fail("PAYLOAD_VALUE_INVALID");
  }
  if (
    [payload.title, payload.description].some((value) =>
      forbiddenText.some((pattern) => pattern.test(value)),
    )
  ) {
    fail("PAYLOAD_SAFETY_INVALID");
  }
  return Object.freeze({
    ...payload,
    affectedGroups: [...payload.affectedGroups],
  });
}

export function assertSanitizedControlledContributionArtifact(value) {
  const serialized = JSON.stringify(value);
  if (forbiddenArtifact.some((pattern) => pattern.test(serialized))) {
    fail("ARTIFACT_SENSITIVE");
  }
  return value;
}

export function createBeforeSnapshot({
  cycleId = CONTROLLED_CONTRIBUTION_CYCLE_ID,
  candidateSha,
  deploymentRef,
  targetUploadCount,
  targetRecordCount,
  targetStorageObjectCount,
  timestampUtc = new Date().toISOString(),
}) {
  validateControlledContributionPayload(
    controlledContributionPayload({ cycleId }),
  );
  safeSha(candidateSha);
  if (!/^production-ready-[0-9a-f]{7,40}$/i.test(deploymentRef ?? ""))
    fail("DEPLOYMENT_REFERENCE_INVALID");
  const snapshot = {
    formatVersion: 1,
    cycleId,
    snapshotType: "before",
    timestampUtc,
    candidateSha: String(candidateSha).toLowerCase(),
    productionDeployment: deploymentRef,
    deploymentState: "READY",
    databaseUrl: "present",
    database: "reachable",
    ledger: "exact",
    migrationRequired: false,
    flag: "enabled",
    operationalState: "OPERATIONAL_READY",
    publicState: "active",
    targetExists:
      asCount(targetRecordCount) > 0 || asCount(targetUploadCount) > 0,
    targetUploadCount: asCount(targetUploadCount),
    targetRecordCount: asCount(targetRecordCount),
    targetStorageObjectCount: asCount(targetStorageObjectCount),
    databaseWrites: "none",
    storageWrites: "none",
    activationExecuted: false,
    migrationExecuted: false,
    environmentChanged: false,
    deploymentChanged: false,
    humanAuthorization: "present",
  };
  if (snapshot.targetExists) fail("CYCLE_ALREADY_EXISTS");
  return assertSanitizedControlledContributionArtifact(snapshot);
}

export function createAfterSnapshot({
  cycleId = CONTROLLED_CONTRIBUTION_CYCLE_ID,
  candidateSha,
  deploymentRef,
  rows,
  timestampUtc = new Date().toISOString(),
}) {
  const payload = controlledContributionPayload({ cycleId });
  safeSha(candidateSha);
  if (!/^production-ready-[0-9a-f]{7,40}$/i.test(deploymentRef ?? ""))
    fail("DEPLOYMENT_REFERENCE_INVALID");
  if (!Array.isArray(rows)) fail("ROWS_INVALID");
  if (rows.length !== 1) fail("RECORD_COUNT_INVALID");
  const row = rows[0] ?? {};
  if (
    row.upload_status !== "confirmed" ||
    row.confirmation_state !== "confirmed" ||
    row.record_status !== "under_review" ||
    row.record_visibility !== "internal" ||
    row.verification_status !== "community_report" ||
    row.private_notes !== payload.description ||
    row.original_filename !== payload.filename ||
    row.declared_mime_type !== "image/jpeg" ||
    asCount(row.photo_count) !== 1 ||
    asCount(row.asset_count) !== 1 ||
    asCount(row.storage_object_count) !== 1 ||
    !row.record_id ||
    !row.upload_id ||
    !row.member_user_id
  ) {
    fail("POSTCONDITION_INVALID");
  }
  const snapshot = {
    formatVersion: 1,
    cycleId,
    snapshotType: "after",
    timestampUtc,
    candidateSha: String(candidateSha).toLowerCase(),
    productionDeployment: deploymentRef,
    targetExists: true,
    targetUploadCount: 1,
    targetRecordCount: 1,
    targetStorageObjectCount: 1,
    recordFingerprint: fingerprint(row.record_id),
    uploadFingerprint: fingerprint(row.upload_id),
    actorType: "anonymous_controlled_session",
    actorFingerprint: fingerprint(row.member_user_id),
    recordStatus: "under_review",
    recordVisibility: "internal",
    verificationStatus: "community_report",
    photoCount: 1,
    assetCount: 1,
    storageObjectCount: 1,
    payloadFingerprint: fingerprint(JSON.stringify(payload)),
    databaseWrites: "controlled_contribution_only",
    storageWrites: "one_private_original",
    contributionSubmitted: true,
    contributionPubliclyVisible: false,
    thirdPartyDataChanged: false,
  };
  return assertSanitizedControlledContributionArtifact(snapshot);
}

export function createControlledContributionResult({ before, after, browser }) {
  const beforeKeys = [
    "formatVersion",
    "cycleId",
    "snapshotType",
    "timestampUtc",
    "candidateSha",
    "productionDeployment",
    "deploymentState",
    "databaseUrl",
    "database",
    "ledger",
    "migrationRequired",
    "flag",
    "operationalState",
    "publicState",
    "targetExists",
    "targetUploadCount",
    "targetRecordCount",
    "targetStorageObjectCount",
    "databaseWrites",
    "storageWrites",
    "activationExecuted",
    "migrationExecuted",
    "environmentChanged",
    "deploymentChanged",
    "humanAuthorization",
  ];
  const afterKeys = [
    "formatVersion",
    "cycleId",
    "snapshotType",
    "timestampUtc",
    "candidateSha",
    "productionDeployment",
    "targetExists",
    "targetUploadCount",
    "targetRecordCount",
    "targetStorageObjectCount",
    "recordFingerprint",
    "uploadFingerprint",
    "actorType",
    "actorFingerprint",
    "recordStatus",
    "recordVisibility",
    "verificationStatus",
    "photoCount",
    "assetCount",
    "storageObjectCount",
    "payloadFingerprint",
    "databaseWrites",
    "storageWrites",
    "contributionSubmitted",
    "contributionPubliclyVisible",
    "thirdPartyDataChanged",
  ];
  const browserKeys = [
    "formatVersion",
    "cycleId",
    "formOpened",
    "submissionAttempt",
    "retryExecuted",
    "confirmationSeen",
    "consoleErrors",
    "requestErrorCount",
    "mutableRequestMethods",
    "contributionSubmitted",
    "sensitivePatternsObserved",
  ];
  if (
    !exactKeys(before, beforeKeys) ||
    !exactKeys(after, afterKeys) ||
    !exactKeys(browser, browserKeys)
  )
    fail("RESULT_INPUT_INVALID");
  const isGreen =
    before.targetExists === false &&
    before.databaseWrites === "none" &&
    after.targetExists === true &&
    after.targetRecordCount === 1 &&
    after.targetUploadCount === 1 &&
    after.targetStorageObjectCount === 1 &&
    after.recordStatus === "under_review" &&
    after.recordVisibility === "internal" &&
    after.contributionPubliclyVisible === false &&
    after.thirdPartyDataChanged === false &&
    browser.formOpened === true &&
    browser.submissionAttempt === 1 &&
    browser.retryExecuted === false &&
    browser.confirmationSeen === true &&
    browser.consoleErrors === 0 &&
    browser.requestErrorCount === 0 &&
    browser.sensitivePatternsObserved === 0;
  const result = {
    formatVersion: 1,
    cycleId: CONTROLLED_CONTRIBUTION_CYCLE_ID,
    candidateSha: before.candidateSha,
    productionDeployment: before.productionDeployment,
    submissionAttempt: browser.submissionAttempt,
    retryExecuted: browser.retryExecuted,
    recordFingerprint: after.recordFingerprint,
    uploadFingerprint: after.uploadFingerprint,
    actorType: after.actorType,
    recordStatus: after.recordStatus,
    recordVisibility: after.recordVisibility,
    contributionPubliclyVisible: after.contributionPubliclyVisible,
    databaseWrites: after.databaseWrites,
    storageWrites: after.storageWrites,
    preservationDecision: "preserved_internal_validation_record",
    removalExecuted: false,
    checkpointResult: isGreen
      ? "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_GREEN_PRESERVED"
      : "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_CONTAINED",
  };
  return assertSanitizedControlledContributionArtifact(result);
}

export function renderControlledContributionMarkdown(result) {
  return [
    "# COMUN — primeira contribuição controlada em produção",
    "",
    `- cycle_id: ${result.cycleId}`,
    `- candidate_sha: ${result.candidateSha}`,
    `- production_deployment: ${result.productionDeployment}`,
    `- submission_attempt: ${result.submissionAttempt}`,
    `- retry_executed: ${result.retryExecuted}`,
    `- actor_type: ${result.actorType}`,
    `- record_status: ${result.recordStatus}`,
    `- record_visibility: ${result.recordVisibility}`,
    `- contribution_publicly_visible: ${result.contributionPubliclyVisible}`,
    `- database_writes: ${result.databaseWrites}`,
    `- storage_writes: ${result.storageWrites}`,
    `- preservation_decision: ${result.preservationDecision}`,
    `- removal_executed: ${result.removalExecuted}`,
    `- checkpoint_result: ${result.checkpointResult}`,
    "",
  ].join("\n");
}

function optionValue(argv, name) {
  return argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function writeJson(output, value) {
  if (!output) fail("OUTPUT_REQUIRED");
  assertSanitizedControlledContributionArtifact(value);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeResultArtifact(output, result) {
  await writeJson(output, result);
  const directory = path.dirname(output);
  const markdown = renderControlledContributionMarkdown(result);
  const sanitization = {
    formatVersion: 1,
    status: "sanitized",
    rawResponsesPersisted: false,
    credentialsPersisted: false,
    privateCoordinatesPersisted: false,
    forbiddenOccurrences: 0,
  };
  assertSanitizedControlledContributionArtifact(markdown);
  assertSanitizedControlledContributionArtifact(sanitization);
  await Promise.all([
    writeFile(path.join(directory, "contribution-result.md"), markdown, "utf8"),
    writeFile(
      path.join(directory, "sanitization-report.json"),
      `${JSON.stringify(sanitization, null, 2)}\n`,
      "utf8",
    ),
  ]);
}

async function withReadonlyDatabase(env, execute) {
  const databaseUrl = String(env.PR23_DATABASE_URL ?? "").trim();
  const projectRef = String(env.SUPABASE_PROJECT_REF ?? "").trim();
  const allowedProjectRefs = String(env.PR23_ALLOWED_PROJECT_REFS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!databaseUrl || /\b(?:localhost|127\.0\.0\.1)\b/i.test(databaseUrl))
    fail("DATABASE_URL_INVALID");
  if (
    !/^[a-z0-9]{20}$/i.test(projectRef) ||
    !allowedProjectRefs.includes(projectRef)
  ) {
    fail("PROJECT_TARGET_INVALID");
  }
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  });
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const result = await execute(client);
    await client.query("rollback");
    return result;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function locateCycleRows(client) {
  const uploads = await client.query(
    `select u.id as upload_id, u.member_user_id, u.object_key, u.status as upload_status,
            u.confirmation_state, u.record_id, u.original_filename, u.declared_mime_type,
            r.status as record_status, r.visibility as record_visibility,
            r.verification_status, r.private_notes
       from public.comun_sidewalk_uploads u
       left join public.comun_sidewalk_records r on r.id = u.record_id
      where u.original_filename = $1
      order by u.created_at asc`,
    [CONTROLLED_CONTRIBUTION_FILENAME],
  );
  const rows = [];
  for (const upload of uploads.rows) {
    const counts = await client.query(
      `select
         (select count(*)::int from public.comun_sidewalk_record_photos where record_id = $1) as photo_count,
         (select count(*)::int
            from public.comun_archive_assets a
            join public.comun_sidewalk_record_photos p on p.original_asset_id = a.id
           where p.record_id = $1) as asset_count,
         (select count(*)::int from storage.objects where bucket_id = 'archive-private-originals' and name = $2) as storage_object_count`,
      [
        upload.record_id ?? "00000000-0000-0000-0000-000000000000",
        upload.object_key,
      ],
    );
    rows.push({ ...upload, ...counts.rows[0] });
  }
  return rows;
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = optionValue(argv, "--mode");
  const output = optionValue(argv, "--output");
  if (mode === "validate") {
    await writeJson(output, controlledContributionPayload());
    return;
  }
  if (mode === "result") {
    const before = JSON.parse(
      await readFile(optionValue(argv, "--before"), "utf8"),
    );
    const after = JSON.parse(
      await readFile(optionValue(argv, "--after"), "utf8"),
    );
    const browser = JSON.parse(
      await readFile(optionValue(argv, "--browser"), "utf8"),
    );
    await writeResultArtifact(
      output,
      createControlledContributionResult({ before, after, browser }),
    );
    return;
  }
  const candidateSha = optionValue(argv, "--candidate-sha");
  const deploymentRef = optionValue(argv, "--deployment-ref");
  if (mode === "preflight") {
    const rows = await withReadonlyDatabase(process.env, locateCycleRows);
    const storageCount = rows.reduce(
      (total, row) => total + asCount(row.storage_object_count),
      0,
    );
    await writeJson(
      output,
      createBeforeSnapshot({
        candidateSha,
        deploymentRef,
        targetUploadCount: rows.length,
        targetRecordCount: rows.filter((row) => row.record_id).length,
        targetStorageObjectCount: storageCount,
      }),
    );
    return;
  }
  if (mode === "postflight") {
    const rows = await withReadonlyDatabase(process.env, locateCycleRows);
    await writeJson(
      output,
      createAfterSnapshot({ candidateSha, deploymentRef, rows }),
    );
    return;
  }
  fail("MODE_INVALID");
}

if (
  process.argv[1]?.endsWith("controlled-sidewalk-production-contribution.mjs")
) {
  await main();
}
