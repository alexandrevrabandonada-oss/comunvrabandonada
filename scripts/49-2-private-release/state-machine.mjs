import { createHash } from "node:crypto";
const R1 = "20260901000000";
const R2 = "20260924015511";

export function classifyPrivateRelease(capture, manifest, baseline) {
  const migrations = capture?.migrations;
  if (
    !Array.isArray(migrations) ||
    !migrations.every((entry) => typeof entry === "string")
  )
    return { state: "DIVERGED", action: "BLOCK" };
  const hasR1 = migrations.includes(R1);
  const hasR2 = migrations.includes(R2);
  const prior = baseline?.migrations;
  const priorHash = Array.isArray(prior)
    ? createHash("sha256").update(JSON.stringify(prior)).digest("hex")
    : null;
  if (
    typeof capture?.runnerFingerprint !== "string" ||
    typeof capture?.canonicalFingerprint !== "string" ||
    !Array.isArray(prior) ||
    priorHash !== manifest?.expectedPreMigrationVersionsSha256 ||
    capture.blockingFindings !== 0 ||
    capture.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    (hasR2 && !hasR1)
  )
    return { state: "DIVERGED", action: "BLOCK" };

  const candidates = [
    {
      state: "PRE",
      action: "APPLY_R1_R2",
      migrationsPresent: [false, false],
      fingerprint: manifest?.expectedPreFingerprint,
      canonicalFingerprint: manifest?.expectedPreCanonicalFingerprint,
      consentObjectCount: 0,
      migrationVersions: prior,
      bundleLedgerState: "ABSENT",
    },
    {
      state: "PARTIAL_R1",
      action: "APPLY_R2",
      migrationsPresent: [true, false],
      fingerprint: manifest?.expectedPartialR1Fingerprint,
      canonicalFingerprint: manifest?.expectedPartialR1CanonicalFingerprint,
      consentObjectCount: 6,
      migrationVersions: [...prior, R1],
      bundleLedgerState: "ABSENT",
    },
    {
      state: "POST_PENDING_LEDGER",
      action: "VERIFY_AND_RECORD_LEDGER",
      migrationsPresent: [true, true],
      fingerprint: manifest?.expectedPostFingerprint,
      canonicalFingerprint: manifest?.expectedPostCanonicalFingerprint,
      consentObjectCount: 6,
      migrationVersions: [...prior, R1, R2],
      bundleLedgerState: "ABSENT",
    },
    {
      state: "POST",
      action: "ALREADY_APPLIED",
      migrationsPresent: [true, true],
      fingerprint: manifest?.expectedPostFingerprint,
      canonicalFingerprint: manifest?.expectedPostCanonicalFingerprint,
      consentObjectCount: 6,
      migrationVersions: [...prior, R1, R2],
      bundleLedgerState: "PRESENT_ACCEPTED",
    },
  ];
  for (const candidate of candidates) {
    if (
      hasR1 === candidate.migrationsPresent[0] &&
      hasR2 === candidate.migrationsPresent[1] &&
      capture.runnerFingerprint === candidate.fingerprint &&
      capture.canonicalFingerprint === candidate.canonicalFingerprint &&
      capture.consentObjectCount === candidate.consentObjectCount &&
      JSON.stringify(migrations) ===
        JSON.stringify(candidate.migrationVersions) &&
      capture.bundleLedgerState === candidate.bundleLedgerState
    )
      return { state: candidate.state, action: candidate.action };
  }
  return { state: "DIVERGED", action: "BLOCK" };
}
