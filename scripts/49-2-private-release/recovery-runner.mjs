export async function resumePrivateSchemaRecovery({
  readState,
  applyR2,
  recordLedger,
}) {
  const actions = [];
  let state = await readState();
  if (state === "DIVERGED")
    throw new Error("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_DIVERGED");

  if (state === "PARTIAL_R1_RECOVERY") {
    await applyR2();
    actions.push("R2");
    state = await readState();
    if (state !== "POST_PENDING_LEDGER_RECOVERY")
      throw new Error("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_R2_POST_MISMATCH");
  }

  if (state === "POST_PENDING_LEDGER_RECOVERY") {
    await recordLedger();
    actions.push("LEDGER");
    state = await readState();
    if (state !== "POST_RECOVERY")
      throw new Error("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_LEDGER_MISMATCH");
  }

  if (state !== "POST_RECOVERY")
    throw new Error("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_STATE_INVALID");

  return { state, actions };
}
