import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServiceSupabaseClient: () => state.client }));
import { catalog } from "./core";
import { learningSnapshot } from "./server";
import { listCommunityWorkGroups } from "../community-work-groups";

describe("learning and group task minimization", () => {
  it("returns only public tasks from the learner's pauta scope", async () => {
    state.client = createClient("https://local-test.invalid", "synthetic-test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input) => {
        const url = new URL(String(input));
        let data: unknown = [];
        if (url.pathname.endsWith("/comun_learning_programs")) data = { version: catalog.program.version };
        if (url.pathname.endsWith("/comun_learning_enrollments")) data = { saved_resource_ids: [] };
        if (url.pathname.endsWith("/comun_pauta_memberships")) data = [{ pauta_id: "pauta" }];
        if (url.pathname.endsWith("/comun_pauta_tasks")) {
          expect(url.searchParams.get("pauta_id")).toBe("in.(pauta)");
          data = [{ id: "public", visibility: "public" }, { id: "internal", visibility: "internal" }]
            .filter(row => !url.searchParams.has("visibility") || `eq.${row.visibility}` === url.searchParams.get("visibility"));
        }
        return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
      } },
    });
    expect((await learningSnapshot("learner")).tasks.map(task => task.id)).toEqual(["public"]);
  });

  it("does not request unused nested tasks in community groups", async () => {
    state.client = createClient("https://local-test.invalid", "synthetic-test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("select")).not.toContain("comun_pauta_tasks");
        expect(url.searchParams.get("community.slug")).toBe("eq.community");
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      } },
    });
    expect(await listCommunityWorkGroups("community")).toEqual([]);
  });
});
