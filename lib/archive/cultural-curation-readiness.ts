/**
 * A5-A0 is deliberately a readiness resolver, not a publication resolver.
 * It receives normalized evidence from each specialized pipeline and returns
 * stable, non-public blocker codes for the editorial workspace.
 */
export type CulturalSpecialization =
  | "photo_or_document"
  | "art"
  | "oral_history"
  | "radio";

export type CurationBlockerCode =
  | "missing_specialization"
  | "incomplete_handoff"
  | "material_incomplete"
  | "provenance_incomplete"
  | "rights_review_required"
  | "review_only"
  | "authorship_unconfirmed"
  | "license_required"
  | "safety_review_required"
  | "asset_not_ready"
  | "derivative_not_ready"
  | "oral_history_recording_consent_missing"
  | "oral_history_voice_consent_missing"
  | "oral_history_transcription_consent_missing"
  | "radio_voice_consent_missing"
  | "music_rights_incomplete";

export type CurationWarningCode =
  | "attention_risk_requires_editorial_attention"
  | "oral_history_publication_consent_missing"
  | "publication_requires_explicit_editorial_action";

export type CurationActionCode =
  | "complete_handoff"
  | "add_material_context"
  | "record_provenance"
  | "resolve_rights"
  | "confirm_authorship"
  | "record_license"
  | "complete_safety_review"
  | "confirm_private_original"
  | "process_derivatives"
  | "record_oral_history_consents"
  | "record_radio_voice_consent"
  | "resolve_music_rights"
  | "request_editorial_review";

export type CulturalCurationReadinessInput = {
  specialization?: CulturalSpecialization | null;
  stage: string;
  handoffComplete: boolean;
  material: {
    titlePresent: boolean;
    narrativePresent: boolean;
    assetReady: boolean;
    derivativeRequired?: boolean;
    derivativeReady?: boolean;
  };
  provenanceComplete: boolean;
  rights: {
    state?: string | null;
    publicationScope?: string | null;
    reusePermission?: string | null;
    licenseCode?: string | null;
    authorshipConfirmed?: boolean;
  };
  safety?: {
    reviewRequired?: boolean;
    reviewComplete?: boolean;
    attentionOnly?: boolean;
  };
  oralHistory?: {
    recordingConsent?: boolean;
    voiceConsent?: boolean;
    transcriptionConsent?: boolean;
    editorialConsent?: boolean;
    publicPublicationConsent?: boolean;
  };
  radio?: {
    voiceConsent?: boolean;
    musicRightsRequired?: boolean;
    musicRightsComplete?: boolean;
  };
};

export type CulturalCurationReadiness = {
  specialization: CulturalSpecialization | null;
  stage: string;
  readyForEditorialReview: boolean;
  readyForDraftMaterialization: boolean;
  /** A5-A0 never authorizes publication. */
  publicationEligible: false;
  blockers: CurationBlockerCode[];
  warnings: CurationWarningCode[];
  requiredActions: CurationActionCode[];
  evidence: {
    handoffComplete: boolean;
    materialReady: boolean;
    provenanceComplete: boolean;
    rightsReady: boolean;
    consentReady: boolean;
    safetyReady: boolean;
    assetReady: boolean;
    derivativeReady: boolean;
    editorialReady: boolean;
  };
};

const declaredRights = new Set(["rights_declared", "rights_approved"]);
const noLicense = new Set(["", "none", "not_defined"]);

function pushUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) values.push(value);
}

function actionFor(blocker: CurationBlockerCode): CurationActionCode {
  switch (blocker) {
    case "incomplete_handoff":
      return "complete_handoff";
    case "material_incomplete":
      return "add_material_context";
    case "provenance_incomplete":
      return "record_provenance";
    case "rights_review_required":
    case "review_only":
      return "resolve_rights";
    case "authorship_unconfirmed":
      return "confirm_authorship";
    case "license_required":
      return "record_license";
    case "safety_review_required":
      return "complete_safety_review";
    case "asset_not_ready":
      return "confirm_private_original";
    case "derivative_not_ready":
      return "process_derivatives";
    case "oral_history_recording_consent_missing":
    case "oral_history_voice_consent_missing":
    case "oral_history_transcription_consent_missing":
      return "record_oral_history_consents";
    case "radio_voice_consent_missing":
      return "record_radio_voice_consent";
    case "music_rights_incomplete":
      return "resolve_music_rights";
    case "missing_specialization":
      return "complete_handoff";
  }
}

/**
 * Resolves a contribution's next safe editorial state without changing it.
 * A rights declaration may support editorial review, but never publication.
 */
