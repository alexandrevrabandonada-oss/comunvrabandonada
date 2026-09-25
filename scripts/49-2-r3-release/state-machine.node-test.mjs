import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyR3Release } from "./state-machine.mjs";

const manifest = JSON.parse(
  readFileSync(
    "supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json",
    "utf8",
  ),
);
const baseline = JSON.parse(
  readFileSync("reports/current/comun-49-2-r3-production-pre.json", "utf8"),
);
const pre = {
  ...baseline,
  hardeningLedger: baseline.hardeningLedger,
  r12Ledger: baseline.r12Ledger,
  r3LedgerState: "ABSENT",
};
const post = {
  ...pre,
  migrations: [...baseline.migrations, "20260924225210"],
  runnerFingerprint: manifest.expectedPostFingerprint,
  canonicalFingerprint: manifest.expectedPostCanonicalFingerprint,
  r3Present: true,
  candidateTablePresent: true,
  candidateBridgePresent: true,
  r3TriggerCount: 4,
};

test("PRE exact applies only R3", () => {
  assert.deepEqual(classifyR3Release(pre, manifest, baseline), {
    state: "PRE",
    action: "APPLY_R3",
  });
});
test("POST pending ledger records only ledger", () => {
  assert.deepEqual(classifyR3Release(post, manifest, baseline), {
    state: "POST_PENDING_LEDGER",
    action: "VERIFY_AND_RECORD_LEDGER",
  });
});
test("POST accepted is read-only replay", () => {
  assert.deepEqual(
    classifyR3Release(
      { ...post, r3LedgerState: "PRESENT_ACCEPTED" },
      manifest,
      baseline,
    ),
    { state: "POST", action: "ALREADY_APPLIED" },
  );
});
for (const [name, value] of Object.entries({
  missingMigration: { ...post, migrations: baseline.migrations },
  unknownMigration: {
    ...post,
    migrations: [...post.migrations, "99999999999999"],
  },
  ledgerMismatch: { ...post, r3LedgerState: "PRESENT_MISMATCH" },
  preWithLedger: { ...pre, r3LedgerState: "PRESENT_ACCEPTED" },
  missingTable: { ...post, candidateTablePresent: false },
  missingBridge: { ...post, candidateBridgePresent: false },
  missingTrigger: { ...post, r3TriggerCount: 3 },
  changedFingerprint: { ...post, canonicalFingerprint: "0".repeat(64) },
  securityFinding: { ...post, blockingFindings: 1 },
  publicRelation: { ...post, publicCollectiveRelationCount: 1 },
  r12Drift: { ...post, r12Ledger: "PRESENT_MISMATCH" },
  hardeningDrift: { ...post, hardeningLedger: "PRESENT_MISMATCH" },
}))
  test(`${name} blocks`, () => {
    assert.deepEqual(classifyR3Release(value, manifest, baseline), {
      state: "DIVERGED",
      action: "BLOCK",
    });
  });
