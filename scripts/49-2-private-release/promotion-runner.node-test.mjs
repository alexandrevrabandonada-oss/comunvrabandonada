import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { rehearsePrivateReleasePromotion } from "./promotion-runner.mjs";

const prior = ["prior"];
const manifest = {
  migrations: [{ version: "20260901000000" }, { version: "20260924015511" }],
  expectedPreMigrationVersionsSha256: createHash("sha256")
    .update(JSON.stringify(prior))
    .digest("hex"),
  expectedPreFingerprint: "pre",
  expectedPreCanonicalFingerprint: "pre-c",
  expectedPartialR1Fingerprint: "partial",
  expectedPartialR1CanonicalFingerprint: "partial-c",
  expectedPostFingerprint: "post",
  expectedPostCanonicalFingerprint: "post-c",
};
const baseline = { migrations: prior };
const states = [
  {
    migrations: prior,
    runnerFingerprint: "pre",
    canonicalFingerprint: "pre-c",
    consentObjectCount: 0,
    bundleLedgerState: "ABSENT",
  },
  {
    migrations: [...prior, "20260901000000"],
    runnerFingerprint: "partial",
    canonicalFingerprint: "partial-c",
    consentObjectCount: 6,
    bundleLedgerState: "ABSENT",
  },
  {
    migrations: [...prior, "20260901000000", "20260924015511"],
    runnerFingerprint: "post",
    canonicalFingerprint: "post-c",
    consentObjectCount: 6,
    bundleLedgerState: "ABSENT",
  },
  {
    migrations: [...prior, "20260901000000", "20260924015511"],
    runnerFingerprint: "post",
    canonicalFingerprint: "post-c",
    consentObjectCount: 6,
    bundleLedgerState: "PRESENT_ACCEPTED",
  },
].map((capture) => ({
  ...capture,
  blockingFindings: 0,
  releaseLedgerState: "PRESENT_ACCEPTED",
}));

for (const start of [0, 1, 2, 3])
  test(`promotion resumes exactly from state ${start}`, async () => {
    let index = start;
    const actions = [];
    const result = await rehearsePrivateReleasePromotion({
      manifest,
      baseline,
      capture: async () => states[index],
      applyMigration: async (migration) => {
        actions.push(migration.version);
        index += 1;
      },
      recordLedger: async () => {
        actions.push("ledger");
        index += 1;
      },
    });
    assert.equal(result.state, "POST");
    assert.deepEqual(
      actions,
      ["20260901000000", "20260924015511", "ledger"].slice(start),
    );
  });

test("promotion blocks before writing on divergent PRE and stops on unexpected intermediate state", async () => {
  const actions = [];
  await assert.rejects(
    rehearsePrivateReleasePromotion({
      manifest,
      baseline,
      capture: async () => ({ ...states[0], runnerFingerprint: "changed" }),
      applyMigration: async () => actions.push("migration"),
      recordLedger: async () => actions.push("ledger"),
    }),
    /COMUN_49_2_PRIVATE_RELEASE_DIVERGED/,
  );
  assert.deepEqual(actions, []);
  let calls = 0;
  await assert.rejects(
    rehearsePrivateReleasePromotion({
      manifest,
      baseline,
      capture: async () => {
        calls += 1;
        return states[0];
      },
      applyMigration: async () => actions.push("R1"),
      recordLedger: async () => actions.push("ledger"),
    }),
    /COMUN_49_2_PRIVATE_RELEASE_R1_POST_MISMATCH/,
  );
  assert.equal(calls, 2);
  assert.deepEqual(actions, ["R1"]);
});
