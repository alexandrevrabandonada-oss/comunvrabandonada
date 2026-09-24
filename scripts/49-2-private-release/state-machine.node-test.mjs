import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { classifyPrivateRelease } from "./state-machine.mjs";

const manifest = {
  expectedPreFingerprint: "pre",
  expectedPreCanonicalFingerprint: "pre-c",
  expectedPartialR1Fingerprint: "partial",
  expectedPartialR1CanonicalFingerprint: "partial-c",
  expectedPostFingerprint: "post",
  expectedPostCanonicalFingerprint: "post-c",
  expectedPreMigrationVersionsSha256: createHash("sha256")
    .update(JSON.stringify(["prior"]))
    .digest("hex"),
};
const baseline = { migrations: ["prior"] };
const base = {
  blockingFindings: 0,
  releaseLedgerState: "PRESENT_ACCEPTED",
  migrations: ["prior"],
  runnerFingerprint: "pre",
  canonicalFingerprint: "pre-c",
  consentObjectCount: 0,
  bundleLedgerState: "ABSENT",
};
test("private release state machine permits only the exact forward path", () => {
  assert.deepEqual(classifyPrivateRelease(base, manifest, baseline), {
    state: "PRE",
    action: "APPLY_R1_R2",
  });
  const partial = {
    ...base,
    migrations: [...base.migrations, "20260901000000"],
    runnerFingerprint: "partial",
    canonicalFingerprint: "partial-c",
    consentObjectCount: 6,
  };
  assert.deepEqual(classifyPrivateRelease(partial, manifest, baseline), {
    state: "PARTIAL_R1",
    action: "APPLY_R2",
  });
  const pending = {
    ...partial,
    migrations: [...partial.migrations, "20260924015511"],
    runnerFingerprint: "post",
    canonicalFingerprint: "post-c",
  };
  assert.deepEqual(classifyPrivateRelease(pending, manifest, baseline), {
    state: "POST_PENDING_LEDGER",
    action: "VERIFY_AND_RECORD_LEDGER",
  });
  const post = { ...pending, bundleLedgerState: "PRESENT_ACCEPTED" };
  assert.deepEqual(classifyPrivateRelease(post, manifest, baseline), {
    state: "POST",
    action: "ALREADY_APPLIED",
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
    { ...post, migrations: [...post.migrations, "unknown"] },
  ]) {
    assert.deepEqual(classifyPrivateRelease(changed, manifest, baseline), {
      state: "DIVERGED",
      action: "BLOCK",
    });
  }
  assert.deepEqual(
    classifyPrivateRelease(base, manifest, { migrations: ["changed"] }),
    {
      state: "DIVERGED",
      action: "BLOCK",
    },
  );
});
