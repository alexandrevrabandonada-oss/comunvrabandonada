import "server-only";

import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";

export const COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS = [
  "approved",
  "needs_changes",
  "rejected",
  "withdrawn",
] as const;

export type ComunCollectiveEntityProjectionDecision =
  (typeof COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS)[number];

export type ComunCollectiveEntityProjectionState =
  | "not_published"
  | "active"
  | "withdrawn";

export type ComunCollectiveEntityProjectionQueueItem = {
  candidateId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  generatedAt: string;
  eligibilityState: "eligible_for_projection_review";
  projectionState: ComunCollectiveEntityProjectionState;
  publishedAt: string | null;
};

export type ComunCollectiveEntityProjectionDecisionResult = {
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  projectionId: string | null;
  projectionState: ComunCollectiveEntityProjectionState;
  publishedAt: string | null;
  withdrawnAt: string | null;
};

export type ComunCollectiveEntityOwnProjectionState = {
  candidateId: string;
  projectionId: string | null;
  projectionState: ComunCollectiveEntityProjectionState;
  publishedAt: string | null;
  withdrawnAt: string | null;
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

function toQueueItem(
  row: Record<string, unknown>,
): ComunCollectiveEntityProjectionQueueItem {
  return {
    candidateId: row.candidate_id as string,
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
    generatedAt: row.generated_at as string,
    eligibilityState: row.eligibility_state as "eligible_for_projection_review",
    projectionState:
      row.projection_state as ComunCollectiveEntityProjectionState,
    publishedAt: row.published_at as string | null,
  };
}

function toDecisionResult(
  row: Record<string, unknown>,
): ComunCollectiveEntityProjectionDecisionResult {
  return {
    candidateId: row.candidate_id as string,
    decision: row.decision as ComunCollectiveEntityProjectionDecision,
    projectionId: row.projection_id as string | null,
    projectionState:
      row.projection_state as ComunCollectiveEntityProjectionState,
    publishedAt: row.published_at as string | null,
    withdrawnAt: row.withdrawn_at as string | null,
  };
}

function toOwnState(
  row: Record<string, unknown>,
): ComunCollectiveEntityOwnProjectionState {
  return {
    candidateId: row.candidate_id as string,
    projectionId: row.projection_id as string | null,
    projectionState:
      row.projection_state as ComunCollectiveEntityProjectionState,
    publishedAt: row.published_at as string | null,
    withdrawnAt: row.withdrawn_at as string | null,
  };
}

export async function listCollectiveEntityProjectionReviewQueue(): Promise<
  ComunCollectiveEntityProjectionQueueItem[]
> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_projection_review_queue",
    { p_publisher_user_id: userId },
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => toQueueItem(row));
}

export async function decideCollectiveEntityProjection(input: {
  requestId: string;
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  notePrivate?: string | null;
}): Promise<ComunCollectiveEntityProjectionDecisionResult | null> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_projection_decide",
    {
      p_request_id: input.requestId,
      p_publisher_user_id: userId,
      p_candidate_id: input.candidateId,
      p_decision: input.decision,
      p_note_private: input.notePrivate ?? null,
    },
  );
  if (error) throw error;
  return data?.[0]
    ? toDecisionResult(data[0] as Record<string, unknown>)
    : null;
}

export async function listOwnCollectiveEntityProjectionStates(): Promise<
  ComunCollectiveEntityOwnProjectionState[]
> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_entity_server_projection_list_own",
    { p_actor_user_id: userId },
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => toOwnState(row));
}
