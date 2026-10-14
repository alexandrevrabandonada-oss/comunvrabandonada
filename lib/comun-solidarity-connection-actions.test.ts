import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  required: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  review: vi.fn(),
  withdraw: vi.fn(),
  signOut: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`);
  },
}));
vi.mock("@/lib/community-auth", () => ({
  getCommunitySession: mocks.session,
  requireCommunitySession: mocks.required,
}));
vi.mock("@/lib/server/comun-solidarity-organization-governance", () => ({
  getPublicSolidarityOrganizationDetail: mocks.detail,
}));
vi.mock("@/lib/server/comun-solidarity-private-connections", () => ({
  createSolidarityConnection: mocks.create,
  reviewSolidarityConnection: mocks.review,
  withdrawSolidarityConnection: mocks.withdraw,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signOut: mocks.signOut },
  }),
  createServiceSupabaseClient: () => null,
  createPublicSupabaseClient: () => null,
}));
import {
  createSolidarityConnectionAction,
  reviewSolidarityConnectionAction,
  withdrawSolidarityConnectionAction,
} from "../app/comun/cooperativas/[slug]/connection-actions";
import { logoutCommunity } from "../app/actions";
const actor = "a5000000-0000-4000-8000-000000000001";
const item = "a5000000-0000-4000-8000-000000000021";
const organization = "a5000000-0000-4000-8000-000000000011";
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    subject_kind: "offer",
    subject_id: item,
    subject_slug: "oferta-lab",
    organization_slug: "organizacao-lab",
    organization_territory_id: organization,
    request_id: "a5000000-0000-4000-8000-000000000031",
    connection_message: "Gostaria de conhecer esta oferta.",
    protected_contact: "member@example.invalid",
    consent_to_contact: "yes",
  }))
    data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [
    "COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED",
    "COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED",
    "COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED",
  ])
    vi.stubEnv(key, "enabled");
  mocks.session.mockResolvedValue({
    user: { id: actor },
    profile: { status: "active" },
  });
  mocks.required.mockResolvedValue({ user: { id: actor } });
  mocks.detail.mockResolvedValue({
    organization: { territoryId: organization },
    offers: [{ id: item, slug: "oferta-lab" }],
    needs: [],
  });
  mocks.create.mockResolvedValue([
    { connection_state: "pending", idempotent: false },
  ]);
  mocks.review.mockResolvedValue(undefined);
  mocks.withdraw.mockResolvedValue(undefined);
});
describe("SOC-D08 real actions with controlled Auth/RPC dependencies", () => {
  it("requires server session before private fields/write, returns safe context and no persistence promise", async () => {
    mocks.session.mockResolvedValue(null);
    const data = form();
    data.delete("protected_contact");
    data.delete("consent_to_contact");
    const result = await createSolidarityConnectionAction(
      { state: "idle" },
      data,
    );
    expect(result.state).toBe("auth_required");
    if (result.state !== "auth_required") throw new Error("missing login");
    expect(
      new URL(result.loginHref, "http://local").searchParams.get("returnTo"),
    ).toBe("/comun/cooperativas/organizacao-lab/ofertas/oferta-lab/interesse");
    expect(result.message).not.toContain("continua apenas neste aparelho");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses only validated session actor; ignores client identity substitution", async () => {
    const data = form();
    data.set("member_user_id", "attacker");
    data.set("actor_user_id", "attacker");
    expect(
      (await createSolidarityConnectionAction({ state: "idle" }, data)).state,
    ).toBe("success");
    expect(mocks.create.mock.calls[0][0].memberUserId).toBe(actor);
    expect(mocks.detail).toHaveBeenCalledWith("organizacao-lab");
  });
  it.each(["suspended", "deactivation_requested", "deactivated", "archived"])(
    "rejects inactive account %s",
    async (status) => {
      mocks.session.mockResolvedValue({
        user: { id: actor },
        profile: { status },
      });
      expect(
        (await createSolidarityConnectionAction({ state: "idle" }, form()))
          .state,
      ).toBe("error");
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it.each(["protected_contact", "consent_to_contact"])(
    "requires current %s",
    async (field) => {
      const data = form();
      data.delete(field);
      expect(
        (await createSolidarityConnectionAction({ state: "idle" }, data)).state,
      ).toBe("error");
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it("revalidates unpublished item/organization after authentication", async () => {
    mocks.detail.mockResolvedValue(null);
    expect(
      (await createSolidarityConnectionAction({ state: "idle" }, form())).state,
    ).toBe("error");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires exact organization and item even when slugs are supplied", async () => {
    const data = form();
    data.set("organization_territory_id", item);
    expect(
      (await createSolidarityConnectionAction({ state: "idle" }, data)).state,
    ).toBe("error");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps a duplicate as existing, not a new contact update", async () => {
    mocks.create.mockResolvedValue([
      { connection_state: "accepted", idempotent: true },
    ]);
    expect(
      await createSolidarityConnectionAction({ state: "idle" }, form()),
    ).toMatchObject({ state: "success", replayed: true });
  });
  it.each(["withdrawn", "rejected", "archived"])(
    "does not misreport terminal replay %s as sent",
    async (connection_state) => {
      mocks.create.mockResolvedValue([{ connection_state, idempotent: true }]);
      expect(
        (await createSolidarityConnectionAction({ state: "idle" }, form()))
          .state,
      ).toBe("error");
    },
  );
  it("real review action passes only session actor and preserves rejection on forbidden scope", async () => {
    const data = form();
    data.set("interest_id", item);
    data.set("decision", "accept");
    mocks.review.mockRejectedValue(
      new Error("COMUN_SOLIDARITY_CONNECTION_FORBIDDEN"),
    );
    await expect(reviewSolidarityConnectionAction(data)).rejects.toThrow(
      "conexao=erro",
    );
    expect(mocks.review.mock.calls[0][0].actorUserId).toBe(actor);
  });
  it("real withdrawal uses session owner and follows the existing error route", async () => {
    const data = form();
    data.set("interest_id", item);
    mocks.withdraw.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(withdrawSolidarityConnectionAction(data)).rejects.toThrow(
      "conexao=erro",
    );
    expect(mocks.withdraw.mock.calls[0][0].memberUserId).toBe(actor);
  });
  it("executes actual logoutCommunity action, signOut before redirect", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(logoutCommunity()).rejects.toThrow("REDIRECT:/comun/entrar");
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
