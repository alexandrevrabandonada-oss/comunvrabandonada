import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  enabled: true,
  status: "active",
  userId: "verified-a",
}));
const release = vi.hoisted(() => vi.fn());
const revalidate = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/community-auth", () => ({
  requireCommunitySession: async () => ({
    user: { id: fake.userId },
    profile: { status: fake.status },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => ({ marker: "service" }),
}));
vi.mock("@/lib/collective-actions-release", () => ({
  requireCollectiveActionsRelease: async () => {
    if (!fake.enabled) throw new Error("not released");
  },
}));
vi.mock("@/lib/collective-action-task-release", () => ({
  releaseOwnCollectiveTask: release,
}));
vi.mock("@/lib/comun-collective-actions-canonical-feature", () => ({
  isComunCollectiveActionsCanonicalExperienceEnabled: () => false,
}));
import { releaseCollectiveActionTask } from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
  fake.enabled = true;
  fake.status = "active";
});
const form = () => {
  const data = new FormData();
  data.set("slug", "known-action");
  data.set("task_id", "task");
  data.set("member_user_id", "victim-b");
  return data;
};
it("uses the verified session and ignores a submitted foreign identity", async () => {
  await releaseCollectiveActionTask(form());
  expect(release).toHaveBeenCalledWith(
    { marker: "service" },
    { userId: "verified-a", slug: "known-action", taskId: "task" },
  );
  expect(revalidate).toHaveBeenCalledWith("/comun/minha-participacao");
});
it("preserves the release gate", async () => {
  fake.enabled = false;
  await expect(releaseCollectiveActionTask(form())).rejects.toThrow(
    "not released",
  );
  expect(release).not.toHaveBeenCalled();
});
it.each(["suspended", "deactivated", "archived", ""])(
  "denies profile %s",
  async (status) => {
    fake.status = status;
    await expect(releaseCollectiveActionTask(form())).rejects.toThrow(
      "indisponível",
    );
    expect(release).not.toHaveBeenCalled();
  },
);
