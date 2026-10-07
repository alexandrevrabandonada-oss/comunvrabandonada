import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  database: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ requireComunAdmin: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.database,
}));
vi.mock("@/lib/community-auth", () => ({ getCommunitySession: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ logComunAdminAction: mocks.audit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

import {
  addRadioEditorialData,
  createRadioEpisode,
  createRadioProgram,
  publishRadioEpisode,
  unpublishRadioEpisode,
} from "@/app/comun/radio/actions";

beforeEach(() => vi.clearAllMocks());

function databaseWithReads(results: { data: unknown; error: unknown }[]) {
  const update = vi.fn();
  const from = vi.fn(() => {
    const result = results[from.mock.calls.length - 1] ?? {
      data: null,
      error: null,
    };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "limit", "single", "maybeSingle"])
      chain[method] = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    chain.update = (...args: unknown[]) => {
      update(...args);
      return chain;
    };
    return chain;
  });
  return { from, update };
}

const readyReads = () =>
  [
    {
      title_public: "Episode",
      summary_public: "Summary",
      program_item_id: "program-a",
      duration_seconds: 30,
      description_public: "Context",
      transcript_status: "published",
    },
    [
      {
        asset_role: "radio_public_episode",
        bucket_scope: "public_safe",
        review_status: "approved",
        public_url: "https://example.org/episode.mp3",
      },
    ],
    [{ id: "credit-a" }],
    [{ consent_status: "approved", allow_comun_audio: true }],
    [],
    null,
    { id: "transcript-a" },
  ].map((data) => ({ data, error: null }));

describe("radio editorial safeguards", () => {
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

  it.each([0, 1, 2, 3, 4, 5, 6, "missing_episode"])(
    "does not publish or audit success when editorial read %s fails",
    async (failure) => {
      mocks.admin.mockResolvedValue({ admin: { id: "admin-a" } });
      const results: { data: unknown; error: { message: string } | null }[] =
        Array.from({ length: 7 }, (_, index) => ({
          data: index === 0 ? { title_public: "Episode" } : [],
          error: index === failure ? { message: "unavailable" } : null,
        }));
      if (failure === "missing_episode") results[0].data = null;
      const { from, update } = databaseWithReads(results);
      mocks.database.mockReturnValue({ from });
      const form = new FormData();
      form.set("id", "episode-a");
      await expect(publishRadioEpisode(form)).rejects.toThrow(
        "verificar os requisitos",
      );
      expect(from).toHaveBeenCalledTimes(7);
      expect(update).not.toHaveBeenCalled();
      expect(mocks.audit).not.toHaveBeenCalled();
    },
  );

  it("preserves publication for an authorized editor with a complete checklist", async () => {
    mocks.admin.mockResolvedValue({ admin: { id: "admin-a", role: "editor" } });
    const database = databaseWithReads(readyReads());
    mocks.database.mockReturnValue(database);
    const form = new FormData();
    form.set("id", "episode-a");
    await publishRadioEpisode(form);
    expect(database.update).toHaveBeenCalledTimes(2);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "radio_episode_published",
        targetId: "episode-a",
      }),
    );
  });

  it("does not write when the consent checklist is empty", async () => {
    mocks.admin.mockResolvedValue({ admin: { id: "admin-a", role: "editor" } });
    const results = readyReads();
    results[3] = { data: [], error: null };
    const database = databaseWithReads(results);
    mocks.database.mockReturnValue(database);
    const form = new FormData();
    form.set("id", "episode-a");
    await expect(publishRadioEpisode(form)).rejects.toThrow("redirect");
    expect(database.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
