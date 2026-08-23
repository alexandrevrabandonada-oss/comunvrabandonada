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

  it("allows a valid oral suggestion to create a private root before child consents exist", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "oral_history",
      stage: "triage",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: false },
      provenanceComplete: true,
      rights: { state: "rights_incomplete", publicationScope: "review_only" },
      preMaterialization: {
        sourceStatus: "triage",
        explicitEditorialDecision: true,
      },
    });
    expect(result.readyForPrivateRootCreation).toBe(true);
    expect(result.readyForEditorialReview).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "oral_history_recording_consent_missing",
        "oral_history_publication_consent_missing",
      ]),
    );
    expect(result.publicationEligible).toBe(false);
  });

  it("keeps an oral-history withdrawal and every missing granular consent out of editorial readiness", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "oral_history",
      stage: "editorial_review",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: true },
      provenanceComplete: true,
      rights: { state: "rights_declared", publicationScope: "comun_display", reusePermission: "comun_only" },
      oralHistory: { recordingConsent: true, voiceConsent: false, transcriptionConsent: false, editorialConsent: false, publicPublicationConsent: false, withdrawalPending: true },
      preMaterialization: { rootExists: true },
    });
    expect(result.readyForEditorialReview).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "oral_history_voice_consent_missing",
      "oral_history_transcription_consent_missing",
      "oral_history_publication_consent_missing",
      "oral_history_withdrawal_pending",
    ]));
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

  it("allows only an explicit program proposal to create a private program root", () => {
    const result = resolveCulturalCurationReadiness({
      specialization: "radio",
      stage: "pending",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: false },
      provenanceComplete: true,
      rights: { state: "rights_incomplete", publicationScope: "review_only" },
      preMaterialization: {
        sourceStatus: "pending",
        explicitEditorialDecision: true,
        radioContributionType: "program_proposal",
        radioTargetKind: "program",
      },
    });
    expect(result.readyForPrivateRootCreation).toBe(true);
    expect(result.readyForEditorialReview).toBe(false);
    expect(result.publicationEligible).toBe(false);
  });

  it("does not infer a radio episode destination and leaves own music in its own pipeline", () => {
    const audio = resolveCulturalCurationReadiness({
      specialization: "radio",
      stage: "pending",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: false },
      provenanceComplete: true,
      rights: { state: "rights_incomplete", publicationScope: "review_only" },
      preMaterialization: { sourceStatus: "pending", explicitEditorialDecision: true, radioContributionType: "community_audio" },
    });
    const music = resolveCulturalCurationReadiness({
      specialization: "radio",
      stage: "pending",
      handoffComplete: true,
      material: { titlePresent: true, narrativePresent: true, assetReady: false },
      provenanceComplete: true,
      rights: { state: "rights_incomplete", publicationScope: "review_only" },
      preMaterialization: { sourceStatus: "pending", explicitEditorialDecision: true, radioContributionType: "own_music" },
    });
    expect(audio.readyForPrivateRootCreation).toBe(false);
    expect(audio.blockers).toEqual(expect.arrayContaining(["radio_voice_consent_missing"]));
    expect(music.readyForPrivateRootCreation).toBe(false);
    expect(music.blockers).toEqual(expect.arrayContaining(["music_pipeline_required"]));
  });

  it("does not let a submitted status bypass the resolver", () => {
    const blocked = photo({ material: { titlePresent: true, narrativePresent: true, assetReady: false } });
    expect(isArchiveSubmissionTransitionAllowed("derivative_pending", "ready_for_editorial_review", blocked)).toBe(false);
    expect(isArchiveSubmissionTransitionAllowed("derivative_pending", "ready_for_editorial_review", photo())).toBe(true);
  });
});
