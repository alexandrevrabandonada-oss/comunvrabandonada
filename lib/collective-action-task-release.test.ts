import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { releaseOwnCollectiveTask } from "./collective-action-task-release";

const input = { userId: "verified-a", slug: "public-action", taskId: "task-a" };
let calls: Array<[string, ...unknown[]]>;
let replies: Array<{ data: unknown; error: unknown }>;
const db = {
  from(table: string) {
    calls.push(["from", table]);
    const query = {
      select: (...args: unknown[]) => record("select", ...args),
      eq: (...args: unknown[]) => record("eq", ...args),
      update: (...args: unknown[]) => record("update", ...args),
      maybeSingle: async () => replies.shift(),
    };
    function record(name: string, ...args: unknown[]) {
      calls.push([name, ...args]);
      return query;
    }
    return query;
  },
} as unknown as SupabaseClient;

beforeEach(() => {
  calls = [];
  replies = [
    { data: { id: "own-assignment" }, error: null },
    { data: { id: "own-assignment" }, error: null },
  ];
});

describe("voluntary return of an owned collective responsibility", () => {
  it("scopes read and conditional update to the verified owner and task", async () => {
    await releaseOwnCollectiveTask(db, input);
    expect(
      calls.filter((x) => x[0] === "eq" && x[1] === "member_user_id"),
    ).toEqual([
      ["eq", "member_user_id", "verified-a"],
      ["eq", "member_user_id", "verified-a"],
    ]);
    expect(calls).toContainEqual(["eq", "task.action.slug", "public-action"]);
    expect(calls).toContainEqual(["eq", "id", "own-assignment"]);
    expect(
      calls.filter((x) => x[0] === "eq" && x[1] === "status"),
    ).toHaveLength(2);
    expect(calls.find((x) => x[0] === "update")?.[1]).toEqual({
      status: "released",
      released_at: expect.any(String),
    });
    expect(
      calls
        .filter((x) => x[0] === "from")
        .every((x) => x[1] === "comun_collective_action_task_assignments"),
    ).toBe(true);
  });
  it("does not require an open/public action or active community to relinquish", async () => {
    await releaseOwnCollectiveTask(db, input);
    expect(
      calls.some((x) =>
        ["visibility", "action.status", "membership_id"].includes(String(x[1])),
      ),
    ).toBe(false);
  });
  it.each([
    "foreign assignment",
    "unknown task",
    "wrong action",
    "already returned",
  ])("denies %s without mutation", async () => {
    replies[0] = { data: null, error: null };
    await expect(releaseOwnCollectiveTask(db, input)).rejects.toThrow(
      "Não foi possível liberar",
    );
    expect(calls.some((x) => x[0] === "update")).toBe(false);
  });
  it("fails closed on read errors", async () => {
    replies[0] = { data: null, error: { message: "private database details" } };
    await expect(releaseOwnCollectiveTask(db, input)).rejects.toThrow(
      "Atualize e tente novamente",
    );
    expect(calls.some((x) => x[0] === "update")).toBe(false);
  });
  it.each([
    { data: null, error: null },
    { data: null, error: { message: "offline" } },
  ])("never confirms a lost race or failed update", async (reply) => {
    replies[1] = reply;
    await expect(releaseOwnCollectiveTask(db, input)).rejects.toThrow(
      "Não foi possível liberar",
    );
  });
  it("rejects missing identity before querying", async () => {
    await expect(
      releaseOwnCollectiveTask(db, { ...input, userId: "" }),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
