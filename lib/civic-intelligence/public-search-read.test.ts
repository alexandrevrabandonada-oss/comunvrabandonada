import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  client: vi.fn(),
  hybrid: vi.fn(),
  legacy: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: m.client,
}));
vi.mock("./search", () => ({ hybridPublicSearch: m.hybrid }));
vi.mock("@/lib/unified-search", () => ({ unifiedPublicSearch: m.legacy }));
import {
  readPublicSearch,
  resolvePublicSearchFilter,
} from "./public-search-read";
beforeEach(() => {
  vi.resetAllMocks();
  m.client.mockReturnValue({});
});
it("does not broaden contextual filters when the scoped RPC is unavailable", async () => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: { id: "internal-not-exported", slug: "praca" },
      error: null,
    })),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  m.client.mockReturnValue({ from: () => chain });
  m.hybrid.mockRejectedValue(Error("PRIVATE"));
  expect(
    (await readPublicSearch({ q: "cultura", pauta: "praca" })).availability,
  ).toBe("unavailable");
  expect(m.legacy).not.toHaveBeenCalled();
  expect(chain.eq).toHaveBeenCalledWith("visibility", "public");
});
it("preserves a healthy lexical fallback state rather than erasing failures", async () => {
  m.hybrid.mockRejectedValue(Error("PRIVATE"));
  m.legacy.mockResolvedValue({
    results: [],
    availability: "partial",
    durationMs: 1,
  });
  const result = await readPublicSearch({ q: "cultura" });
  expect(result.availability).toBe("partial");
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});
it("missing config is unavailable, not empty", async () => {
  m.client.mockReturnValue(null);
  m.hybrid.mockResolvedValue({ results: [], semanticState: "unavailable" });
  m.legacy.mockResolvedValue({ results: [], availability: "unavailable" });
  expect((await readPublicSearch({ q: "cultura" })).availability).toBe(
    "unavailable",
  );
});
it("unavailable filter lookup never leaks raw errors", async () => {
  m.client.mockReturnValue(null);
  await expect(resolvePublicSearchFilter("pauta", "praca")).rejects.toThrow(
    "SEARCH_FILTER_UNAVAILABLE",
  );
});
