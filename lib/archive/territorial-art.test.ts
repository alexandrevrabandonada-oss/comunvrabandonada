import { describe, expect, it } from "vitest";
import {
  artworkPublicationBlockers,
  sanitizeArtworkSnapshot,
  validateArtworkBinary,
} from "./territorial-art-rules";
describe("territorial art rules", () => {
  it("accepts a bounded jpeg and rejects spoofed or oversized files", () => {
    expect(
      validateArtworkBinary({
        mime: "image/jpeg",
        size: 10,
        width: 20,
        height: 20,
        magic: new Uint8Array([255, 216, 255]),
      }),
    ).toBeNull();
    expect(
      validateArtworkBinary({
        mime: "image/jpeg",
        size: 10,
        width: 20,
        height: 20,
        magic: new Uint8Array([60, 115, 118, 103]),
      }),
    ).toBe("magic_bytes_mismatch");
    expect(
      validateArtworkBinary({
        mime: "image/png",
        size: 31 * 1024 * 1024,
        width: 20,
        height: 20,
        magic: new Uint8Array(),
      }),
    ).toBe("size_not_allowed");
  });
  it("fails closed without rights and reinforced review", () => {
    expect(
      artworkPublicationBlockers({
        title: "Obra",
        description: "d",
        context: "c",
        credits: 2,
        territoryId: "x",
        privateOriginal: true,
        publicDerivative: true,
        publicDerivativeAltText: true,
        publicDerivativeObjectVerified: true,
        allowDisplay: false,
        consentStatus: "pending",
        safetyRequired: true,
        safetyApproved: false,
      }),
    ).toEqual(["display_rights", "reinforced_review"]);
  });
  it("blocks a derivative without accessibility or a verified object", () => {
    expect(
      artworkPublicationBlockers({
        title: "Obra",
        description: "d",
        context: "c",
        credits: 1,
        territoryId: "x",
        privateOriginal: true,
        publicDerivative: true,
        publicDerivativeAltText: false,
        publicDerivativeObjectVerified: false,
        allowDisplay: true,
        consentStatus: "granted",
        safetyRequired: false,
        safetyApproved: false,
      }),
    ).toEqual(["public_derivative_alt_text", "public_derivative_object"]);
  });
  it("keeps only public editorial snapshot fields", () => {
    expect(
      sanitizeArtworkSnapshot({
        title: "x",
        private_contact: "no",
        auth_id: "no",
        materials: ["papel"],
      }),
    ).toEqual({ title: "x", materials: ["papel"] });
  });
});
