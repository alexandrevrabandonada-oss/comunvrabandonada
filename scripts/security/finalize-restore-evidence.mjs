// Cleanup must finish before a rehearsal can publish success. Attempt every
// cleanup even when one fails, and expose only a fixed marker to callers.
export async function finalizeRestoreEvidence({ cleanup, evidence, publish }) {
  let failed = false;
  for (const remove of cleanup) {
    try {
      await remove();
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("COMUN_DATABASE_RESTORE_CLEANUP_FAILED");
  if (evidence) await publish(evidence);
}