export function resolveCulturalCurationReadiness(
  input: CulturalCurationReadinessInput,
): CulturalCurationReadiness {
  const blockers: CurationBlockerCode[] = [];
  const warnings: CurationWarningCode[] = [
    "publication_requires_explicit_editorial_action",
  ];

  if (!input.specialization) pushUnique(blockers, "missing_specialization");
  if (!input.handoffComplete) pushUnique(blockers, "incomplete_handoff");

  const materialReady =
    input.material.titlePresent && input.material.narrativePresent;
  if (!materialReady) pushUnique(blockers, "material_incomplete");
  if (!input.provenanceComplete) pushUnique(blockers, "provenance_incomplete");

  const rightsReady =
    declaredRights.has(input.rights.state ?? "") &&
    input.rights.publicationScope !== "review_only";
  if (input.rights.publicationScope === "review_only")
    pushUnique(blockers, "review_only");
  else if (!rightsReady) pushUnique(blockers, "rights_review_required");
  if (
    input.rights.reusePermission === "licensed_reuse" &&
    noLicense.has(input.rights.licenseCode ?? "")
  )
    pushUnique(blockers, "license_required");
  if (input.specialization === "art" && !input.rights.authorshipConfirmed)
    pushUnique(blockers, "authorship_unconfirmed");

  const safetyReady = !input.safety?.reviewRequired || input.safety.reviewComplete === true;
  if (!safetyReady) pushUnique(blockers, "safety_review_required");
  if (input.safety?.attentionOnly)
    pushUnique(warnings, "attention_risk_requires_editorial_attention");

  if (!input.material.assetReady) pushUnique(blockers, "asset_not_ready");

  let consentReady = true;
  if (input.specialization === "oral_history") {
    const oral = input.oralHistory;
    if (!oral?.recordingConsent) {
      pushUnique(blockers, "oral_history_recording_consent_missing");
      consentReady = false;
    }
    if (!oral?.voiceConsent) {
      pushUnique(blockers, "oral_history_voice_consent_missing");
      consentReady = false;
    }
    if (!oral?.transcriptionConsent || !oral.editorialConsent) {
      pushUnique(blockers, "oral_history_transcription_consent_missing");
      consentReady = false;
    }
    if (!oral?.publicPublicationConsent)
      pushUnique(warnings, "oral_history_publication_consent_missing");
  }
  if (input.specialization === "radio") {
    const radio = input.radio;
    if (!radio?.voiceConsent) {
      pushUnique(blockers, "radio_voice_consent_missing");
      consentReady = false;
    }
    if (radio?.musicRightsRequired && !radio.musicRightsComplete) {
      pushUnique(blockers, "music_rights_incomplete");
      consentReady = false;
    }
  }

  const derivativeReady =
    !input.material.derivativeRequired || input.material.derivativeReady === true;
  const draftBlockers = blockers.filter((blocker) => blocker !== "derivative_not_ready");
  const readyForDraftMaterialization = draftBlockers.length === 0;
  if (input.material.derivativeRequired && !derivativeReady)
    pushUnique(blockers, "derivative_not_ready");
  const readyForEditorialReview = blockers.length === 0;
  const requiredActions = blockers.map(actionFor);
  if (readyForEditorialReview) requiredActions.push("request_editorial_review");

  return {
    specialization: input.specialization ?? null,
    stage: input.stage,
    readyForEditorialReview,
    readyForDraftMaterialization,
    publicationEligible: false,
    blockers,
    warnings,
    requiredActions: [...new Set(requiredActions)],
    evidence: {
      handoffComplete: input.handoffComplete,
      materialReady,
      provenanceComplete: input.provenanceComplete,
      rightsReady,
      consentReady,
      safetyReady,
      assetReady: input.material.assetReady,
      derivativeReady,
      editorialReady: readyForEditorialReview,
    },
  };
}

export type ArchiveSubmissionReadinessSource = {
  submission_type?: string | null;
  status?: string | null;
  title_suggestion?: string | null;
  description_suggestion?: string | null;
  relationship_to_material?: string | null;
  source_name?: string | null;
  source_story?: string | null;
  rights_state?: string | null;
  publication_scope?: string | null;
  reuse_permission?: string | null;
  license_code?: string | null;
  risk_level?: string | null;
  archive_item_id?: string | null;
};

/** Maps only the existing photo/document submission envelope; it does not infer rights. */
export function resolveArchiveSubmissionReadiness(
  submission: ArchiveSubmissionReadinessSource,
  options: { confirmedOriginal: boolean; derivativesReady?: boolean },
) {
  return resolveCulturalCurationReadiness({
    specialization:
      submission.submission_type === "historical_photo"
        ? "photo_or_document"
        : null,
    stage: submission.status ?? "draft",
    handoffComplete: true,
    material: {
      titlePresent: Boolean(submission.title_suggestion?.trim()),
      narrativePresent: Boolean(submission.description_suggestion?.trim()),
      assetReady: options.confirmedOriginal,
      derivativeRequired: Boolean(submission.archive_item_id),
      derivativeReady: options.derivativesReady,
    },
    provenanceComplete: Boolean(
      submission.relationship_to_material?.trim() ||
        submission.source_name?.trim() ||
        submission.source_story?.trim(),
    ),
    rights: {
      state: submission.rights_state,
      publicationScope: submission.publication_scope,
      reusePermission: submission.reuse_permission,
      licenseCode: submission.license_code,
    },
    safety: {
      reviewRequired: submission.risk_level === "high",
      attentionOnly: submission.risk_level === "attention",
    },
  });
}

const submissionTransitions: Record<string, readonly string[]> = {
  draft: ["triage", "rejected", "archived"],
  awaiting_upload: ["triage", "rejected", "archived"],
  submitted: ["triage", "rejected", "archived"],
  triage: ["research", "rights_review", "rejected", "archived"],
  research: ["rights_review", "derivative_pending", "ready_for_editorial_review", "rejected", "archived"],
  rights_review: ["research", "derivative_pending", "ready_for_editorial_review", "rejected", "archived"],
  derivative_pending: ["research", "rights_review", "ready_for_editorial_review", "rejected", "archived"],
  ready_for_editorial_review: ["research", "rights_review", "derivative_pending", "rejected", "archived"],
};

export function isArchiveSubmissionTransitionAllowed(
  currentStatus: string,
  nextStatus: string,
  readiness: Pick<CulturalCurationReadiness, "readyForEditorialReview">,
) {
  if (nextStatus === "ready_for_editorial_review")
    return readiness.readyForEditorialReview &&
      (submissionTransitions[currentStatus] ?? []).includes(nextStatus);
  return (submissionTransitions[currentStatus] ?? []).includes(nextStatus);
}
