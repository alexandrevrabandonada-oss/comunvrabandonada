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
  decideCollectiveEntityProjection,
  listCollectiveEntityProjectionReviewQueue,
  listOwnCollectiveEntityProjectionStates,
} from "./comun-collective-entity-projection-runtime";

beforeEach(() => {
  auth.user = null;
  auth.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  auth.serviceCreated.mockReset();
});

describe("R5 collective entity projection runtime", () => {
  it("requires authenticated server identity before service-role access", async () => {
    await expect(listCollectiveEntityProjectionReviewQueue()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(listOwnCollectiveEntityProjectionStates()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(
      decideCollectiveEntityProjection({
        requestId: "r",
        candidateId: "c",
        decision: "approved",
      }),
    ).rejects.toThrow("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
    expect(auth.serviceCreated).not.toHaveBeenCalled();
  });

  it("derives publisher identity only from the authenticated server session", async () => {
    auth.user = { id: "publisher-real" };
    await decideCollectiveEntityProjection({
      requestId: "request-a",
      candidateId: "candidate-a",
      decision: "approved",
      publisherUserId: "forged",
    } as never);
    expect(auth.rpc).toHaveBeenCalledWith(
      "comun_relata_collective_entity_server_projection_decide",
      {
        p_request_id: "request-a",
        p_publisher_user_id: "publisher-real",
        p_candidate_id: "candidate-a",
        p_decision: "approved",
        p_note_private: null,
      },
    );
  });

  it("drops private decision metadata from result DTO", async () => {
    auth.user = { id: "publisher-real" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "candidate-a",
        decision: "approved",
        projection_id: "projection-a",
        projection_state: "active",
        published_at: "2026-09-26T18:00:00Z",
        withdrawn_at: null,
        publisher_profile_id: "private",
        publisher_auth_user_id: "private",
        note_private: "private",
      }],
      error: null,
    });

    expect(
      await decideCollectiveEntityProjection({
        requestId: "request-a",
        candidateId: "candidate-a",
        decision: "approved",
      }),
    ).toEqual({
      candidateId: "candidate-a",
      decision: "approved",
      projectionId: "projection-a",
      projectionState: "active",
      publishedAt: "2026-09-26T18:00:00Z",
      withdrawnAt: null,
    });
  });

  it("keeps owner projection status minimal", async () => {
    auth.user = { id: "owner-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "candidate-a",
        projection_id: "projection-a",
        projection_state: "active",
        published_at: "2026-09-26T18:00:00Z",
        withdrawn_at: null,
        publisher_profile_id: "private",
        decision_request_id: "private",
      }],
      error: null,
    });

    expect(await listOwnCollectiveEntityProjectionStates()).toEqual([{
      candidateId: "candidate-a",
      projectionId: "projection-a",
      projectionState: "active",
      publishedAt: "2026-09-26T18:00:00Z",
      withdrawnAt: null,
    }]);
  });

  it("keeps reviewer and owner identities out of the publisher queue DTO", async () => {
    auth.user = { id: "publisher-real" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "candidate-a",
        public_name: "Coletivo A",
        entity_type: "collective",
        generated_at: "2026-09-26T17:00:00Z",
        eligibility_state: "eligible_for_projection_review",
        projection_state: "not_published",
        published_at: null,
        entity_id: "private",
        owner_user_id: "private",
        reviewer_profile_id: "private",
      }],
      error: null,
    });

    expect(await listCollectiveEntityProjectionReviewQueue()).toEqual([{
      candidateId: "candidate-a",
      publicName: "Coletivo A",
      entityType: "collective",
      generatedAt: "2026-09-26T17:00:00Z",
      eligibilityState: "eligible_for_projection_review",
      projectionState: "not_published",
      publishedAt: null,
    }]);
  });
});
