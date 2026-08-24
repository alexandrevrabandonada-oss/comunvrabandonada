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
  | "oral_history_publication_consent_missing"
  | "oral_history_withdrawal_pending"
  | "radio_voice_consent_missing"
  | "music_rights_incomplete"
  | "private_root_source_ineligible"
  | "private_root_editorial_decision_required"
  | "radio_private_root_destination_required"
  | "radio_existing_target_reconciliation_required"
  | "artwork_existing_target_reconciliation_required"
  | "music_pipeline_required";

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
  | "resolve_oral_history_withdrawal"
  | "record_radio_voice_consent"
  | "resolve_music_rights"
  | "choose_radio_private_root_destination"
  | "reconcile_radio_existing_target"
  | "reconcile_artwork_existing_target"
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
    withdrawalPending?: boolean;
  };
  radio?: {
    voiceConsent?: boolean;
    musicRightsRequired?: boolean;
    musicRightsComplete?: boolean;
    withdrawalPending?: boolean;
  };
  /** Evidence available before any specialized root and its child gates exist. */
  preMaterialization?: {
    sourceStatus?: string | null;
    explicitEditorialDecision?: boolean;
    rootExists?: boolean;
    radioContributionType?:
      | "program_proposal"
      | "pauta_proposal"
      | "community_audio"
      | "authorized_testimony"
      | "own_music"
      | "agenda"
      | "correction"
      | "complement"
      | "withdrawal"
      | null;
    radioTargetKind?: "program" | "episode" | null;
    radioProgramSelected?: boolean;
    radioExistingTargetSelected?: boolean;
    artworkSubmissionKind?:
      | "own_work"
      | "collective_work"
      | "authorized_submission"
      | "unknown_authorship"
      | "existing_work_complement"
      | "credit_correction"
      | null;
  };
};

