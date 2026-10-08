import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => db,
}));
import { getPublicResult } from "./central-hub";

describe("public result reader authorization (application boundary, not RLS)", () => {
  beforeEach(() => db.from.mockReset());
  function fixture(data: Record<string, unknown> | null) {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data }),
    };
    const memory = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    db.from.mockReturnValueOnce(query).mockReturnValueOnce(memory);
    return query;
  }
  it.each(["pauta", "action", "territory"])(
    "refuses a public result whose linked %s is private, before reading memory",
    async (relation) => {
      const query = fixture({
        id: "synthetic",
        [relation]: { visibility: "private", title: "PRIVATE" },
      });
      expect(await getPublicResult("synthetic")).toBeNull();
      expect(query.eq).toHaveBeenCalledWith("visibility", "public");
      expect(db.from).toHaveBeenCalledTimes(1);
    },
  );
  it("keeps public relationships and applies publication scope to the result", async () => {
    const query = fixture({
      id: "synthetic",
      action: { visibility: "public" },
    });
    expect(await getPublicResult("synthetic")).toMatchObject({
      id: "synthetic",
      memory: [],
    });
    expect(query.eq).toHaveBeenCalledWith("slug", "synthetic");
    expect(query.eq).toHaveBeenCalledWith("visibility", "public");
  });
  it("does not read related records when the public result is absent or withdrawn", async () => {
    fixture(null);
    expect(await getPublicResult("withdrawn")).toBeNull();
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});
