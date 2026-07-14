import { createHash } from "node:crypto";
export function alertFingerprint(type: string, id = "global") {
  return createHash("sha256").update(`${type}:${id}`).digest("hex");
}
export function calculateWorkerState(x: {
  lastAge: number | null;
  dead: number;
  stale: number;
  queued: number;
  oldestAge: number;
  cleanup: number;
}) {
  if (
    x.cleanup > 0 ||
    x.stale > 0 ||
    x.dead > 3 ||
    x.lastAge === null ||
    x.lastAge > 60
  )
    return "critical";
  if (x.dead > 0 || x.queued > 20 || x.oldestAge > 60 || x.lastAge > 30)
    return "attention";
  return "healthy";
}
