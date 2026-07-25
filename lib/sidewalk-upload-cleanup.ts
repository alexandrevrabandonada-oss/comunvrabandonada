export type CleanupTarget = { url: string; projectRef?: string; allowNonLocal: boolean; allowlist: string[] };

export function assertCleanupTarget(target: CleanupTarget) {
  const host = new URL(target.url).hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  if (local) return { local: true, ref: "local" };
  if (!target.allowNonLocal || !target.projectRef) throw new Error("CLEANUP_NON_LOCAL_REFUSED");
  if (!target.allowlist.includes(target.projectRef) || !host.startsWith(`${target.projectRef}.`)) {
    throw new Error("CLEANUP_PROJECT_REF_NOT_ALLOWLISTED");
  }
  return { local: false, ref: target.projectRef };
}

export function isCleanupEligible(ticket: { status: string; confirmation_state?: string | null; expires_at: string; record_id?: string | null }, now: Date, minimumAgeMs: number) {
  if (ticket.record_id) return false;
  if (!["awaiting_upload", "uploaded"].includes(ticket.status)) return false;
  if (![
    undefined,
    null,
    "idle",
    "ready",
    "confirming",
    "failed_retryable",
  ].includes(ticket.confirmation_state)) return false;
  return new Date(ticket.expires_at).getTime() <= now.getTime() - minimumAgeMs;
}
