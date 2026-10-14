import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => state.client,
  createPublicSupabaseClient: () => null,
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientFingerprint: vi.fn(),
  hashLookupValue: vi.fn(),
}));
import {
  getAdminPautaSpace,
  getPublicPautaSpaceBySlug,
  listPublicPautaTasks,
} from "./pauta-spaces";

describe("public pauta task boundary", () => {
  beforeEach(() => {
    state.client = null;
  });

  it("restricts the actual PostgREST request before pagination", async () => {
    const requests: URL[] = [];
    const rows = [
      { id: "public", pauta_id: "pauta", visibility: "public", status: "open" },
      {
        id: "internal",
        pauta_id: "pauta",
        visibility: "internal",
        status: "open",
      },
      {
        id: "archived-visibility",
        pauta_id: "pauta",
        visibility: "archived",
        status: "open",
      },
      {
        id: "archived-status",
        pauta_id: "pauta",
        visibility: "public",
        status: "archived",
      },
      {
        id: "other-pauta",
        pauta_id: "other",
        visibility: "public",
        status: "open",
      },
    ];
    state.client = createClient(
      "https://local-test.invalid",
      "synthetic-test-key",
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (input) => {
            const url = new URL(String(input));
            requests.push(url);
            const filtered = rows
              .filter(
                (row) =>
                  (!url.searchParams.has("pauta_id") ||
                    `eq.${row.pauta_id}` ===
                      url.searchParams.get("pauta_id")) &&
                  (!url.searchParams.has("visibility") ||
                    `eq.${row.visibility}` ===
                      url.searchParams.get("visibility")) &&
                  (!url.searchParams.has("status") ||
                    `neq.${row.status}` !== url.searchParams.get("status")),
              )
              .slice(0, Number(url.searchParams.get("limit") ?? 100));
            return new Response(JSON.stringify(filtered), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      },
    );
    expect(
      (await listPublicPautaTasks("pauta", 2)).map((row) => row.id),
    ).toEqual(["public"]);
    expect(requests[0].searchParams.get("visibility")).toBe("eq.public");
    expect(requests[0].searchParams.get("limit")).toBe("2");
  });

  it("returns no tasks without the server client", async () => {
    expect(await listPublicPautaTasks("pauta")).toEqual([]);
  });

  it("keeps internal tasks in administrative counts and excludes them from public counts", async () => {
    state.client = createClient(
      "https://local-test.invalid",
      "synthetic-test-key",
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (input) => {
            const url = new URL(String(input));
            let data: unknown = [];
            if (url.pathname.endsWith("/comun_pauta_spaces")) {
              data = {
                id: "pauta",
                slug: "test-pauta",
                visibility: "public",
                status: "observing",
                category: null,
                community: null,
              };
            } else if (url.pathname.endsWith("/comun_pauta_tasks")) {
              data = [
                { id: "internal", status: "open", visibility: "internal" },
                { id: "public", status: "open", visibility: "public" },
              ].filter(
                (row) =>
                  !url.searchParams.has("visibility") ||
                  `eq.${row.visibility}` === url.searchParams.get("visibility"),
              );
            }
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      },
    );
    expect(
      (await getPublicPautaSpaceBySlug("test-pauta"))?.stats.openTaskCount,
    ).toBe(1);
    expect((await getAdminPautaSpace("pauta"))?.stats.openTaskCount).toBe(2);
  });
});
