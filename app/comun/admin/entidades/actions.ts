"use server";

import {
  listCollectiveEntityLegitimacyReviewQueue,
  reviewCollectiveEntityCandidate,
  type ComunCollectiveEntityReviewBasis,
  type ComunCollectiveEntityReviewDecision,
  type ComunCollectiveEntityReviewStage,
} from "@/lib/comun-collective-entity-legitimacy-runtime";

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
