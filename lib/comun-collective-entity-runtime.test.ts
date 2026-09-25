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
  createOwnCollectiveEntity,
  listOwnCollectiveEntityStates,
  listOwnCollectiveEntityCandidates,
  prepareOwnCollectiveEntityCandidate,
  revokeOwnCollectiveRepresentation,
  setOwnCollectiveEntityConsent,
} from "./comun-collective-entity-runtime";

beforeEach(() => {
  auth.user = null;
  auth.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  auth.serviceCreated.mockReset();
});

describe("R3 private candidate boundary", () => {
  it("requires session auth before the service client for prepare and list", async () => {
    await expect(
      prepareOwnCollectiveEntityCandidate({ requestId: "r", entityId: "e" }),
    ).rejects.toThrow("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
    await expect(listOwnCollectiveEntityCandidates()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    expect(auth.serviceCreated).not.toHaveBeenCalled();
  });

  it("ignores forged browser identity and public snapshot fields", async () => {
    auth.user = { id: "user-a" };
    await prepareOwnCollectiveEntityCandidate({
      requestId: "request-a",
      entityId: "entity-a",
      userId: "user-b",
      publicName: "Forged",
      candidateState: "verified",
    } as never);
    expect(auth.rpc).toHaveBeenCalledWith(
      "comun_relata_collective_entity_server_candidate_prepare",
      {
        p_request_id: "request-a",
        p_actor_user_id: "user-a",
        p_entity_id: "entity-a",
      },
    );
  });

  it("returns only eight owner DTO fields despite private provenance in RPC response", async () => {
    auth.user = { id: "user-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [
        {
          candidate_id: "c",
          entity_id: "e",
          public_name: "Coletivo",
          entity_type: "collective",
          candidate_state: "pending_legitimacy",
          generated_at: "2026-09-24T00:00:00Z",
          invalidated_at: null,
          invalidation_reason: null,
          source_representation_id: "secret",
          source_consent_id: "secret",
          user_id: "other",
          email: "private@example.invalid",
          phone: "secret",
          protocol: "secret",
          report: "secret",
          case_id: "secret",
          latitude: 1,
          longitude: 1,
          address: "secret",
          attachment: "secret",
          object_key: "secret",
          free_text: "secret",
          notes: "secret",
        },
      ],
      error: null,
    });
    expect(await listOwnCollectiveEntityCandidates()).toEqual([
      {
        candidateId: "c",
        entityId: "e",
        publicName: "Coletivo",
        entityType: "collective",
        candidateState: "pending_legitimacy",
        generatedAt: "2026-09-24T00:00:00Z",
        invalidatedAt: null,
        invalidationReason: null,
      },
    ]);
    expect(auth.rpc).toHaveBeenCalledWith(
      "comun_relata_collective_entity_server_candidate_prepare",
      { p_request_id: null, p_actor_user_id: "user-a", p_entity_id: null },
    );
  });
});

describe("R2 server-validated identity boundary", () => {
  it("rejects all operations without a server-authenticated user before creating service client", async () => {
    await expect(
      createOwnCollectiveEntity({
        requestId: "r",
        publicName: "Name",
        entityType: "collective",
      }),
    ).rejects.toThrow("COMUN_RELATA_ENTITY_AUTH_REQUIRED");
    await expect(setOwnCollectiveEntityConsent("e", true)).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(revokeOwnCollectiveRepresentation("e")).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    await expect(listOwnCollectiveEntityStates()).rejects.toThrow(
      "COMUN_RELATA_ENTITY_AUTH_REQUIRED",
    );
    expect(auth.serviceCreated).not.toHaveBeenCalled();
  });

  it("passes only the session user as the internal actor even with forged input", async () => {
    auth.user = { id: "user-a" };
    await createOwnCollectiveEntity({
      requestId: "request-a",
      publicName: "Coletivo A",
      entityType: "collective",
      userId: "user-b",
      actorUserId: "user-b",
    } as never);
    await setOwnCollectiveEntityConsent("entity-a", true);
    await revokeOwnCollectiveRepresentation("entity-a");
    await listOwnCollectiveEntityStates();
    expect(auth.rpc.mock.calls.map(([, args]) => args.p_actor_user_id)).toEqual(
      ["user-a", "user-a", "user-a", "user-a"],
    );
    expect(auth.rpc.mock.calls[0][1]).not.toHaveProperty("userId");
    expect(auth.rpc.mock.calls[0][1]).not.toHaveProperty("actorUserId");
  });

  it("projects only the seven allowed owner fields", async () => {
    auth.user = { id: "user-a" };
    auth.rpc.mockResolvedValueOnce({
      data: [
        {
          entity_id: "entity-a",
          public_name: "Coletivo A",
          entity_type: "collective",
          entity_state: "active",
          representation_status: "declared",
          consent_active: true,
          consent_withdrawn: false,
          user_id: "user-b",
          email: "private@example.invalid",
          reports: ["private"],
          location: "private",
        },
      ],
      error: null,
    });
    const [row] = await listOwnCollectiveEntityStates();
    expect(row).toEqual({
      entityId: "entity-a",
      publicName: "Coletivo A",
      entityType: "collective",
      entityState: "active",
      representationStatus: "declared",
      consentActive: true,
      consentWithdrawn: false,
    });
  });
});
