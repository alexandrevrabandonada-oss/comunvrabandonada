import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as server from "@/lib/supabase/server";
import { unifiedPublicSearch } from "@/lib/unified-search";

const sources = [
  ["comun_communities", "comunidade"],
  ["comun_pauta_spaces", "pauta"],
  ["comun_hub_territories", "território"],
  ["comun_mobilization_actions", "ação"],
  ["comun_hub_results", "resultado"],
  ["comun_pauta_dossier_publication_snapshots", "documento"],
  ["comun_archive_items", "memória"],
  ["comun_archive_artworks", "obra"],
  ["comun_radio_programs", "programa"],
  ["comun_radio_episodes", "episódio"],
  ["comun_archive_collections", "coleção"],
] as const;
const factory = server.createServiceSupabaseClient;
let baseline: Awaited<ReturnType<typeof unifiedPublicSearch>>;

beforeAll(async () => {
  if (process.env.COMUN_PUBLIC_SEARCH_DISPOSABLE !== "1")
    throw new Error("Explicit disposable run required");
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
  )
    throw new Error("Remote Supabase refused before any query");
  const claims = JSON.parse(
    Buffer.from(
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").split(".")[1],
      "base64url",
    ).toString(),
  );
  expect(claims.role).toBe("service_role");
  // Bounded schema cache warmup, only this local synthetic table.
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await factory()!
      .from("comun_archive_artworks")
      .select("archive:comun_archive_items!inner(slug)");
    if (!response.error) break;
    if (attempt === 19) throw new Error("Disposable schema cache not ready");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  baseline = await unifiedPublicSearch("searchproof");
  expect(new Set(baseline.results.map((row) => row.type)).size).toBe(11);
});
afterEach(() => vi.restoreAllMocks());

// Retain the actual fluent PostgREST builder and its real HTTP response. Only
// inject data+error at the result boundary: PostgREST itself returns null data
// for HTTP errors, so pretending it natively returns partial rows would be false.
function partialError(query: object): object {
  return new Proxy(query, {
    get(target, key) {
      if (key === "then")
        return (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown,
        ) =>
          Promise.resolve(
            target as PromiseLike<{ data: unknown; error: unknown }>,
          )
            .then((response) => {
              expect(response.error).toBeNull();
              expect(
                Array.isArray(response.data) && response.data.length > 0,
              ).toBe(true);
              return {
                ...response,
                error: { message: "partial-private-diagnostic" },
              };
            })
            .then(resolve, reject);
      const value = Reflect.get(target, key);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        partialError(Reflect.apply(value, target, args));
    },
  });
}
function failSource(table: string, partial: boolean) {
  const db = factory()!;
  vi.spyOn(server, "createServiceSupabaseClient").mockReturnValue(
    new Proxy(db, {
      get(target, key) {
        if (key !== "from") return Reflect.get(target, key);
        return (name: string) => {
          if (name !== table) return target.from(name);
          return partial
            ? partialError(target.from(name))
            : target.from("missing_search_source");
        };
      },
    }),
  );
  return db;
}
describe("real local PostgREST public disclosure", () => {
  it("service_role can read all controls but search requires public nonarchived territories", async () => {
    const controls = await factory()!
      .from("comun_hub_territories")
      .select("slug");
    expect(controls.error).toBeNull();
    expect(controls.data).toHaveLength(9);
    expect(
      (await unifiedPublicSearch("searchproof", { type: "território" })).results
        .map((row) => row.href)
        .sort(),
    ).toEqual([
      "/comun/territorios/territory-public-active",
      "/comun/territorios/territory-public-monitoring",
    ]);
  });
  it("inner relational filters require both published public root and published artwork", async () => {
    const controls = await factory()!
      .from("comun_archive_artworks")
      .select(
        "title_public,archive:comun_archive_items!inner(slug,status,visibility)",
      );
    expect(controls.error).toBeNull();
    expect(controls.data).toHaveLength(20);
    expect(
      (await unifiedPublicSearch("searchproof", { type: "obra" })).results.map(
        (row) => ({ title: row.title, href: row.href }),
      ),
    ).toEqual([
      {
        title: "searchproof artwork published public",
        href: "/comun/acervo/arte/root-published-public",
      },
    ]);
  });
  it.each(sources)(
    "real HTTP error in %s retains every healthy source",
    async (table, type) => {
      const db = failSource(table, false);
      const control = await db.from("missing_search_source").select("*");
      expect(control.error).not.toBeNull();
      expect(control.data).toBeNull();
      const result = await unifiedPublicSearch("searchproof");
      expect(result.results).toEqual(
        baseline.results.filter((row) => row.type !== type),
      );
      expect(JSON.stringify(result)).not.toContain("missing_search_source");
    },
  );
  it.each(sources)(
    "discards real rows with injected partial error from %s",
    async (table, type) => {
      failSource(table, true);
      const result = await unifiedPublicSearch("searchproof");
      expect(result.results).toEqual(
        baseline.results.filter((row) => row.type !== type),
      );
      expect(JSON.stringify(result)).not.toContain(
        "partial-private-diagnostic",
      );
    },
  );
  it("retains map fallback alongside healthy sources during a real source failure", async () => {
    const healthy = await unifiedPublicSearch("calçada");
    failSource("comun_archive_artworks", false);
    const failed = await unifiedPublicSearch("calçada");
    expect(healthy.results.some((row) => row.type === "obra")).toBe(true);
    expect(failed.results).toEqual(
      healthy.results.filter((row) => row.type !== "obra"),
    );
    expect(failed.results.some((row) => row.type === "ferramenta")).toBe(true);
  });
});
