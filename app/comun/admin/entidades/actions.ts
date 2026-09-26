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
 * Publication authority is also server-derived. Browser input can choose only
 * the candidate, decision and private note; the runtime/database resolve the
 * authenticated publisher profile and enforce separation from R4 reviewers.
 */
export async function listCollectiveEntityProjectionReviewQueueAction() {
  return listCollectiveEntityProjectionReviewQueue();
}

export async function decideCollectiveEntityProjectionAction(input: {
  requestId: string;
  candidateId: string;
  decision: ComunCollectiveEntityProjectionDecision;
  notePrivate?: string | null;
}) {
  return decideCollectiveEntityProjection(input);
}
