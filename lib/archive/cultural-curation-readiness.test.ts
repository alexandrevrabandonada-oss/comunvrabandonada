import { describe, expect, it } from "vitest";
import {
  isArchiveSubmissionTransitionAllowed,
  resolveCulturalCurationReadiness,
} from "./cultural-curation-readiness";

const photo = (overrides: Record<string, unknown> = {}) =>
  resolveCulturalCurationReadiness({
    specialization: "photo_or_document",
    stage: "rights_review",
    handoffComplete: true,
    material: { titlePresent: true, narrativePresent: true, assetReady: true },
    provenanceComplete: true,
    rights: {
      state: "rights_declared",
      publicationScope: "comun_display",
      reusePermission: "comun_only",
    },
    ...overrides,
  });

describe("cultural curation readiness", () => {
  it("keeps rights-incomplete and review-only photos out of editorial readiness", () => {
    expect(photo({ rights: { state: "rights_incomplete", publicationScope: "comun_display" } }).blockers).toEqual(
      expect.arrayContaining(["rights_review_required"]),
    );
    expect(photo({ rights: { state: "rights_declared", publicationScope: "review_only" } }).readyForDraftMaterialization).toBe(false);
  });

  it("allows complete photo evidence to reach editorial review but never publication", () => {
    const result = photo();
    expect(result.readyForEditorialReview).toBe(true);
    expect(result.readyForDraftMaterialization).toBe(true);
    expect(result.publicationEligible).toBe(false);
  });

  it("does not infer artwork authorship or licensed reuse", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "art",
      stage: "rights_review",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: false },
      provenanceComplete: true,
      rights: {
        state: "rights_declared",
        publicationScope: "comun_display_and_reuse",
        reusePermission: "licensed_reuse",
        licenseCode: null,
        authorshipConfirmed: false,
      },
      safety: { reviewRequired: true, reviewComplete: false },
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "authorship_unconfirmed",
        "license_required",
        "asset_not_ready",
        "safety_review_required",
      ]),
    );
  });

  it("keeps oral-history consent granular", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "oral_history",
      stage: "triage",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: true },
      provenanceComplete: true,
      rights: { state: "rights_declared", publicationScope: "comun_display", reusePermission: "comun_only" },
      oralHistory: {
        recordingConsent: false,
        voiceConsent: true,
        transcriptionConsent: false,
        editorialConsent: false,
        publicPublicationConsent: false,
      },
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "oral_history_recording_consent_missing",
        "oral_history_transcription_consent_missing",
      ]),
    );
    expect(result.warnings).toContain("oral_history_publication_consent_missing");
    expect(result.publicationEligible).toBe(false);
  });

  it("evaluates radio voice and music independently", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "radio",
      stage: "rights_review",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: true },
      provenanceComplete: true,
      rights: { state: "rights_declared", publicationScope: "comun_audio", reusePermission: "comun_only" },
      radio: { voiceConsent: false, musicRightsRequired: true, musicRightsComplete: false },
    });
    expect(result.blockers).toEqual(expect.arrayContaining(["radio_voice_consent_missing", "music_rights_incomplete"]));
  });

  it("does not let a submitted status bypass the resolver", () => {
    const blocked = photo({ material: { titlePresent: true, narrativePresent: true, assetReady: false } });
    expect(isArchiveSubmissionTransitionAllowed("derivative_pending", "ready_for_editorial_review", blocked)).toBe(false);
    expect(isArchiveSubmissionTransitionAllowed("derivative_pending", "ready_for_editorial_review", photo())).toBe(true);
  });
});
