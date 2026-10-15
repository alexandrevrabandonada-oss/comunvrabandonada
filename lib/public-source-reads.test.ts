import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.database,
}));
import { readPublicArchiveItems, listPublicArchiveItems } from "./archive";
import { readPublicRadio } from "./radio";
function database(results: { data: unknown; error: unknown }[]) {
  let n = 0;
  return {
    from: vi.fn(() => {
      const result = results[n++];
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "in",
        "not",
        "order",
        "limit",
        "range",
        "gt",
        "gte",
        "lte",
        "or",
      ])
        chain[method] = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve);
      return chain;
    }),
  };
}
const ok = (data: unknown) => ({ data, error: null });
beforeEach(() => vi.resetAllMocks());
describe("SOC-D09 source availability at query boundary", () => {
  it("missing configuration is unavailable for both sources", async () => {
    mocks.database.mockReturnValue(null);
    expect((await readPublicArchiveItems()).state).toBe("unavailable");
    expect((await readPublicRadio()).state).toBe("unavailable");
  });
  it("a successful empty root needs no attachment query", async () => {
    const db = database([ok([])]);
    mocks.database.mockReturnValue(db);
    expect(await readPublicArchiveItems()).toEqual({
      state: "empty",
      items: [],
    });
    expect(db.from).toHaveBeenCalledTimes(1);
  });
  it.each([null, []])(
    "root error is unavailable, not empty (%j)",
    async (data) => {
      mocks.database.mockReturnValue(
        database([{ data, error: { message: "PRIVATE ERROR" } }]),
      );
      expect(await readPublicArchiveItems()).toEqual({
        state: "unavailable",
        items: [],
      });
    },
  );
  it("attachment query failure cannot authorize discovery", async () => {
    mocks.database.mockReturnValue(
      database([
        ok([
          {
            id: "a",
            slug: "memoria-local",
            title: "Memória",
            status: "published",
            visibility: "public",
            published_at: "2026-10-01",
          },
        ]),
        { data: [], error: { message: "PRIVATE" } },
      ]),
    );
    expect((await readPublicArchiveItems()).state).toBe("unavailable");
  });
  it("a thrown transport failure is unavailable and legacy list stays compatible", async () => {
    mocks.database.mockImplementation(() => {
      throw Error("PRIVATE");
    });
    expect(await listPublicArchiveItems()).toEqual([]);
    expect((await readPublicRadio()).state).toBe("unavailable");
  });
  it("radio successful empty queries are empty", async () => {
    mocks.database.mockReturnValue(database([ok([]), ok([]), ok([])]));
    expect((await readPublicRadio()).state).toBe("empty");
  });
  it.each([0, 1, 2])(
    "radio initial query %i failure is unavailable",
    async (index) => {
      mocks.database.mockReturnValue(
        database(
          [0, 1, 2].map((n) => ({
            data: [],
            error: n === index ? { message: "PRIVATE" } : null,
          })),
        ),
      );
      expect(await readPublicRadio()).toEqual({
        state: "unavailable",
        programs: [],
        episodes: [],
        schedule: [],
      });
    },
  );
});
