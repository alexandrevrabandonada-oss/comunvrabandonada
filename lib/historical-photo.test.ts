import { describe, expect, it } from "vitest";
import {
  calculateDecade,
  canPublishHistoricalPhoto,
  historicalDerivativeKey,
  historicalOriginalKey,
  photoChecksum,
  validateHistoricalPhotoUpload,
} from "./historical-photo";
describe("historical photo rules", () => {
  it("accepts safe images and rejects mismatched MIME", () => {
    expect(
      validateHistoricalPhotoUpload({
        filename: "memoria.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }).extension,
    ).toBe("jpg");
    expect(() =>
      validateHistoricalPhotoUpload({
        filename: "memoria.png",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      }),
    ).toThrow();
  });
  it("blocks oversized files", () => {
    expect(() =>
      validateHistoricalPhotoUpload({
        filename: "x.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 21 * 1024 * 1024,
      }),
    ).toThrow();
  });
  it("creates scoped unpredictable keys", () => {
    expect(historicalOriginalKey("submission", "jpg")).toMatch(
      /^originals\/submissions\/submission\/[a-f0-9-]+\.jpg$/,
    );
    expect(historicalDerivativeKey("item", "asset", "thumbnail")).toMatch(
      /^public\/item\/asset\/thumbnail-[a-f0-9-]+\.webp$/,
    );
  });
  it("calculates decades", () => {
    expect(calculateDecade(1987)).toBe(1980);
    expect(calculateDecade(null)).toBeNull();
  });
  it("detects exact duplicates by checksum", () => {
    expect(photoChecksum(new Uint8Array([1, 2, 3]))).toBe(
      photoChecksum(new Uint8Array([1, 2, 3])),
    );
    expect(photoChecksum(new Uint8Array([1, 2, 3]))).not.toBe(
      photoChecksum(new Uint8Array([1, 2, 4])),
    );
  });
  it("blocks publication without rights, review or privacy", () => {
    const valid = {
      rightsStatus: "permission_granted",
      sourceName: "Arquivo familiar",
      credits: "Familia Silva",
      altText: "Rua em 1970",
      hasApprovedDisplay: true,
      originalPublic: false,
    };
    expect(canPublishHistoricalPhoto(valid)).toBe(true);
    expect(canPublishHistoricalPhoto({ ...valid, originalPublic: true })).toBe(
      false,
    );
    expect(
      canPublishHistoricalPhoto({ ...valid, rightsStatus: "unknown" }),
    ).toBe(false);
    expect(
      canPublishHistoricalPhoto({ ...valid, hasApprovedDisplay: false }),
    ).toBe(false);
  });
});
