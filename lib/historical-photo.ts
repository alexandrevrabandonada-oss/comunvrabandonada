import { createHash, randomUUID } from "node:crypto";

export const HISTORICAL_PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const HISTORICAL_PHOTO_MAX_BYTES = 20 * 1024 * 1024;

export function validateHistoricalPhotoUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const extension = input.filename.split(".").pop()?.toLowerCase();
  const expected: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
  };
  if (
    !HISTORICAL_PHOTO_MIMES.includes(
      input.mimeType as (typeof HISTORICAL_PHOTO_MIMES)[number],
    )
  )
    throw new Error("Formato de imagem nao aceito.");
  if (!extension || !expected[input.mimeType]?.includes(extension))
    throw new Error("Extensao e formato da imagem nao correspondem.");
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes < 1 ||
    input.sizeBytes > HISTORICAL_PHOTO_MAX_BYTES
  )
    throw new Error("A fotografia excede o limite permitido.");
  return { extension };
}

export function historicalOriginalKey(submissionId: string, extension: string) {
  return `originals/submissions/${submissionId}/${randomUUID()}.${extension}`;
}

export function historicalDerivativeKey(
  itemId: string,
  assetId: string,
  kind: "thumbnail" | "display" | "large",
) {
  return `public/${itemId}/${assetId}/${kind}-${randomUUID()}.webp`;
}

export function calculateDecade(year: number | null | undefined) {
  return year && year >= 1000 && year <= 2200
    ? Math.floor(year / 10) * 10
    : null;
}

export function hashSubmitter(value: string, salt: string) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function photoChecksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canPublishHistoricalPhoto(input: {
  rightsStatus: string;
  sourceName?: string | null;
  credits?: string | null;
  altText?: string | null;
  hasApprovedDisplay: boolean;
  originalPublic: boolean;
}) {
  return (
    !input.originalPublic &&
    input.hasApprovedDisplay &&
    Boolean(input.sourceName && input.credits && input.altText) &&
    ["public_domain", "permission_granted", "licensed"].includes(
      input.rightsStatus,
    )
  );
}
