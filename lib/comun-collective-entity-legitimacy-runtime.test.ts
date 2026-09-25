import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rpc: vi.fn(),
  serviceCreated: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: auth.user } }) },
  }),
  createServiceSupabaseClient: () => {
    auth.serviceCreated();
    return { rpc: auth.rpc };
  },
}));

import {
  listCollectiveEntityLegitimacyReviewQueue,
  listOwnCollectiveEntityLegitimacyStates,
  reviewCollectiveEntityCandidate,
} from "./comun-collective-entity-legitimacy-runtime";

beforeEach(() => {
  auth.user = null;
  auth.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  auth.serviceCreated.mockReset();
});

describe("R4 private legitimacy runtime", () => {
  it("requires authenticated server identity before any service client", async () => {
    await expect(listOwnCollectiveEntityLegitimacyStates()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(listCollectiveEntityLegitimacyReviewQueue()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(
      reviewCollectiveEntityCandidate({
        requestId: "r",
        candidateId: "c",
        reviewStage: "entity_existence",
        decision: "supported",
        basisKind: "public_source",
        basisReferencePrivate: "https://example.invalid/source",
      }),
    ).rejects.toThrow("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
    expect(auth.serviceCreated).not.toHaveBeenCalled();
  });

  it("derives reviewer identity only from the server session", async () => {
    auth.user = { id: "reviewer-a" };
    await reviewCollectiveEntityCandidate({
      requestId: "request-a",
      candidateId: "candidate-a",
      reviewStage: "representation_legitimacy",
      decision: "needs_evidence",
      basisKind: "insufficient_or_conflicting",
      basisReferencePrivate: null,
      reviewerUserId: "forged-user",
    } as never);
    expect(auth.rpc).toHaveBeenCalledWith(
      "comun_relata_collective_entity_server_candidate_review",
      {
        p_request_id: "request-a",
        p_reviewer_user_id: "reviewer-a",
        p_candidate_id: "candidate-a",
        p_review_stage: "representation_legitimacy",
        p_decision: "needs_evidence",
        p_basis_kind: "insufficient_or_conflicting",
        p_basis_reference_private: null,
      },
    );
  });

  it("keeps reviewer identity, provenance and evidence out of owner DTO", async () => {
    auth.user = { id: "owner-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "c",
        entity_id: "e",
        public_name: "Coletivo A",
        entity_type: "collective",
        candidate_state: "pending_legitimacy",
        generated_at: "2026-09-25T00:00:00Z",
        invalidated_at: null,
        invalidation_reason: null,
        entity_existence_state: "supported",
        representation_legitimacy_state: "needs_evidence",
        eligibility_state: "needs_evidence",
        reviewer_profile_id: "private",
        reviewer_auth_user_id: "private",
        basis_reference_private: "private",
        source_representation_id: "private",
        source_consent_id: "private",
      }],
      error: null,
    });
    expect(await listOwnCollectiveEntityLegitimacyStates()).toEqual([{
      candidateId: "c",
      entityId: "e",
      publicName: "Coletivo A",
      entityType: "collective",
      candidateState: "pending_legitimacy",
      generatedAt: "2026-09-25T00:00:00Z",
      invalidatedAt: null,
      invalidationReason: null,
      entityExistenceState: "supported",
      representationLegitimacyState: "needs_evidence",
      eligibilityState: "needs_evidence",
    }]);
  });

  it("keeps reviewer identity and evidence out of review result DTO", async () => {
    auth.user = { id: "reviewer-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "c",
        entity_existence_state: "supported",
        representation_legitimacy_state: "supported",
        eligibility_state: "needs_independent_review",
        reviewer_profile_id: "private",
        reviewer_auth_user_id: "private",
        basis_reference_private: "private",
        source_representation_id: "private",
      }],
      error: null,
    });
    expect(
      await reviewCollectiveEntityCandidate({
        requestId: "r",
        candidateId: "c",
        reviewStage: "representation_legitimacy",
        decision: "supported",
        basisKind: "operational_confirmation",
        basisReferencePrivate: "COMUN-R4-REFERENCE",
      }),
    ).toEqual({
      candidateId: "c",
      entityExistenceState: "supported",
      representationLegitimacyState: "supported",
      eligibilityState: "needs_independent_review",
    });
  });

  it("keeps provenance and private evidence out of reviewer queue DTO", async () => {
    auth.user = { id: "reviewer-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "c",
        public_name: "Coletivo A",
        entity_type: "collective",
        candidate_state: "pending_legitimacy",
        generated_at: "2026-09-25T00:00:00Z",
        entity_existence_state: "pending",
        representation_legitimacy_state: "pending",
        eligibility_state: "pending_review",
        entity_id: "private",
        reviewer_auth_user_id: "private",
        basis_reference_private: "private",
      }],
      error: null,
    });
    expect(await listCollectiveEntityLegitimacyReviewQueue()).toEqual([{
      candidateId: "c",
      publicName: "Coletivo A",
      entityType: "collective",
      candidateState: "pending_legitimacy",
      generatedAt: "2026-09-25T00:00:00Z",
      entityExistenceState: "pending",
      representationLegitimacyState: "pending",
      eligibilityState: "pending_review",
    }]);
  });
});
