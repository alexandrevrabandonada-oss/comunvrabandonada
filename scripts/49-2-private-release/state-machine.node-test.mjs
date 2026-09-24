import assert from "node:assert/strict";
import test from "node:test";
import { classifyPrivateRelease } from "./state-machine.mjs";

const manifest = {
  expectedPreFingerprint: "pre",
  expectedPreCanonicalFingerprint: "pre-c",
  expectedPartialR1Fingerprint: "partial",
  expectedPartialR1CanonicalFingerprint: "partial-c",
  expectedPostFingerprint: "post",
  expectedPostCanonicalFingerprint: "post-c",
};
const base = {
  blockingFindings: 0,
  releaseLedgerState: "PRESENT_ACCEPTED",
  migrations: ["prior"],
  runnerFingerprint: "pre",
  canonicalFingerprint: "pre-c",
  consentObjectCount: 0,
};
test("private release state machine permits only the exact forward path", () => {
  assert.deepEqual(classifyPrivateRelease(base, manifest), {
    state: "PRE", action: "APPLY_R1_R2",
  });
  const partial = { ...base, migrations: [...base.migrations, "20260901000000"], runnerFingerprint: "partial", canonicalFingerprint: "partial-c", consentObjectCount: 8 };
  assert.deepEqual(classifyPrivateRelease(partial, manifest), {
    state: "PARTIAL_R1", action: "APPLY_R2",
  });
  const post = { ...partial, migrations: [...partial.migrations, "20260924015511"], runnerFingerprint: "post", canonicalFingerprint: "post-c" };
  assert.deepEqual(classifyPrivateRelease(post, manifest), {
    state: "POST", action: "ALREADY_APPLIED",
  });
  for (const changed of [
    { ...base, runnerFingerprint: "drift" },
    { ...base, canonicalFingerprint: "drift" },
    { ...base, blockingFindings: 1 },
    { ...base, consentObjectCount: 1 },
    { ...base, migrations: [...base.migrations, "20260924015511"] },
    { ...partial, runnerFingerprint: "drift" },
    { ...post, releaseLedgerState: "ABSENT" },
    { ...post, migrations: null },
  ]) {
    assert.deepEqual(classifyPrivateRelease(changed, manifest), {
      state: "DIVERGED", action: "BLOCK",
    });
  }
});
