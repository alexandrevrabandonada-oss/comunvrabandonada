const R4 = "20260925014131";
const DIVERGED = Object.freeze({ state: "DIVERGED", action: "BLOCK" });

export function classifyR4Release(capture, manifest, baseline) {
  if (
    !capture ||
    !manifest ||
    !baseline ||
    capture.postgresVersion !== manifest.postgresVersion ||
    capture.blockingFindings !== 0 ||
    capture.hardeningLedger !== "PRESENT_ACCEPTED" ||
    capture.r12Ledger !== "PRESENT_ACCEPTED" ||
    capture.r3Ledger !== "PRESENT_ACCEPTED" ||
    capture.publicCollectiveRelationCount !== 0 ||
    capture.candidateTablePresent !== true ||
    capture.candidateBridgePresent !== true ||
    capture.r3TriggerCount !== 4 ||
    !Array.isArray(capture.migrations) ||
    !Array.isArray(baseline.migrations) ||
    baseline.sourceMainSha !== manifest.sourceMainSha ||
    baseline.runnerFingerprint !== manifest.expectedPreFingerprint ||
    baseline.canonicalFingerprint !== manifest.expectedPreCanonicalFingerprint ||
    capture.migrations.filter((version) => version === R4).length > 1
  )
    return DIVERGED;

  const pre =
    JSON.stringify(capture.migrations) === JSON.stringify(baseline.migrations) &&
    capture.runnerFingerprint === manifest.expectedPreFingerprint &&
    capture.canonicalFingerprint === manifest.expectedPreCanonicalFingerprint &&
    capture.r4Present === false &&
    capture.r4ReviewTablePresent === false &&
    capture.r4BridgeCount === 0 &&
    capture.r4ReviewTriggerCount === 0 &&
    capture.r4LedgerState === "ABSENT";
  if (pre) return { state: "PRE", action: "APPLY_R4" };

  const postSchema =
    JSON.stringify(capture.migrations) ===
      JSON.stringify([...baseline.migrations, R4]) &&
    capture.runnerFingerprint === manifest.expectedPostFingerprint &&
    capture.canonicalFingerprint === manifest.expectedPostCanonicalFingerprint &&
    capture.r4Present === true &&
    capture.r4ReviewTablePresent === true &&
    capture.r4BridgeCount === 3 &&
    capture.r4ReviewTriggerCount === 1;
  if (!postSchema) return DIVERGED;
  if (capture.r4LedgerState === "ABSENT")
    return { state: "POST_PENDING_LEDGER", action: "VERIFY_AND_RECORD_LEDGER" };
  if (capture.r4LedgerState === "PRESENT_ACCEPTED")
    return { state: "POST", action: "ALREADY_APPLIED" };
  return DIVERGED;
}
