import { timingSafeEqual } from "node:crypto";

export function matchesCronSecret(actual: string) {
  const candidates = [
    process.env.CRON_SECRET ?? "",
    process.env.CRON_SECRET_NEXT ?? "",
  ].filter(Boolean);
  if (!actual || candidates.length === 0) return false;
  return candidates.some(
    (candidate) =>
      actual.length === candidate.length &&
      timingSafeEqual(Buffer.from(actual), Buffer.from(candidate)),
  );
}
