import { classifyR3Release } from "./state-machine.mjs";

export async function promoteR3Release({ manifest, baseline, capture, applyMigration,
  verifyPost, recordLedger }) {
  const actions = [];
  const readState = async () => {
    const state = classifyR3Release(await capture(), manifest, baseline);
    if (state.state === "DIVERGED") throw new Error("COMUN_49_2_R3_RELEASE_DIVERGED");
    return state.state;
  };
  let state = await readState();
  if (state === "PRE") {
    await applyMigration(manifest.migrations[0]);
    actions.push("R3");
    state = await readState();
    if (state !== "POST_PENDING_LEDGER")
      throw new Error("COMUN_49_2_R3_POST_MISMATCH");
  }
  if (state === "POST_PENDING_LEDGER") {
    await verifyPost();
    await recordLedger(manifest);
    actions.push("LEDGER");
    state = await readState();
    if (state !== "POST") throw new Error("COMUN_49_2_R3_LEDGER_MISMATCH");
  }
  return { state, actions };
}
