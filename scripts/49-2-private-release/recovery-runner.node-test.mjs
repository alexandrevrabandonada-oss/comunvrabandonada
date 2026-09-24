import assert from "node:assert/strict";
import test from "node:test";
import { resumePrivateSchemaRecovery } from "./recovery-runner.mjs";

test("PARTIAL_R1 recovery can only perform R2 then LEDGER", async () => {
  const states = ["PARTIAL_R1_RECOVERY","POST_PENDING_LEDGER_RECOVERY","POST_RECOVERY"];
  const writes = [];
  const result = await resumePrivateSchemaRecovery({
    readState: async () => states.shift(),
    applyR2: async () => writes.push("R2"),
    recordLedger: async () => writes.push("LEDGER"),
  });
  assert.deepEqual(writes, ["R2","LEDGER"]);
  assert.deepEqual(result, { state:"POST_RECOVERY", actions:["R2","LEDGER"] });
});
test("resumes after R2 without any R1 surface", async () => {
  const states = ["POST_PENDING_LEDGER_RECOVERY","POST_RECOVERY"];
  const writes = [];
  const result = await resumePrivateSchemaRecovery({
    readState: async () => states.shift(),
    applyR2: async () => writes.push("R2"),
    recordLedger: async () => writes.push("LEDGER"),
  });
  assert.deepEqual(writes, ["LEDGER"]);
  assert.deepEqual(result.actions, ["LEDGER"]);
});
test("POST recovery replay is write-free and DIVERGED blocks", async () => {
  let writes = 0;
  const replay = await resumePrivateSchemaRecovery({
    readState: async () => "POST_RECOVERY",
    applyR2: async () => writes++,
    recordLedger: async () => writes++,
  });
  assert.equal(writes, 0);
  assert.deepEqual(replay.actions, []);
  await assert.rejects(
    resumePrivateSchemaRecovery({
      readState: async () => "DIVERGED",
      applyR2: async () => {},
      recordLedger: async () => {},
    }),
    /RECOVERY_DIVERGED/,
  );
});
