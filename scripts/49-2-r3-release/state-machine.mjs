const R3 = "20260924225210";
const DIVERGED = Object.freeze({ state: "DIVERGED", action: "BLOCK" });

export function classifyR3Release(capture, manifest, baseline) {
  if (!capture || !manifest || !baseline ||
      capture.postgresVersion !== manifest.postgresVersion ||
      capture.blockingFindings !== 0 ||
      capture.hardeningLedger !== "PRESENT_ACCEPTED" ||
      capture.r12Ledger !== "PRESENT_ACCEPTED" ||
      capture.publicCollectiveRelationCount !== 0 ||
      !Array.isArray(capture.migrations) || !Array.isArray(baseline.migrations) ||
      baseline.sourceMainSha !== manifest.sourceMainSha ||
      baseline.runnerFingerprint !== manifest.expectedPreFingerprint ||
      baseline.canonicalFingerprint !== manifest.expectedPreCanonicalFingerprint ||
      capture.migrations.filter((version) => version === R3).length > 1)
    return DIVERGED;

  const pre = JSON.stringify(capture.migrations) === JSON.stringify(baseline.migrations) &&
    capture.runnerFingerprint === manifest.expectedPreFingerprint &&
    capture.canonicalFingerprint === manifest.expectedPreCanonicalFingerprint &&
    capture.r3Present === false && capture.candidateTablePresent === false &&
    capture.candidateBridgePresent === false && capture.r3TriggerCount === 0 &&
    capture.r3LedgerState === "ABSENT";
  if (pre) return { state: "PRE", action: "APPLY_R3" };

  const postSchema = JSON.stringify(capture.migrations) ===
      JSON.stringify([...baseline.migrations, R3]) &&
    capture.runnerFingerprint === manifest.expectedPostFingerprint &&
    capture.canonicalFingerprint === manifest.expectedPostCanonicalFingerprint &&
    capture.r3Present === true && capture.candidateTablePresent === true &&
    capture.candidateBridgePresent === true && capture.r3TriggerCount === 4;
  if (!postSchema) return DIVERGED;
  if (capture.r3LedgerState === "ABSENT")
    return { state: "POST_PENDING_LEDGER", action: "VERIFY_AND_RECORD_LEDGER" };
  if (capture.r3LedgerState === "PRESENT_ACCEPTED")
    return { state: "POST", action: "ALREADY_APPLIED" };
  return DIVERGED;
}
