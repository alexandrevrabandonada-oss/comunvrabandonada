import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const RESULT = {
  rls: "COMUN_RLS_COMPLETE_GREEN",
  secrets: "COMUN_SECRETS_BOUNDARY_GREEN",
  databaseRestore: "COMUN_DATABASE_RESTORE_REHEARSAL_GREEN",
  storageRestore: "COMUN_STORAGE_RESTORE_REHEARSAL_GREEN",
  retention: "COMUN_RETENTION_POLICY_GREEN",
  migrationRecovery: "COMUN_MIGRATION_RECOVERY_GREEN",
  deploymentRollback: "COMUN_DEPLOYMENT_ROLLBACK_GREEN",
  incidents: "COMUN_INCIDENT_RESPONSE_REHEARSAL_GREEN",
  ready: "COMUN_SECURITY_RESILIENCE_READY_FOR_ISOLATED_RESTORE_REHEARSAL",
  green: "COMUN_SECURITY_RESILIENCE_GREEN",
};

export const evidenceDir = path.resolve(
  process.env.COMUN_SECURITY_EVIDENCE_DIR || ".security-evidence",
);

export function envelopeDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function syntheticTag(label = "security") {
  return `comun-${label}-${Date.now()}-${randomBytes(6).toString("hex")}`;
}

export function sizeBand(bytes) {
  if (bytes === 0) return "empty";
  if (bytes < 1024 * 1024) return "under_1_mib";
  if (bytes < 10 * 1024 * 1024) return "1_to_10_mib";
  if (bytes < 100 * 1024 * 1024) return "10_to_100_mib";
  if (bytes < 1024 * 1024 * 1024) return "100_mib_to_1_gib";
  return "over_1_gib";
}

export function durationBand(milliseconds) {
  if (milliseconds < 60_000) return "under_1_minute";
  if (milliseconds < 5 * 60_000) return "1_to_5_minutes";
  if (milliseconds < 15 * 60_000) return "5_to_15_minutes";
  if (milliseconds < 60 * 60_000) return "15_to_60_minutes";
  return "over_60_minutes";
}

export function validateRemoteTarget({ databaseUrl, projectRef, allowedRefs }) {
  if (!databaseUrl || !projectRef || !allowedRefs)
    throw new Error("COMUN_SECURITY_REMOTE_TARGET_INCOMPLETE");
  const allowlist = new Set(
    String(allowedRefs)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  if (!allowlist.has(projectRef))
    throw new Error("COMUN_SECURITY_PROJECT_REF_NOT_ALLOWLISTED");
  const url = new URL(databaseUrl);
  const hostMatches =
    url.hostname === `db.${projectRef}.supabase.co` ||
    url.hostname.includes(`.${projectRef}.`);
  if (!hostMatches) throw new Error("COMUN_SECURITY_DATABASE_TARGET_MISMATCH");
  return { target: "verified", mode: "remote_read_only_source" };
}

export function sanitizedError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const marker = message.match(/COMUN_[A-Z0-9_:.-]+/)?.[0];
  return marker || "COMUN_SECURITY_STEP_FAILED";
}

export async function writeEvidence(name, body) {
  await mkdir(evidenceDir, { recursive: true });
  const sanitized = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    ...body,
  };
  await writeFile(
    path.join(evidenceDir, name),
    `${JSON.stringify(sanitized, null, 2)}\n`,
    { mode: 0o600 },
  );
  return sanitized;
}

export async function writeFailureEvidence(step, error) {
  return writeEvidence("00-failure.json", {
    status: "blocked",
    step,
    marker: sanitizedError(error),
    containsPrivateData: false,
    containsSecretMaterial: false,
  });
}
