import { createHash } from "node:crypto";
export const HISTORICAL_PHOTO_RECIPE_VERSION = "v1";
export const PHOTO_RECIPE = {
  thumbnail: { width: 480, quality: 78 },
  display: { width: 1600, quality: 84 },
} as const;
export function buildPhotoDerivativeIdempotencyKey(asset: {
  id: string;
  checksum_sha256: string;
}) {
  return `historical-photo:${asset.id}:${asset.checksum_sha256}:${HISTORICAL_PHOTO_RECIPE_VERSION}:480q78:1600q84`;
}
export function deterministicDerivativeKey(
  itemId: string,
  checksum: string,
  kind: "thumbnail" | "display",
) {
  return `public/${itemId}/derivatives/${HISTORICAL_PHOTO_RECIPE_VERSION}/${checksum}/${kind}.webp`;
}
export function derivativeAssetId(
  itemId: string,
  checksum: string,
  kind: string,
) {
  const h = createHash("sha256")
    .update(`${itemId}:${checksum}:${HISTORICAL_PHOTO_RECIPE_VERSION}:${kind}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export function processingBackoff(attempt: number) {
  return [0, 60, 300, 1800][Math.max(0, Math.min(3, attempt - 1))];
}
export function isStaleProcessingLock(
  lockedAt: string | null,
  now = Date.now(),
) {
  return Boolean(lockedAt && now - new Date(lockedAt).getTime() > 15 * 60_000);
}
export function sanitizeArchiveProcessingError(error: unknown) {
  const raw = error instanceof Error ? error.message : "processing_failed";
  const permanent =
    /mime|corrupt|checksum|decode|original ausente|vinculo|tamanho/i.test(raw);
  return {
    code: permanent ? "INVALID_ORIGINAL" : "TEMPORARY_PROVIDER_ERROR",
    category: permanent ? "permanent" : "transient",
    summary: raw
      .replace(/https?:\/\/\S+|(?:originals|public)\/\S+/gi, "[redacted]")
      .slice(0, 240),
    retryable: !permanent,
    timestamp: new Date().toISOString(),
  };
}
export function canCancelProcessingJob(status: string) {
  return ["queued", "retry_scheduled", "processing"].includes(status);
}
