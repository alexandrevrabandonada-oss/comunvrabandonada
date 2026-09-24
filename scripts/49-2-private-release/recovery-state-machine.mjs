import { createHash } from "node:crypto";

const R1 = "20260901000000";
const R2 = "20260924015511";
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function classifyPrivateSchemaRecovery(
  capture,
  manifest,
  baseline,
  recovery,
) {
  const migrations = capture?.migrations;
  const prior = baseline?.migrations;
  if (
    !Array.isArray(migrations) ||
    !migrations.every((entry) => typeof entry === "string") ||
    !Array.isArray(prior) ||
    hash(prior) !== manifest?.expectedPreMigrationVersionsSha256 ||
    capture?.postgresVersion !== manifest?.postgresVersion ||
    capture?.blockingFindings !== 0 ||
    capture?.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    capture?.consentObjectCount !== 6
  )
    return { state: "DIVERGED", action: "BLOCK" };

  const partialMigrations = [...prior, R1];
  const postMigrations = [...prior, R1, R2];

  if (
    JSON.stringify(migrations) === JSON.stringify(partialMigrations) &&
    capture.runnerFingerprint === recovery?.partialR1?.runnerFingerprint &&
    capture.canonicalFingerprint === recovery?.partialR1?.canonicalFingerprint &&
    capture.bundleLedgerState === "ABSENT"
  )
    return { state: "PARTIAL_R1_RECOVERY", action: "APPLY_R2" };

  if (
    JSON.stringify(migrations) === JSON.stringify(postMigrations) &&
    capture.runnerFingerprint === recovery?.post?.runnerFingerprint &&
    capture.canonicalFingerprint === recovery?.post?.canonicalFingerprint &&
    capture.bundleLedgerState === "ABSENT"
  )
    return {
      state: "POST_PENDING_LEDGER_RECOVERY",
      action: "RECORD_LEDGER",
    };

  if (
    JSON.stringify(migrations) === JSON.stringify(postMigrations) &&
    capture.runnerFingerprint === recovery?.post?.runnerFingerprint &&
    capture.canonicalFingerprint === recovery?.post?.canonicalFingerprint &&
    capture.bundleLedgerState === "PRESENT_ACCEPTED"
  )
    return { state: "POST_RECOVERY", action: "ALREADY_APPLIED" };

  return { state: "DIVERGED", action: "BLOCK" };
}
