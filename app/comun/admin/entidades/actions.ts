"use server";

import {
  listCollectiveEntityLegitimacyReviewQueue,
  reviewCollectiveEntityCandidate,
  type ComunCollectiveEntityReviewBasis,
  type ComunCollectiveEntityReviewDecision,
  type ComunCollectiveEntityReviewStage,
} from "@/lib/comun-collective-entity-legitimacy-runtime";
import {
  decideCollectiveEntityProjection,
  listCollectiveEntityProjectionReviewQueue,
  type ComunCollectiveEntityProjectionDecision,
} from "@/lib/comun-collective-entity-projection-runtime";

/**
 * Reviewer identity is intentionally absent from action input. The runtime
 * derives it from auth.getUser(); the database independently validates the
 * active reviewer profile and rejects self-review.
 */
export async function listCollectiveEntityLegitimacyReviewQueueAction() {
  return listCollectiveEntityLegitimacyReviewQueue();
}

export async function reviewCollectiveEntityCandidateAction(input: {
  requestId: string;
  candidateId: string;
  reviewStage: ComunCollectiveEntityReviewStage;
  decision: ComunCollectiveEntityReviewDecision;
  basisKind: ComunCollectiveEntityReviewBasis;
  basisReferencePrivate?: string | null;
}) {
  return reviewCollectiveEntityCandidate(input);
}


/**
 * R5 publisher identity is intentionally absent from action input. The server
 * derives it from auth.getUser(); the database independently requires the
 * dedicated publisher role and rejects self-publication.
 */
export async function listCollectiveEntityProjectionReviewQueueAction() {
  return listCollectiveEntityProjectionReviewQueue();
}

export async function decideCollectiveEntityProjectionAction(input: {
  requestId: string;
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  rationalePrivate: string;
}) {
  return decideCollectiveEntityProjection(input);
}
