import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.database,
}));
import { unifiedPublicSearch } from "./unified-search";
const tables = [
  "comun_communities",
  "comun_pauta_spaces",
  "comun_hub_territories",
  "comun_mobilization_actions",
  "comun_hub_results",
  "comun_pauta_dossier_publication_snapshots",
  "comun_archive_items",
  "comun_archive_artworks",
  "comun_radio_programs",
  "comun_radio_episodes",
  "comun_archive_collections",
];
const row = {
  id: "id",
  slug: "visible",
  slug_public: "visible",
  public_slug: "visible",
  name: "Visible",
  title: "Visible",
  title_public: "Visible",
  public_title: "Visible",
  summary: "Public summary",
  short_description: "Public summary",
  public_summary: "Public summary",
  objective_public: "Public summary",
  description: "Public summary",
  description_public: "Public summary",
  summary_public: "Public summary",
  item_type: "document",
  updated_at: "2026-10-01",
  archive: { slug: "visible", status: "published", visibility: "public" },
};
function database(failedTable?: string) {
  const queries = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  const from = vi.fn((table: string) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "neq", "or", "limit"])
      chain[method] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [row],
        error:
          table === failedTable
            ? { message: "Private diagnostic must not escape" }
            : null,
      }).then(resolve),
    );
    queries.set(table, chain);
    return chain;
  });
  mocks.database.mockReturnValue({ from });
  return { queries, from };
}
beforeEach(() => vi.resetAllMocks());
describe("unified public search disclosure boundaries", () => {
  it("queries only public territories and published public artwork roots", async () => {
    const { queries } = database();
    const result = await unifiedPublicSearch("Visible");
    expect(result.results).toHaveLength(11);
    expect(queries.get("comun_hub_territories")?.eq).toHaveBeenCalledWith(
      "visibility",
      "public",
    );
    expect(queries.get("comun_hub_territories")?.neq).toHaveBeenCalledWith(
      "status",
      "archived",
    );
    expect(queries.get("comun_archive_artworks")?.eq).toHaveBeenCalledWith(
      "archive.status",
      "published",
    );
    expect(queries.get("comun_archive_artworks")?.eq).toHaveBeenCalledWith(
      "archive.visibility",
      "public",
    );
  });
  it.each(tables)(
    "discards partial data from failed %s while retaining healthy sources",
    async (table) => {
      database(table);
      const result = await unifiedPublicSearch("Visible");
      expect(result.results).toHaveLength(10);
      expect(JSON.stringify(result)).not.toContain("Private diagnostic");
    },
  );
  it("preserves the canonical map fallback when the database is unavailable", async () => {
    mocks.database.mockReturnValue(null);
    const result = await unifiedPublicSearch("calçada");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe("ferramenta");
    expect(
      (await unifiedPublicSearch("calçada", { type: "obra" })).results,
    ).toEqual([]);
  });
  it("avoids database access for short queries", async () => {
    expect((await unifiedPublicSearch(" a ")).results).toEqual([]);
    expect(mocks.database).not.toHaveBeenCalled();
  });
  it("retains type filtering for healthy search results", async () => {
    database();
    const result = await unifiedPublicSearch("Visible", { type: "obra" });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].href).toBe("/comun/acervo/arte/visible");
  });
});
