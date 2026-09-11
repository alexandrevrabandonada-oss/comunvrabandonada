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

  it("does not publish when a safety lookup fails", async () => {
    mocks.admin.mockResolvedValue({});
    const update = vi.fn();
    mocks.database.mockReturnValue({
      rpc: vi.fn(),
      from: (table: string) => {
        const result = {
          data: table === "comun_radio_episodes" ? { title_public: "Episode" } : [],
          error: table === "comun_radio_safety_reviews" ? { message: "unavailable" } : null,
        };
        const query = {
          select: () => query,
          eq: () => query,
          single: () => query,
          maybeSingle: () => query,
          limit: () => query,
          update,
          then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    });
    await expect(publishRadioEpisode(new FormData())).rejects.toThrow("verificar os requisitos");
    expect(update).not.toHaveBeenCalled();
  });
});
