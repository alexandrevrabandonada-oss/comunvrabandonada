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
  revokeOwnCollectiveRepresentation,
  setOwnCollectiveEntityConsent,
} from "./comun-collective-entity-runtime";

beforeEach(() => {
  auth.user = null;
  auth.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  auth.serviceCreated.mockReset();
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
