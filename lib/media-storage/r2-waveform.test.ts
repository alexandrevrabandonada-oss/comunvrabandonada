import { describe, expect, it } from "vitest";
import { validateMediaUpload } from "./r2";

// Validation only: no R2 client, object or network operation.
const waveform = { scope: "radio_public" as const, key: "radio-public/synthetic/waveform.json", contentType: "application/json", sizeBytes: 1024 * 1024 };
describe("R2 waveform metadata boundary (no provider integration)", () => {
  it("accepts the exact scoped waveform at the size limit", () => {
    expect(() => validateMediaUpload(waveform)).not.toThrow();
  });
  it.each([1024 * 1024 + 1, NaN, Infinity, 0])("rejects invalid or excessive size %s", (sizeBytes) => {
    expect(() => validateMediaUpload({ ...waveform, sizeBytes })).toThrow();
  });
  it.each(["radio-public/synthetic/other.json", "public/synthetic/waveform.json", "radio-public/synthetic/nested/waveform.json"])("rejects arbitrary JSON path %s", (key) => {
    expect(() => validateMediaUpload({ ...waveform, key })).toThrow();
  });
  it("rejects JSON in the private scope", () => {
    expect(() => validateMediaUpload({ ...waveform, scope: "private_original" })).toThrow();
  });
});
