import "server-only";

import {
  SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES,
  SOLIDARITY_ONBOARDING_STATES,
  type PrivateSolidarityOrganizationOnboardingReviewV1,
  type PrivateSolidarityOrganizationOnboardingSummaryV1,
  type PrivateSolidarityOrganizationOnboardingV1,
  type SolidarityOnboardingOrganizationType,
} from "@/lib/comun-solidarity-organization-onboarding";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type RpcRow = Record<string, unknown>;

function allowlisted<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function text(value: unknown, maximum = 1200) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function iso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
}

async function onboardingRpc(name: string, parameters: Record<string, unknown>) {
  const database = createServiceSupabaseClient();
  if (!database)
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_DATABASE_UNAVAILABLE");
  const result = await database.rpc(name, parameters);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function firstRow(raw: unknown) {
  return Array.isArray(raw) ? (raw[0] as RpcRow | undefined) : undefined;
}

export async function createSolidarityOrganizationOnboardingDraft(input: {
  requestId: string;
  applicantUserId: string;
  organizationName: string;
}) {
  const row = firstRow(
    await onboardingRpc(
      "comun_create_solidarity_organization_onboarding_draft_v1",
      {
        p_request_id: input.requestId,
        p_applicant_user_id: input.applicantUserId,
        p_organization_name_candidate: input.organizationName,
      },
    ),
  );
  if (!row) throw new Error("COMUN_SOLIDARITY_ONBOARDING_CREATE_FAILED");
  if (row.state === "existing_organization") {
    const slug = text(row.existing_organization_slug, 120);
    const name = text(row.existing_organization_name, 200);
    if (!slug || !name)
      throw new Error("COMUN_SOLIDARITY_ONBOARDING_EXISTING_INVALID");
    return { kind: "existing" as const, slug, name };
  }
  const continuationToken = text(row.continuation_token, 80);
  if (!continuationToken)
    throw new Error("COMUN_SOLIDARITY_ONBOARDING_CREATE_FAILED");
  return { kind: "draft" as const, continuationToken };
}

export async function updateSolidarityOrganizationOnboarding(input: {
  requestId: string;
  continuationToken: string;
  applicantUserId: string;
  organizationName: string;
  organizationType: SolidarityOnboardingOrganizationType;
  presentation: string;
  serviceTerritory: string | null;
  publicContactCandidate: string | null;
  publicContactPublicationAuthorized: boolean;
  publicSourceUrlCandidate: string | null;
  participationNotePrivate: string;
}) {
  await onboardingRpc("comun_update_solidarity_organization_onboarding_v1", {
    p_request_id: input.requestId,
    p_continuation_token: input.continuationToken,
    p_applicant_user_id: input.applicantUserId,
    p_organization_name_candidate: input.organizationName,
    p_organization_type_candidate: input.organizationType,
    p_presentation_candidate: input.presentation,
    p_service_territory_candidate: input.serviceTerritory,
    p_public_contact_candidate: input.publicContactCandidate,
    p_public_contact_publication_authorized:
      input.publicContactPublicationAuthorized,
    p_public_source_url_candidate: input.publicSourceUrlCandidate,
    p_participation_note_private: input.participationNotePrivate,
  });
}

export async function submitSolidarityOrganizationOnboarding(input: {
  requestId: string;
  continuationToken: string;
  applicantUserId: string;
}) {
  await onboardingRpc("comun_submit_solidarity_organization_onboarding_v1", {
    p_request_id: input.requestId,
    p_continuation_token: input.continuationToken,
    p_applicant_user_id: input.applicantUserId,
  });
}

export async function withdrawSolidarityOrganizationOnboarding(input: {
  requestId: string;
  continuationToken: string;
  applicantUserId: string;
}) {
  await onboardingRpc("comun_withdraw_solidarity_organization_onboarding_v1", {
    p_request_id: input.requestId,
    p_continuation_token: input.continuationToken,
    p_applicant_user_id: input.applicantUserId,
  });
}

function projectOnboarding(row: RpcRow) {
  const onboardingId = text(row.onboarding_id, 80);
  const continuationToken = text(row.continuation_token, 80);
  const organizationName = text(row.organization_name_candidate, 160);
  const state = allowlisted(row.state, SOLIDARITY_ONBOARDING_STATES);
  const updatedAt = iso(row.updated_at);
  if (!onboardingId || !continuationToken || !organizationName || !state || !updatedAt)
    return null;
  return {
    onboardingId,
    continuationToken,
    organizationName,
    state,
    reviewMessagePrivate: text(row.review_message_private, 600),
    approvedTerritoryId: text(row.approved_territory_id, 80),
    updatedAt,
  } satisfies PrivateSolidarityOrganizationOnboardingSummaryV1;
}

export async function listMySolidarityOrganizationOnboardings(
  applicantUserId: string,
): Promise<PrivateSolidarityOrganizationOnboardingSummaryV1[]> {
  const raw = await onboardingRpc(
    "comun_list_my_solidarity_organization_onboarding_v1",
    { p_applicant_user_id: applicantUserId },
  );
  return ((Array.isArray(raw) ? raw : []) as RpcRow[]).flatMap((row) => {
    const projected = projectOnboarding(row);
    return projected ? [projected] : [];
  });
}

export async function getMySolidarityOrganizationOnboarding(
  continuationToken: string,
  applicantUserId: string,
): Promise<PrivateSolidarityOrganizationOnboardingV1 | null> {
  const row = firstRow(
    await onboardingRpc(
      "comun_get_my_solidarity_organization_onboarding_v1",
      {
        p_continuation_token: continuationToken,
        p_applicant_user_id: applicantUserId,
      },
    ),
  );
  if (!row) return null;
  const summary = projectOnboarding(row);
  const createdAt = iso(row.created_at);
  const organizationType =
    row.organization_type_candidate == null
      ? null
      : allowlisted(
          row.organization_type_candidate,
          SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES,
        );
  if (!summary || !createdAt || (row.organization_type_candidate != null && !organizationType))
    return null;
  return {
    ...summary,
    organizationType,
    presentation: text(row.presentation_candidate),
    serviceTerritory: text(row.service_territory_candidate, 300),
    publicContactCandidate: text(row.public_contact_candidate, 300),
    publicContactPublicationAuthorized:
      row.public_contact_publication_authorized === true,
    publicSourceUrlCandidate: text(row.public_source_url_candidate, 1000),
    participationNotePrivate: text(row.participation_note_private, 600),
    createdAt,
  };
}

export async function listSolidarityOrganizationOnboardingReviewQueue(
  actorUserId: string,
): Promise<PrivateSolidarityOrganizationOnboardingReviewV1[]> {
  const raw = await onboardingRpc(
    "comun_list_solidarity_organization_onboarding_review_queue_v1",
    { p_actor_user_id: actorUserId },
  );
  return ((Array.isArray(raw) ? raw : []) as RpcRow[]).flatMap((row) => {
    const onboardingId = text(row.onboarding_id, 80);
    const organizationName = text(row.organization_name_candidate, 160);
    const organizationType = allowlisted(
      row.organization_type_candidate,
      SOLIDARITY_ONBOARDING_ORGANIZATION_TYPES,
    );
    const presentation = text(row.presentation_candidate);
    const participationNotePrivate = text(row.participation_note_private, 600);
    const submittedAt = iso(row.submitted_at);
    const updatedAt = iso(row.updated_at);
    if (!onboardingId || !organizationName || !organizationType || !presentation || !participationNotePrivate || !submittedAt || !updatedAt)
      return [];
    return [{
      onboardingId,
      organizationName,
      organizationType,
      presentation,
      serviceTerritory: text(row.service_territory_candidate, 300),
      publicContactCandidate: text(row.public_contact_candidate, 300),
      publicContactPublicationAuthorized:
        row.public_contact_publication_authorized === true,
      publicSourceUrlCandidate: text(row.public_source_url_candidate, 1000),
      participationNotePrivate,
      state: "submitted",
      submittedAt,
      updatedAt,
    } satisfies PrivateSolidarityOrganizationOnboardingReviewV1];
  });
}

export async function reviewSolidarityOrganizationOnboarding(input: {
  requestId: string;
  onboardingId: string;
  actorUserId: string;
  decision: "needs_changes" | "reject";
  message: string;
}) {
  await onboardingRpc("comun_review_solidarity_organization_onboarding_v1", {
    p_request_id: input.requestId,
    p_onboarding_id: input.onboardingId,
    p_actor_user_id: input.actorUserId,
    p_decision: input.decision,
    p_review_message_private: input.message,
  });
}

export async function approveSolidarityOrganizationOnboarding(input: {
  requestId: string;
  onboardingId: string;
  actorUserId: string;
  confirmedOrganizationType: SolidarityOnboardingOrganizationType;
  sourceKind: "public_url" | "platform_review" | "operational_confirmation";
  sourceTitle: string;
  sourceUrl: string | null;
  sourceSummary: string;
  sourceNotePrivate: string | null;
}) {
  return onboardingRpc("comun_approve_solidarity_organization_onboarding_v1", {
    p_request_id: input.requestId,
    p_onboarding_id: input.onboardingId,
    p_actor_user_id: input.actorUserId,
    p_confirmed_organization_type: input.confirmedOrganizationType,
    p_source_kind: input.sourceKind,
    p_source_title: input.sourceTitle,
    p_source_url_public: input.sourceUrl,
    p_source_summary_public: input.sourceSummary,
    p_source_note_private: input.sourceNotePrivate,
  });
}
