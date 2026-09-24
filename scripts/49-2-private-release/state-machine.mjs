const R1 = "20260901000000";
const R2 = "20260924015511";

export function classifyPrivateRelease(capture, manifest) {
  const migrations = capture?.migrations;
  if (!Array.isArray(migrations) || !migrations.every((entry) => typeof entry === "string"))
    return { state: "DIVERGED", action: "BLOCK" };
  const hasR1 = migrations.includes(R1);
  const hasR2 = migrations.includes(R2);
  if (
    typeof capture?.runnerFingerprint !== "string" ||
    typeof capture?.canonicalFingerprint !== "string" ||
    capture.blockingFindings !== 0 ||
    capture.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    hasR2 && !hasR1
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
    },
    {
      state: "PARTIAL_R1",
      action: "APPLY_R2",
      migrationsPresent: [true, false],
      fingerprint: manifest?.expectedPartialR1Fingerprint,
      canonicalFingerprint: manifest?.expectedPartialR1CanonicalFingerprint,
      consentObjectCount: 8,
    },
    {
      state: "POST",
      action: "ALREADY_APPLIED",
      migrationsPresent: [true, true],
      fingerprint: manifest?.expectedPostFingerprint,
      canonicalFingerprint: manifest?.expectedPostCanonicalFingerprint,
      consentObjectCount: 8,
    },
  ];
  for (const candidate of candidates) {
    if (
      hasR1 === candidate.migrationsPresent[0] &&
      hasR2 === candidate.migrationsPresent[1] &&
      capture.runnerFingerprint === candidate.fingerprint &&
      capture.canonicalFingerprint === candidate.canonicalFingerprint &&
      capture.consentObjectCount === candidate.consentObjectCount
    )
      return { state: candidate.state, action: candidate.action };
  }
  return { state: "DIVERGED", action: "BLOCK" };
}
