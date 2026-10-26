import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateProviderAvailabilityObservation } from "./provider-availability-observation.mjs";

const now = Date.parse("2026-10-26T19:00:00.000Z");
const valid = () => ({
  formatVersion: 1,
  projectRef: "nvmdszymrtacfehdynpg",
  observedAt: new Date(now).toISOString(),
  source: "authenticated_dashboard",
  plan: "free",
  scheduledBackups: "unavailable_current_plan",
  pitr: "unavailable_current_plan",
  nativeAuthRestore: "not_exercised",
  scheduledEvidenceSha256: "a".repeat(64),
  pitrEvidenceSha256: "b".repeat(64),
});
test("current availability observation preserves its source time and cannot claim native restore", () => {
  const output = validateProviderAvailabilityObservation(valid(), now);
  assert.equal(output.observedAt, new Date(now).toISOString());
  assert.equal(output.nativeAuthRestore, "not_exercised");
  assert.equal(Object.isFrozen(output), true);
});
for (const [name, changed] of Object.entries({
  stale: { observedAt: new Date(now - 86400001).toISOString() },
  future: { observedAt: new Date(now + 300001).toISOString() },
  "wrong project": { projectRef: "other-project" },
  "synthetic source": { source: "mock" },
  "unreviewed plan": { plan: "pro" },
  "fabricated backup": { scheduledBackups: "available" },
  "fabricated native Auth": { nativeAuthRestore: "PASS" },
  "missing screenshot": { pitrEvidenceSha256: null },
  "duplicated screenshot": { pitrEvidenceSha256: "a".repeat(64) },
  "unexpected credential": { secret: "must-not-appear" },
}))
  test(`reject ${name} with a constant error`, () => {
    assert.throws(
      () =>
        validateProviderAvailabilityObservation(
          { ...valid(), ...changed },
          now,
        ),
      { message: "COMUN_PROVIDER_OBSERVATION_INVALID" },
    );
  });

test("audit consumes fresh availability while keeping native recovery blocked", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "comun-provider-observation-"),
  );
  try {
    const observation = { ...valid(), observedAt: new Date().toISOString() };
    const file = path.join(directory, "observation.json");
    await writeFile(file, JSON.stringify(observation));
    const result = spawnSync(
      process.execPath,
      ["scripts/security/audit-comun-provider-capability.mjs"],
      {
        env: {
          ...process.env,
          COMUN_PROVIDER_CAPABILITY_OBSERVATION_FILE: file,
          COMUN_SECURITY_EVIDENCE_DIR: directory,
        },
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      },
    );
    assert.equal(result.status, 0);
    const evidence = JSON.parse(
      await readFile(
        path.join(directory, "70-provider-capability.json"),
        "utf8",
      ),
    );
    assert.equal(
      evidence.result,
      "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    );
    assert.equal(evidence.observedPlan, "free");
    assert.equal(
      evidence.database.automaticBackups,
      "unavailable_current_plan",
    );
    assert.equal(evidence.currentProviderCapacityVerified, false);
    assert.equal(
      evidence.currentAvailabilityObservation.observedAt,
      observation.observedAt,
    );
    assert.equal(
      evidence.auth.providerInternalRecoveryPoint,
      "not_verified_currently",
    );
    assert.deepEqual(evidence.verifiedCapabilityScopes, [
      "plan",
      "scheduled_backup_availability",
      "pitr_availability",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
