import "server-only";

import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ComunCollectiveEntityType } from "@/lib/comun-collective-entity-consent";

export const COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS = [
  "publish",
  "hold",
  "reject",
] as const;

export type ComunCollectiveEntityProjectionDecision =
  (typeof COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS)[number];

export type ComunCollectiveEntityProjectionQueueItem = {
  candidateId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  generatedAt: string;
  projectionDecisionState:
    | "pending"
    | ComunCollectiveEntityProjectionDecision;
  projectionState: "not_published" | "active" | "suppressed";
};

export type ComunCollectiveEntityProjectionDecisionResult = {
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  publicProjectionId: string | null;
  projectionState: "not_published" | "active" | "suppressed";
  publicName: string;
  entityType: ComunCollectiveEntityType;
};

export type ComunCollectiveEntityPublicProjection = {
  projectionId: string;
  publicName: string;
  entityType: ComunCollectiveEntityType;
  publishedAt: string;
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
    projectionDecisionState:
      row.projection_decision_state as ComunCollectiveEntityProjectionQueueItem["projectionDecisionState"],
    projectionState:
      row.projection_state as ComunCollectiveEntityProjectionQueueItem["projectionState"],
  };
}

function toDecisionResult(
  row: Record<string, unknown>,
): ComunCollectiveEntityProjectionDecisionResult {
  return {
    candidateId: row.candidate_id as string,
    decision:
      row.decision as ComunCollectiveEntityProjectionDecision,
    publicProjectionId: row.public_projection_id as string | null,
    projectionState:
      row.projection_state as ComunCollectiveEntityProjectionDecisionResult["projectionState"],
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
  };
}

function toPublicProjection(
  row: Record<string, unknown>,
): ComunCollectiveEntityPublicProjection {
  return {
    projectionId: row.projection_id as string,
    publicName: row.public_name as string,
    entityType: row.entity_type as ComunCollectiveEntityType,
    publishedAt: row.published_at as string,
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
  rationalePrivate: string;
}): Promise<ComunCollectiveEntityProjectionDecisionResult | null> {
  const { service, userId } = await requireAuthenticatedServiceClient();
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_projection_decide",
    {
      p_request_id: input.requestId,
      p_publisher_user_id: userId,
      p_candidate_id: input.candidateId,
      p_decision: input.decision,
      p_rationale_private: input.rationalePrivate,
    },
  );
  if (error) throw error;
  return data?.[0]
    ? toDecisionResult(data[0] as Record<string, unknown>)
    : null;
}

export async function listSanitizedCollectiveEntityPublicProjections(): Promise<
  ComunCollectiveEntityPublicProjection[]
> {
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("COMUN_RELATA_ENTITY_RUNTIME_UNAVAILABLE");
  const { data, error } = await service.rpc(
    "comun_relata_collective_entity_server_public_projection_list",
  );
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) =>
    toPublicProjection(row),
  );
}
