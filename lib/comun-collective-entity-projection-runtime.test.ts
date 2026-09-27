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
  listSanitizedCollectiveEntityPublicProjections,
} from "./comun-collective-entity-projection-runtime";

beforeEach(() => {
  auth.user = null;
  auth.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  auth.serviceCreated.mockReset();
});

describe("R5 collective entity projection runtime", () => {
  it("requires authenticated publisher identity before queue or decision service access", async () => {
    await expect(listCollectiveEntityProjectionReviewQueue()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(
      decideCollectiveEntityProjection({
        requestId: "r",
        candidateId: "c",
        decision: "hold",
        rationalePrivate: "Aguardar nova checagem.",
      }),
    ).rejects.toThrow("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
    expect(auth.serviceCreated).not.toHaveBeenCalled();
  });

  it("derives publisher identity only from the server session", async () => {
    auth.user = { id: "publisher-a" };
    await decideCollectiveEntityProjection({
      requestId: "request-a",
      candidateId: "candidate-a",
      decision: "publish",
      rationalePrivate: "Projeção sanitizada aprovada.",
      publisherUserId: "forged-user",
    } as never);
    expect(auth.rpc).toHaveBeenCalledWith(
      "comun_relata_collective_entity_server_projection_decide",
      {
        p_request_id: "request-a",
        p_publisher_user_id: "publisher-a",
        p_candidate_id: "candidate-a",
        p_decision: "publish",
        p_rationale_private: "Projeção sanitizada aprovada.",
      },
    );
  });

  it("keeps private rationale and authority out of decision DTO", async () => {
    auth.user = { id: "publisher-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [{
        candidate_id: "candidate-a",
        decision: "publish",
        public_projection_id: "projection-a",
        projection_state: "active",
        public_name: "Coletivo A",
        entity_type: "collective",
        rationale_private: "private",
        publisher_profile_id: "private",
        publisher_auth_user_id: "private",
      }],
      error: null,
    });
    expect(
      await decideCollectiveEntityProjection({
        requestId: "request-a",
        candidateId: "candidate-a",
        decision: "publish",
        rationalePrivate: "Projeção sanitizada aprovada.",
      }),
    ).toEqual({
      candidateId: "candidate-a",
      decision: "publish",
      publicProjectionId: "projection-a",
      projectionState: "active",
      publicName: "Coletivo A",
      entityType: "collective",
    });
  });

  it("keeps private and internal ids out of public projection DTO", async () => {
    auth.rpc.mockResolvedValueOnce({
      data: [{
        projection_id: "projection-a",
        public_name: "Coletivo A",
        entity_type: "collective",
        published_at: "2026-09-26T00:00:00Z",
        candidate_id: "private",
        entity_id: "private",
        publisher_auth_user_id: "private",
        rationale_private: "private",
        source_consent_id: "private",
      }],
      error: null,
    });
    expect(await listSanitizedCollectiveEntityPublicProjections()).toEqual([{
      projectionId: "projection-a",
      publicName: "Coletivo A",
      entityType: "collective",
      publishedAt: "2026-09-26T00:00:00Z",
    }]);
  });
});
