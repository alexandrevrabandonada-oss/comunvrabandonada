import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  prior: {
    state: "member",
    joined_at: "2026-07-01T00:00:00Z" as string | null,
  },
  row: {} as Record<string, unknown>,
}));
vi.mock("@/lib/community-inbox", () => ({ upsertMemberInbox: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => ({
    from: (table: string) => {
      let writing = false;
      const query = {
        select: () => query,
        eq: () => query,
        upsert: (row: Record<string, unknown>) => {
          writing = true;
          fake.row = row;
          return query;
        },
        single: async () => ({
          data:
            table === "comun_communities"
              ? { id: "c", slug: "c", name: "Community" }
              : writing
                ? { id: "m", ...fake.row }
                : fake.prior,
          error: null,
        }),
        maybeSingle: async () => ({ data: fake.prior, error: null }),
        insert: async () => ({ data: null, error: null }),
      };
      return query;
    },
  }),
}));
import { updateCommunityMembership } from "./community-membership";
beforeEach(() => {
  fake.prior = { state: "member", joined_at: "2026-07-01T00:00:00Z" };
  fake.row = {};
});
const update = (intent: "pause" | "resume" | "leave") =>
  updateCommunityMembership({ userId: "a", slug: "c", intent });
it("pause preserves approval date so voluntary resume can work", async () => {
  await update("pause");
  expect(fake.row).toMatchObject({
    state: "paused",
    joined_at: "2026-07-01T00:00:00Z",
  });
  fake.prior = { state: "paused", joined_at: fake.row.joined_at as string };
  await update("resume");
  expect(fake.row.state).toBe("member");
});
it("departure clears current admission; a stale resume cannot restore access", async () => {
  await update("leave");
  expect(fake.row).toMatchObject({ state: "left", joined_at: null });
  fake.prior = { state: "left", joined_at: "2026-07-01T00:00:00Z" };
  await update("resume");
  expect(fake.row).toMatchObject({ state: "following", joined_at: null });
});
it("a follower with an old date cannot acquire approval via pause/resume", async () => {
  fake.prior.state = "following";
  await update("pause");
  expect(fake.row.joined_at).toBeNull();
  fake.prior = { state: "paused", joined_at: null };
  await update("resume");
  expect(fake.row.state).toBe("following");
});
