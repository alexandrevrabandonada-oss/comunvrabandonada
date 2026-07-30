export type CleanupTarget = {
  url: string;
  projectRef?: string;
  allowNonLocal: boolean;
  allowlist: string[];
};

export type CleanupTicket = {
  status: string;
  confirmation_state?: string | null;
  failure_code?: string | null;
  expires_at: string;
  record_id?: string | null;
};

export function assertCleanupTarget(target: CleanupTarget) {
  const host = new URL(target.url).hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  if (local) return { local: true, ref: "local" };
  if (!target.allowNonLocal || !target.projectRef)
    throw new Error("CLEANUP_NON_LOCAL_REFUSED");
  if (
    !target.allowlist.includes(target.projectRef) ||
    !host.startsWith(`${target.projectRef}.`)
  ) {
    throw new Error("CLEANUP_PROJECT_REF_NOT_ALLOWLISTED");
  }
  return { local: false, ref: target.projectRef };
}

function isOldEnough(ticket: CleanupTicket, now: Date, minimumAgeMs: number) {
  return new Date(ticket.expires_at).getTime() <= now.getTime() - minimumAgeMs;
}

export function isCleanupMarkEligible(
  ticket: CleanupTicket,
  now: Date,
  minimumAgeMs: number,
) {
  if (ticket.record_id) return false;
  if (!["awaiting_upload", "uploaded"].includes(ticket.status)) return false;
  if (
    ![
      undefined,
      null,
      "idle",
      "ready",
      "confirming",
      "failed_retryable",
    ].includes(ticket.confirmation_state)
  )
    return false;
  return isOldEnough(ticket, now, minimumAgeMs);
}

export function isCleanupDeleteEligible(
  ticket: CleanupTicket,
  now: Date,
  minimumAgeMs: number,
) {
  if (ticket.record_id) return false;
  if (ticket.status !== "abandoned") return false;
  if (ticket.confirmation_state !== "abandoned") return false;
  if (ticket.failure_code !== "expired_cleanup_marked") return false;
  return isOldEnough(ticket, now, minimumAgeMs);
}

export const isCleanupEligible = isCleanupMarkEligible;
