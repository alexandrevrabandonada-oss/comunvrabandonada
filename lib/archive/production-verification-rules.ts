export const VERIFICATION_PREFIX = "smoke/production-verification/";
export function isAllowedVerificationKey(key: string) {
  return (
    key.startsWith(VERIFICATION_PREFIX) &&
    !key.includes("..") &&
    key.length > VERIFICATION_PREFIX.length
  );
}
export function redactObjectKey(value: string) {
  return isAllowedVerificationKey(value)
    ? `${VERIFICATION_PREFIX}[redacted]`
    : "[redacted]";
}
export function sanitizeVerificationError(error: unknown) {
  const raw = error instanceof Error ? error.message : "verification_failed";
  return raw
    .replace(/https?:\/\/\S+/gi, "[url-redacted]")
    .replace(
      /smoke\/production-verification\/[^\s]+/gi,
      `${VERIFICATION_PREFIX}[redacted]`,
    )
    .replace(
      /(secret|token|authorization|access.?key)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .slice(0, 500);
}
export function isVerificationRunStale(startedAt: string, now = Date.now()) {
  return now - new Date(startedAt).getTime() > 30 * 60_000;
}
export function safeVerificationSummary(input: {
  steps: Array<{ name: string; passed: boolean; durationMs: number }>;
  cleanup: boolean;
  durationMs: number;
}) {
  return {
    steps: input.steps,
    cleanup: input.cleanup,
    durationMs: input.durationMs,
  };
}
