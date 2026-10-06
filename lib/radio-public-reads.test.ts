import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.database,
}));
import { getPublicEpisode, listPublicRadio } from "./radio";

const asset = {
  asset_role: "radio_public_episode",
  bucket_scope: "public_safe",
  review_status: "approved",
  rights_status: "licensed",
  public_url: "https://example.org/audio.mp3",
};
const episode = {
  archive_item_id: "episode-a",
  program_item_id: "program-a",
  title_public: "Episode",
  transcript_status: "published",
  comun_archive_assets: [asset],
};
const root = {
  id: "episode-a",
  status: "published",
  visibility: "public",
  published_at: "2026-01-01",
};
const consents = [
  {
    episode_item_id: "episode-a",
    consent_status: "approved",
    allow_comun_audio: true,
  },
];

function databaseWith(results: { data: unknown; error: unknown }[]) {
  let index = 0;
  return {
    from: vi.fn(() => {
      const result = results[index++];
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "in",
        "not",
        "order",
        "limit",
        "maybeSingle",
      ])
        chain[method] = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve);
      return chain;
    }),
  };
}
beforeEach(() => vi.resetAllMocks());

describe("radio public reads fail closed", () => {
  it.each(["root", "consents", "music", "safety", "none"])(
    "list hides episodes on failed %s verification and preserves them when reads succeed",
    async (failure) => {
      const eligibility = [[root], consents, [], []].map((data, index) => ({
        data,
        error:
          ["root", "consents", "music", "safety"][index] === failure
            ? { message: "unavailable" }
            : null,
      }));
      // Partial data accompanying an error must never authorize disclosure.
      mocks.database.mockReturnValue(
        databaseWith([
          { data: [{ title_public: "Program" }], error: null },
          { data: [episode], error: null },
          { data: [], error: null },
          ...eligibility,
        ]),
      );
      const result = await listPublicRadio();
      expect(result.episodes).toHaveLength(failure === "none" ? 1 : 0);
      expect(result.programs).toHaveLength(1);
    },
  );
  it.each(["root", "consents", "music", "safety", "none"])(
    "detail hides an episode on failed %s verification and preserves it when reads succeed",
    async (failure) => {
      const eligibility = [root, consents, [], null].map((data, index) => ({
        data,
        error:
          ["root", "consents", "music", "safety"][index] === failure
            ? { message: "unavailable" }
            : null,
      }));
      mocks.database.mockReturnValue(
        databaseWith([
          ...[
            episode,
            { content: "Transcript" },
            { title_public: "Program" },
            [asset],
            [],
            [],
            [],
          ].map((data) => ({ data, error: null })),
          ...eligibility,
        ]),
      );
      const result = await getPublicEpisode("episode");
      if (failure === "none") expect(result?.archive_item_id).toBe("episode-a");
      else expect(result).toBeNull();
    },
  );
});
