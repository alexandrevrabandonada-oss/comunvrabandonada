import assert from "node:assert/strict";
import test from "node:test";
import { classifyPrivateSchemaRecovery } from "./recovery-state-machine.mjs";

const prior = ["a", "b"];
const manifest = {
  postgresVersion: "17.6",
  expectedPreMigrationVersionsSha256:
    "FIXED_AT_RUNTIME"
};
const crypto = await import("node:crypto");
manifest.expectedPreMigrationVersionsSha256 = crypto
  .createHash("sha256")
  .update(JSON.stringify(prior))
  .digest("hex");
const recovery = {
  partialR1: { runnerFingerprint: "r1", canonicalFingerprint: "c1" },
  post: { runnerFingerprint: "r2", canonicalFingerprint: "c2" },
};
const common = {
  postgresVersion: "17.6",
  blockingFindings: 0,
  releaseLedgerState: "PRESENT_ACCEPTED",
  consentObjectCount: 6,
};
test("accepts only exact recovery PARTIAL_R1", () => {
  assert.deepEqual(
    classifyPrivateSchemaRecovery(
      { ...common, migrations: [...prior, "20260901000000"],
        runnerFingerprint: "r1", canonicalFingerprint: "c1", bundleLedgerState: "ABSENT" },
      manifest, { migrations: prior }, recovery),
    { state: "PARTIAL_R1_RECOVERY", action: "APPLY_R2" },
  );
});
test("recognizes recovery POST pending and accepted ledger", () => {
  const base = { ...common, migrations: [...prior, "20260901000000", "20260924015511"],
    runnerFingerprint: "r2", canonicalFingerprint: "c2" };
  assert.equal(classifyPrivateSchemaRecovery({ ...base, bundleLedgerState: "ABSENT" },
    manifest,{ migrations: prior },recovery).state,"POST_PENDING_LEDGER_RECOVERY");
  assert.equal(classifyPrivateSchemaRecovery({ ...base, bundleLedgerState: "PRESENT_ACCEPTED" },
    manifest,{ migrations: prior },recovery).state,"POST_RECOVERY");
});
test("PRE, wrong canonical and mismatched ledger are blocked", () => {
  for (const capture of [
    { ...common, migrations: prior, runnerFingerprint: "x", canonicalFingerprint: "x", bundleLedgerState: "ABSENT" },
    { ...common, migrations: [...prior, "20260901000000"], runnerFingerprint: "r1", canonicalFingerprint: "wrong", bundleLedgerState: "ABSENT" },
    { ...common, migrations: [...prior, "20260901000000"], runnerFingerprint: "r1", canonicalFingerprint: "c1", bundleLedgerState: "PRESENT_ACCEPTED" },
  ]) assert.equal(classifyPrivateSchemaRecovery(capture,manifest,{ migrations: prior },recovery).state,"DIVERGED");
});
