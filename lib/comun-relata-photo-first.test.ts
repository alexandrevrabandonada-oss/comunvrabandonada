import { describe, expect, it } from "vitest";
import {
  createComunRelataPhotoOnlyDecision,
  isComunRelataPhotoOnlyCapture,
  isComunRelataPhotoOnlyEnabled,
} from "./comun-relata-photo-first";

const production = {
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_QUICK_CAPTURE_V2: "enabled",
  COMUN_RELATA_ATTACHMENTS_ENABLED: "enabled",
  COMUN_RELATA_PHOTO_ONLY_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only",
};

describe("COMUN Relata photo-first runtime", () => {
  it("requires the explicit flag and every cumulative runtime capability", () => {
    expect(isComunRelataPhotoOnlyEnabled(production)).toBe(true);
    expect(
      isComunRelataPhotoOnlyEnabled({
        ...production,
        COMUN_RELATA_PHOTO_ONLY_ENABLED: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunRelataPhotoOnlyEnabled({
        ...production,
        COMUN_RELATA_ATTACHMENTS_ENABLED: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunRelataPhotoOnlyEnabled({
        ...production,
        COMUN_QUICK_CAPTURE_V2: "disabled",
      }),
    ).toBe(false);
  });

  it("recognizes only an empty-text quick capture with a photo", () => {
    const base = {
      text: "",
      semanticTextAbsent: true,
      hasPhoto: true,
      quickCapture: true,
      photoOnlyEnabled: true,
    };
    expect(isComunRelataPhotoOnlyCapture(base)).toBe(true);
    expect(isComunRelataPhotoOnlyCapture({ ...base, text: "curto" })).toBe(
      false,
    );
    expect(
      isComunRelataPhotoOnlyCapture({
        ...base,
        semanticTextAbsent: false,
      }),
    ).toBe(false);
    expect(isComunRelataPhotoOnlyCapture({ ...base, hasPhoto: false })).toBe(
      false,
    );
    expect(
      isComunRelataPhotoOnlyCapture({ ...base, quickCapture: false }),
    ).toBe(false);
    expect(
      isComunRelataPhotoOnlyCapture({ ...base, photoOnlyEnabled: false }),
    ).toBe(false);
  });

  it("emits only the generic safe decision", () => {
    expect(createComunRelataPhotoOnlyDecision()).toMatchObject({
      category: "other",
      urgency: "attention",
      agencyKind: "community_review",
      confidence: "low",
      privacyClass: "sensitive",
      publication: "never_automatic",
      requiresHumanReview: true,
      requiresEnrichment: true,
      automaticForwarding: false,
      captureBasis: "photo_only",
      semanticTextState: "absent",
      captureState: "captured_private",
      missingInformation: [],
    });
  });
});
