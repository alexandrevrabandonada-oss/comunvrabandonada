import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), database: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireComunAdmin: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createServiceSupabaseClient: mocks.database }));
vi.mock("@/lib/community-auth", () => ({ getCommunitySession: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ logComunAdminAction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  addRadioEditorialData,
  createRadioEpisode,
  createRadioProgram,
  publishRadioEpisode,
  unpublishRadioEpisode,
} from "@/app/comun/radio/actions";

beforeEach(() => vi.resetAllMocks());

describe("radio editorial authorization", () => {
  it.each([
    createRadioProgram,
    createRadioEpisode,
    publishRadioEpisode,
    addRadioEditorialData,
    unpublishRadioEpisode,
  ])("restricts %s before accessing privileged data", async (action) => {
    mocks.admin.mockRejectedValue(new Error("denied"));
    await expect(action(new FormData())).rejects.toThrow("denied");
    expect(mocks.admin).toHaveBeenCalledWith({ roles: ["admin", "editor"] });
    expect(mocks.database).not.toHaveBeenCalled();
  });

  it("does not commit when transactional review preparation fails", async () => {
    mocks.admin.mockResolvedValue({ admin: { id: "admin-a" } });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "unavailable" } });
    mocks.database.mockReturnValue({ rpc });
    await expect(publishRadioEpisode(new FormData())).rejects.toThrow("verificar os requisitos");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("comun_prepare_radio_publication_review", {
      p_episode_id: "null",
      p_admin_id: "admin-a",
    });
  });
});
