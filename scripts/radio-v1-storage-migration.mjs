import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RADIO_V1_STORAGE_MIGRATION_VERSION = "20260730213205";
export const RADIO_V1_STORAGE_MIGRATION_PATH =
  "supabase/migrations/20260730213205_radio_v1_free_storage_profile.sql";

export async function radioV1StorageMigrationSha256() {
  return createHash("sha256")
    .update(await readFile(RADIO_V1_STORAGE_MIGRATION_PATH))
    .digest("hex");
}

export function validateRadioV1StorageMigrationSql(sql) {
  const normalized = String(sql);
  const forbidden =
    /\b(drop|truncate|delete|alter\s+table|create\s+table|grant|revoke)\b/i;
  if (forbidden.test(normalized)) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_SCOPE_BLOCKED");
  }
  for (const required of [
    "insert into storage.buckets",
    "'radio-private-originals'",
    "'radio-public-audio'",
    "47185920",
    "on conflict (id) do update",
    "storage.buckets.id in",
  ]) {
    if (!normalized.toLowerCase().includes(required.toLowerCase())) {
      throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_CONTRACT_INVALID");
    }
  }
  const bucketNames = [...normalized.matchAll(/'(radio-[a-z-]+)'/g)].map(
    (match) => match[1],
  );
  if (
    bucketNames.some(
      (bucket) =>
        bucket !== "radio-private-originals" && bucket !== "radio-public-audio",
    )
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_SCOPE_BLOCKED");
  }
  return true;
}

export function verifyRadioV1SupabasePushPlan(plan) {
  const versions = [
    ...new Set(
      [...String(plan).matchAll(/(?<!\d)(20\d{12})(?!\d)/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
  if (
    versions.length !== 1 ||
    versions[0] !== RADIO_V1_STORAGE_MIGRATION_VERSION
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_UNEXPECTED_MIGRATION_PLAN");
  }
  if (/\b(drop|truncate|delete)\b/i.test(String(plan))) {
    throw new Error("COMUN_RADIO_V1_STORAGE_DESTRUCTIVE_PLAN_BLOCKED");
  }
  return true;
}

export function validateRadioV1AuditPlan(artifact, expectedPlanHash) {
  const plan = artifact?.radioStorageMigrationPlan;
  if (
    plan?.exact !== true ||
    plan.marker !== "COMUN_RADIO_V1_STORAGE_MIGRATION_PLAN_EXACT" ||
    plan.planHash !== expectedPlanHash ||
    artifact?.target?.verified !== true ||
    artifact?.storage?.policyEvidence?.policiesGreen !== true ||
    JSON.stringify(artifact?.storage?.missingBuckets) !==
      JSON.stringify(["radio-private-originals", "radio-public-audio"]) ||
    artifact?.storage?.incompatibleBuckets?.length !== 0
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_REMOTE_PLAN_BLOCKED");
  }
  return true;
}

export function assertRadioV1MigrationArtifactSanitized(artifact) {
  const serialized = JSON.stringify(artifact);
  if (
    /(postgres(?:ql)?:\/\/|supabase\.co|bearer\s+|authorization|cookie|password|service_role|eyJ[a-zA-Z0-9_-]{10,})/i.test(
      serialized,
    )
  ) {
    throw new Error("COMUN_RADIO_V1_STORAGE_ARTIFACT_NOT_SANITIZED");
  }
  return true;
}

async function main() {
  const auditIndex = process.argv.indexOf("--audit");
  const dryRunIndex = process.argv.indexOf("--dry-run");
  const outputIndex = process.argv.indexOf("--output");
  if (auditIndex < 0 || dryRunIndex < 0 || outputIndex < 0) {
    throw new Error("COMUN_RADIO_V1_STORAGE_MIGRATION_INPUT_REQUIRED");
  }
  const expectedPlanHash = String(
    process.env.COMUN_CULTURAL_EXPECTED_PLAN_HASH ?? "",
  );
  if (!/^[a-f0-9]{64}$/.test(expectedPlanHash)) {
    throw new Error("COMUN_RADIO_V1_STORAGE_PLAN_HASH_INVALID");
  }
  const [audit, dryRun, sql] = await Promise.all([
    readFile(process.argv[auditIndex + 1], "utf8").then(JSON.parse),
    readFile(process.argv[dryRunIndex + 1], "utf8"),
    readFile(RADIO_V1_STORAGE_MIGRATION_PATH, "utf8"),
  ]);
  validateRadioV1AuditPlan(audit, expectedPlanHash);
  validateRadioV1StorageMigrationSql(sql);
  verifyRadioV1SupabasePushPlan(dryRun);
  const artifact = {
    formatVersion: 1,
    result: "COMUN_RADIO_V1_STORAGE_MIGRATION_PLAN_GREEN",
    profileId: "comun-radio-v1-free-storage",
    migrationVersion: RADIO_V1_STORAGE_MIGRATION_VERSION,
    migrationSha256: await radioV1StorageMigrationSha256(),
    planHash: expectedPlanHash,
    buckets: 2,
    maxFileSizeBytes: 47_185_920,
    storageObjectsCreated: 0,
    contentRowsUpdated: 0,
    containsSensitiveData: false,
  };
  assertRadioV1MigrationArtifactSanitized(artifact);
  const output = process.argv[outputIndex + 1];
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${artifact.result}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const marker = String(error?.message ?? "");
    process.stderr.write(
      `${/^COMUN_[A-Z0-9_]+$/.test(marker) ? marker : "COMUN_RADIO_V1_STORAGE_MIGRATION_FAILED"}\n`,
    );
    process.exitCode = 1;
  });
}
