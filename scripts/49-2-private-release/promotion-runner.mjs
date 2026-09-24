import { classifyPrivateRelease } from "./state-machine.mjs";

export async function rehearsePrivateReleasePromotion({
  manifest,
  baseline,
  capture,
  applyMigration,
  recordLedger,
}) {
  const readState = async () => {
    const result = classifyPrivateRelease(await capture(), manifest, baseline);
    if (result.state === "DIVERGED")
      throw new Error("COMUN_49_2_PRIVATE_RELEASE_DIVERGED");
    return result.state;
  };
  const actions = [];
  let state = await readState();
  if (state === "PRE") {
    await applyMigration(manifest.migrations[0]);
    actions.push("R1");
    state = await readState();
    if (state !== "PARTIAL_R1")
      throw new Error("COMUN_49_2_PRIVATE_RELEASE_R1_POST_MISMATCH");
  }
  if (state === "PARTIAL_R1") {
    await applyMigration(manifest.migrations[1]);
    actions.push("R2");
    state = await readState();
    if (state !== "POST_PENDING_LEDGER")
      throw new Error("COMUN_49_2_PRIVATE_RELEASE_R2_POST_MISMATCH");
  }
  if (state === "POST_PENDING_LEDGER") {
    await recordLedger(manifest);
    actions.push("LEDGER");
    state = await readState();
    if (state !== "POST")
      throw new Error("COMUN_49_2_PRIVATE_RELEASE_LEDGER_MISMATCH");
  }
  return { state, actions };
}
