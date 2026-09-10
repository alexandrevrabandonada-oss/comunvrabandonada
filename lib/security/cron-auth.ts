import { timingSafeEqual } from "node:crypto";

export function matchesCronSecret(actual: string) {
  const candidates = [
    process.env.CRON_SECRET ?? "",
    process.env.CRON_SECRET_NEXT ?? "",
  ].filter(Boolean);
  if (!actual || candidates.length === 0) return false;
  const actualBytes = Buffer.from(actual);
  return candidates.some((candidate) => {
    const candidateBytes = Buffer.from(candidate);
    return actualBytes.length === candidateBytes.length &&
      timingSafeEqual(actualBytes, candidateBytes);
  });
}