export type CulturalCurationReadiness = {
  specialization: CulturalSpecialization | null;
  stage: string;
  /** Does not require child consents or public derivatives that do not exist yet. */
  readyForPrivateRootCreation: boolean;
  /** Reconciliation only: points to an existing private root and never creates one. */
  readyForExistingRootLink: boolean;
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
    case "oral_history_publication_consent_missing":
      return "record_oral_history_consents";
    case "oral_history_withdrawal_pending":
      return "resolve_oral_history_withdrawal";
    case "radio_voice_consent_missing":
      return "record_radio_voice_consent";
    case "music_rights_incomplete":
      return "resolve_music_rights";
    case "radio_private_root_destination_required":
      return "choose_radio_private_root_destination";
    case "radio_existing_target_reconciliation_required":
      return "reconcile_radio_existing_target";
    case "artwork_existing_target_reconciliation_required":
      return "reconcile_artwork_existing_target";
    case "music_pipeline_required":
      return "resolve_music_rights";
    case "private_root_source_ineligible":
    case "private_root_editorial_decision_required":
      return "request_editorial_review";
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
    if (!oral?.publicPublicationConsent) {
      pushUnique(blockers, "oral_history_publication_consent_missing");
      pushUnique(warnings, "oral_history_publication_consent_missing");
      consentReady = false;
    }
    if (oral?.withdrawalPending) {
      pushUnique(blockers, "oral_history_withdrawal_pending");
      consentReady = false;
    }
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
    if (radio?.withdrawalPending) {
      pushUnique(blockers, "radio_existing_target_reconciliation_required");
      consentReady = false;
    }
  }

  const derivativeReady =
    !input.material.derivativeRequired || input.material.derivativeReady === true;
  const draftBlockers = blockers.filter((blocker) => blocker !== "derivative_not_ready");
  const readyForDraftMaterialization = draftBlockers.length === 0;
  if (input.material.derivativeRequired && !derivativeReady)
    pushUnique(blockers, "derivative_not_ready");
  const pre = input.preMaterialization;
  const privateRootBlockers: CurationBlockerCode[] = [];
  const sourceStatus = pre?.sourceStatus ?? input.stage;
  const sourceIsEligible = !["rejected", "archived", "withdrawn", "published"].includes(sourceStatus);
  const sourceEvidenceReady =
    Boolean(input.specialization) &&
    input.handoffComplete &&
    materialReady &&
    input.provenanceComplete;

  if (!sourceIsEligible || !sourceEvidenceReady)
    pushUnique(privateRootBlockers, "private_root_source_ineligible");
  if ((input.specialization === "oral_history" || input.specialization === "radio" || input.specialization === "art") &&
    !pre?.rootExists && pre?.explicitEditorialDecision !== true)
    pushUnique(privateRootBlockers, "private_root_editorial_decision_required");

  if (input.specialization === "radio" && !pre?.rootExists) {
    const contributionType = pre?.radioContributionType;
    const targetKind = pre?.radioTargetKind;
    if (contributionType === "program_proposal") {
      if (targetKind !== "program")
        pushUnique(privateRootBlockers, "radio_private_root_destination_required");
    } else if (["community_audio", "authorized_testimony"].includes(contributionType ?? "")) {
      if (targetKind !== "episode" || !pre?.radioProgramSelected)
        pushUnique(privateRootBlockers, "radio_private_root_destination_required");
    } else if (contributionType === "own_music") {
      pushUnique(privateRootBlockers, "music_pipeline_required");
    } else if (["correction", "complement", "withdrawal"].includes(contributionType ?? "")) {
      pushUnique(privateRootBlockers, "radio_existing_target_reconciliation_required");
    } else if (["pauta_proposal", "agenda"].includes(contributionType ?? "")) {
      pushUnique(privateRootBlockers, "radio_existing_target_reconciliation_required");
    } else {
      pushUnique(privateRootBlockers, "radio_private_root_destination_required");
    }
  }

  if (input.specialization === "art" && !pre?.rootExists &&
    ["existing_work_complement", "credit_correction"].includes(pre?.artworkSubmissionKind ?? ""))
    pushUnique(privateRootBlockers, "artwork_existing_target_reconciliation_required");

  const readyForPrivateRootCreation =
    input.specialization === "oral_history" || input.specialization === "radio" || input.specialization === "art"
      ? privateRootBlockers.length === 0
      : readyForDraftMaterialization;
  const readyForExistingRootLink =
    input.specialization === "radio" &&
    ["correction", "complement", "withdrawal"].includes(pre?.radioContributionType ?? "") &&
    sourceIsEligible &&
    sourceEvidenceReady &&
    pre?.explicitEditorialDecision === true &&
    pre?.radioExistingTargetSelected === true;
  for (const blocker of privateRootBlockers) pushUnique(blockers, blocker);
  const readyForEditorialReview = blockers.length === 0;
  const requiredActions = blockers.map(actionFor);
  if (readyForEditorialReview) requiredActions.push("request_editorial_review");

  return {
    specialization: input.specialization ?? null,
    stage: input.stage,
    readyForPrivateRootCreation,
    readyForExistingRootLink,
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

export type OralHistorySuggestionReadinessSource = {
  suggested_person_or_theme?: string | null;
  story_summary?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  period_public?: string | null;
  relationship_public?: string | null;
  status?: string | null;
  private_root_archive_item_id?: string | null;
};

/** The suggestion envelope is provenance; no participant or consent is inferred from it. */
export function resolveOralHistorySuggestionReadiness(
  suggestion: OralHistorySuggestionReadinessSource,
  options: { explicitEditorialDecision: boolean; rootExists?: boolean },
) {
  return resolveCulturalCurationReadiness({
    specialization: "oral_history",
    stage: suggestion.status ?? "pending",
    handoffComplete: true,
    material: {
      titlePresent: Boolean(suggestion.suggested_person_or_theme?.trim()),
      narrativePresent: Boolean(suggestion.story_summary?.trim()),
      assetReady: false,
    },
    provenanceComplete: Boolean(
      suggestion.relationship_public?.trim() ||
        suggestion.city?.trim() ||
        suggestion.neighborhood?.trim() ||
        suggestion.period_public?.trim() ||
        suggestion.suggested_person_or_theme?.trim(),
    ),
    rights: { state: "rights_incomplete", publicationScope: "review_only" },
    oralHistory: {},
    preMaterialization: {
      sourceStatus: suggestion.status,
      explicitEditorialDecision: options.explicitEditorialDecision,
      rootExists: options.rootExists ?? Boolean(suggestion.private_root_archive_item_id),
    },
  });
}

export type RadioContributionReadinessSource = {
  public_protocol?: string | null;
  contribution_type?: NonNullable<CulturalCurationReadinessInput["preMaterialization"]>["radioContributionType"];
  title_suggestion?: string | null;
  context_suggestion?: string | null;
  status?: string | null;
  rights_state?: string | null;
  publication_scope?: string | null;
  reuse_permission?: string | null;
  license_code?: string | null;
  voice_source?: string | null;
  material_source?: string | null;
  private_root_kind?: "program" | "episode" | null;
  private_root_archive_item_id?: string | null;
};

export function resolveRadioContributionReadiness(
  contribution: RadioContributionReadinessSource,
  options: {
    explicitEditorialDecision: boolean;
    programSelected?: boolean;
    targetKind?: "program" | "episode" | null;
    existingTargetSelected?: boolean;
    rootExists?: boolean;
  },
) {
  return resolveCulturalCurationReadiness({
    specialization: "radio",
    stage: contribution.status ?? "pending",
    handoffComplete: true,
    material: {
      titlePresent: Boolean(contribution.title_suggestion?.trim()),
      narrativePresent: Boolean(contribution.context_suggestion?.trim()),
      assetReady: false,
    },
    provenanceComplete: Boolean(contribution.public_protocol?.trim()),
    rights: {
      state: contribution.rights_state,
      publicationScope: contribution.publication_scope,
      reusePermission: contribution.reuse_permission,
      licenseCode: contribution.license_code,
    },
    radio: {
      voiceConsent: contribution.voice_source === "no_voice",
      musicRightsRequired: contribution.material_source === "third_party_unverified",
      musicRightsComplete: false,
    },
    preMaterialization: {
      sourceStatus: contribution.status,
      explicitEditorialDecision: options.explicitEditorialDecision,
      rootExists: options.rootExists ?? Boolean(contribution.private_root_archive_item_id),
      radioContributionType: contribution.contribution_type ?? null,
      radioTargetKind: options.targetKind ?? contribution.private_root_kind ?? null,
      radioProgramSelected: options.programSelected,
      radioExistingTargetSelected: options.existingTargetSelected,
    },
  });
}

export type ArtworkSubmissionReadinessSource = {
  public_protocol?: string | null;
  submission_kind?: NonNullable<CulturalCurationReadinessInput["preMaterialization"]>["artworkSubmissionKind"];
  title_suggestion?: string | null;
  context_suggestion?: string | null;
  territory_id?: string | null;
  authorship_source?: string | null;
  status?: string | null;
  archive_item_id?: string | null;
  rights_state?: string | null;
  publication_scope?: string | null;
  reuse_permission?: string | null;
  license_code?: string | null;
};

/** Pre-root artwork readiness avoids child gates that cannot exist before the private root. */
export function resolveArtworkSubmissionReadiness(
  submission: ArtworkSubmissionReadinessSource,
  options: { explicitEditorialDecision: boolean; rootExists?: boolean; assetReady?: boolean; safetyComplete?: boolean },
) {
  return resolveCulturalCurationReadiness({
    specialization: "art",
    stage: submission.status ?? "pending",
    handoffComplete: true,
    material: {
      titlePresent: Boolean(submission.title_suggestion?.trim()),
      narrativePresent: Boolean(submission.context_suggestion?.trim()),
      assetReady: options.assetReady === true,
    },
    provenanceComplete: Boolean(
      submission.public_protocol?.trim() ||
        submission.authorship_source?.trim() ||
        submission.territory_id,
    ),
    rights: {
      state: submission.rights_state,
      publicationScope: submission.publication_scope,
      reusePermission: submission.reuse_permission,
      licenseCode: submission.license_code,
      authorshipConfirmed: false,
    },
    safety: { reviewRequired: options.safetyComplete === false, reviewComplete: options.safetyComplete },
    preMaterialization: {
      sourceStatus: submission.status,
      explicitEditorialDecision: options.explicitEditorialDecision,
      rootExists: options.rootExists ?? Boolean(submission.archive_item_id),
      artworkSubmissionKind: submission.submission_kind ?? null,
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
