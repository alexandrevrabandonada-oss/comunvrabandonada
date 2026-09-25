import "server-only";

import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";

export const COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES = [
  "entity_existence",
  "representation_legitimacy",
] as const;

export const COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS = [
  "supported",
  "needs_evidence",
  "contested",
  "unsupported",
] as const;

export const COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS = [
  "public_source",
  "existing_comun_record",
  "operational_confirmation",
  "community_confirmation",
  "insufficient_or_conflicting",
] as const;

export type ComunCollectiveEntityReviewStage =
  (typeof COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES)[number];
export type ComunCollectiveEntityReviewDecision =
  (typeof COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS)[number];
export type ComunCollectiveEntityReviewBasis =
  (typeof COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS)[number];
export type ComunCollectiveEntityReviewState =
  | "pending"
  | ComunCollectiveEntityReviewDecision;
export type ComunCollectiveEntityEligibilityState =
  | "pending_review"
  | "needs_evidence"
  | "contested"
  | "blocked"
  | "needs_independent_review"
  | "eligible_for_projection_review"
  | "invalidated";

export type ComunCollectiveEntityLegitimacyOwnerState = {
  candidateId: string;
  entityId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  candidateState: "pending_legitimacy" | "invalidated";
  generatedAt: string;
  invalidatedAt: string | null;
  invalidationReason:
    | "CONSENT_REVOKED"
    | "REPRESENTATION_REVOKED"
    | "ENTITY_ARCHIVED"
    | null;
  entityExistenceState: ComunCollectiveEntityReviewState;
  representationLegitimacyState: ComunCollectiveEntityReviewState;
  eligibilityState: ComunCollectiveEntityEligibilityState;
};

export type ComunCollectiveEntityLegitimacyQueueItem = {
  candidateId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  candidateState: "pending_legitimacy";
  generatedAt: string;
  entityExistenceState: ComunCollectiveEntityReviewState;
  representationLegitimacyState: ComunCollectiveEntityReviewState;
  eligibilityState: ComunCollectiveEntityEligibilityState;
};

export type ComunCollectiveEntityLegitimacyReviewResult = {
  candidateId: string;
  entityExistenceState: ComunCollectiveEntityReviewState;
  representationLegitimacyState: ComunCollectiveEntityReviewState;
  eligibilityState: ComunCollectiveEntityEligibilityState;
};

async function requireAuthenticatedServiceClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  return { service, userId: user.id };
}

function toOwnerState(
  row: Record<string, unknown>,
): ComunCollectiveEntityLegitimacyOwnerState {
  return {
    candidateId: row.candidate_id as string,
    entityId: row.entity_id as string,
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
    candidateState:
      row.candidate_state as ComunCollectiveEntityLegitimacyOwnerState["candidateState"],
    generatedAt: row.generated_at as string,
    invalidatedAt: row.invalidated_at as string | null,
    invalidationReason:
      row.invalidation_reason as ComunCollectiveEntityLegitimacyOwnerState["invalidationReason"],
    entityExistenceState:
      row.entity_existence_state as ComunCollectiveEntityReviewState,
    representationLegitimacyState:
      row.representation_legitimacy_state as ComunCollectiveEntityReviewState,
    eligibilityState:
      row.eligibility_state as ComunCollectiveEntityEligibilityState,
  };
}

function toQueueItem(
  row: Record<string, unknown>,
): ComunCollectiveEntityLegitimacyQueueItem {
  return {
    candidateId: row.candidate_id as string,
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
    candidateState: row.candidate_state as "pending_legitimacy",
    generatedAt: row.generated_at as string,
    entityExistenceState:
      row.entity_existence_state as ComunCollectiveEntityReviewState,
    representationLegitimacyState:
      row.representation_legitimacy_state as ComunCollectiveEntityReviewState,
    eligibilityState:
      row.eligibility_state as ComunCollectiveEntityEligibilityState,
  };
}

function toReviewResult(
  row: Record<string, unknown>,
): ComunCollectiveEntityLegitimacyReviewResult {
  return {
    candidateId: row.candidate_id as string,
    entityExistenceState:
      row.entity_existence_state as ComunCollectiveEntityReviewState,
    representationLegitimacyState:
      row.representation_legitimacy_state as ComunCollectiveEntityReviewState,
    eligibilityState:
      row.eligibility_state as ComunCollectiveEntityEligibilityState,
  };
}

export async function listOwnCollectiveEntityLegitimacyStates(): Promise<
  ComunCollectiveEntityLegitimacyOwnerState[]
> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_entity_server_candidate_legitimacy_list_own",
    { p_actor_user_id: userId },
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => toOwnerState(row));
}

export async function listCollectiveEntityLegitimacyReviewQueue(): Promise<
  ComunCollectiveEntityLegitimacyQueueItem[]
> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_candidate_review_queue",
    { p_reviewer_user_id: userId },
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => toQueueItem(row));
}

export async function reviewCollectiveEntityCandidate(input: {
  requestId: string;
  candidateId: string;
  reviewStage: ComunCollectiveEntityReviewStage;
  decision: ComunCollectiveEntityReviewDecision;
  basisKind: ComunCollectiveEntityReviewBasis;
  basisReferencePrivate?: string | null;
}): Promise<ComunCollectiveEntityLegitimacyReviewResult | null> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_candidate_review",
    {
      p_request_id: input.requestId,
      p_reviewer_user_id: userId,
      p_candidate_id: input.candidateId,
      p_review_stage: input.reviewStage,
      p_decision: input.decision,
      p_basis_kind: input.basisKind,
      p_basis_reference_private: input.basisReferencePrivate ?? null,
    },
  );
  if (error) throw error;
  return data?.[0]
    ? toReviewResult(data[0] as Record<string, unknown>)
    : null;
}
