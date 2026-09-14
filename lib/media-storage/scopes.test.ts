import { describe, expect, it } from "vitest";
import { archiveBucketScope, resolveStorageScope } from "./scopes";
import { FixtureStorageProvider } from "./fixture";
import { validateMediaUpload } from "./r2";

describe("archive metadata and radio storage", () => {
  it("keeps database scopes canonical and preserves physical radio buckets", async () => {
    const provider = new FixtureStorageProvider();
    for (const [physical, key, canonical] of [
      ["radio_private_original", "radio-originals/episode/original.wav", "private_original"],
      ["radio_public", "radio-public/episode/episode.mp3", "public_safe"],
    ] as const) {
      expect(archiveBucketScope(physical)).toBe(canonical);
      expect(resolveStorageScope(canonical, key)).toBe(physical);
      await provider.putObject({ scope: physical, key, contentType: "audio/wav", sizeBytes: 3, body: new Uint8Array([1, 2, 3]) });
      expect(await provider.readObject(canonical, key)).toEqual(new Uint8Array([1, 2, 3]));
      await provider.deleteObject(canonical, key);
      expect(await provider.objectExists(physical, key)).toBe(false);
    }
  });

  it("does not change ordinary archives or infer public access from a private scope", () => {
    expect(resolveStorageScope("private_original", "originals/photo.jpg")).toBe("private_original");
    expect(resolveStorageScope("public_safe", "public/photo.webp")).toBe("public_safe");
    expect(resolveStorageScope("private_original", "radio-public/episode/episode.mp3")).toBe("private_original");
  });

  it("accepts bounded radio waveform JSON without accepting arbitrary JSON uploads", () => {
    const input = { scope: "radio_public" as const, key: "radio-public/episode/waveform.json", contentType: "application/json", sizeBytes: 100 };
    expect(() => validateMediaUpload(input)).not.toThrow();
    expect(() => validateMediaUpload({ ...input, sizeBytes: 1024 * 1024 + 1 })).toThrow();
    expect(() => validateMediaUpload({ ...input, key: "radio-public/episode/other.json" })).toThrow();
    expect(() => validateMediaUpload({ ...input, scope: "public_safe" })).toThrow();
  });
});
