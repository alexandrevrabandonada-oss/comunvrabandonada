import { describe, expect, it } from "vitest";
import {
  buildPhotoDerivativeIdempotencyKey,
  canCancelProcessingJob,
  deterministicDerivativeKey,
  isStaleProcessingLock,
  processingBackoff,
  sanitizeArchiveProcessingError,
} from "./photo-processing-rules";
describe("photo queue rules", () => {
  it("gera chave idempotente estavel", () => {
    const a = { id: "a", checksum_sha256: "hash" };
    expect(buildPhotoDerivativeIdempotencyKey(a)).toBe(
      buildPhotoDerivativeIdempotencyKey(a),
    );
  });
  it("gera keys deterministicas isoladas", () =>
    expect(deterministicDerivativeKey("item", "hash", "thumbnail")).toBe(
      "public/item/derivatives/v1/hash/thumbnail.webp",
    ));
  it("aplica backoff", () =>
    expect([1, 2, 3, 4].map(processingBackoff)).toEqual([0, 60, 300, 1800]));
  it("detecta stale", () =>
    expect(
      isStaleProcessingLock(new Date(Date.now() - 16 * 60000).toISOString()),
    ).toBe(true));
  it("classifica e sanitiza", () => {
    expect(
      sanitizeArchiveProcessingError(new Error("MIME invalido originals/x")),
    ).toMatchObject({ retryable: false, category: "permanent" });
    expect(
      sanitizeArchiveProcessingError(new Error("timeout https://secret")),
    ).toMatchObject({ retryable: true, category: "transient" });
  });
  it("limita cancelamento", () => {
    expect(canCancelProcessingJob("queued")).toBe(true);
    expect(canCancelProcessingJob("completed")).toBe(false);
  });
});
