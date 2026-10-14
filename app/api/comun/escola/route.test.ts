import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  rpc: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock("@/lib/community-auth", () => ({ getCommunitySession: mocks.session }));
vi.mock("@/lib/learning/server", () => ({
  learningService: () => ({ rpc: mocks.rpc }),
  learningSnapshot: mocks.snapshot,
}));
import { GET, POST } from "./route";
const uid = "00000000-0000-4000-8000-000000000001";
const request = (body: unknown, origin = "https://comun.example") =>
  new NextRequest("https://comun.example/api/comun/escola", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  process.env.COMUN_LEARNING_R0_ENABLED = "enabled";
  mocks.session.mockResolvedValue({
    user: { id: uid },
    profile: { status: "active" },
  });
  mocks.snapshot.mockResolvedValue({
    progress: [],
    practices: [],
    savedResources: [],
    pautas: [],
    tasks: [],
  });
  mocks.rpc.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => {
  delete process.env.COMUN_LEARNING_R0_ENABLED;
});
describe("private learning boundary", () => {
  it("cloaks disabled routes", async () => {
    delete process.env.COMUN_LEARNING_R0_ENABLED;
    expect((await GET()).status).toBe(404);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("rejects guests and inactive accounts without reading private rows", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    mocks.session.mockResolvedValue({
      user: { id: uid },
      profile: { status: "suspended" },
    });
    expect((await GET()).status).toBe(401);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes", async () => {
    expect(
      (await POST(request({ event: "continue" }, "https://other.example")))
        .status,
    ).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("binds user identity to the verified session", async () => {
    const res = await POST(
      request({
        event: "continue",
        missionId: "o-que-e-um-problema",
        revision: 0,
        userId: "attacker-controlled",
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "comun_learning_event",
      expect.objectContaining({ p_user_id: uid }),
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
  it("rejects incomplete practice and unsupported mission", async () => {
    expect(
      (
        await POST(
          request({
            event: "practice",
            missionId: "o-que-e-um-problema",
            pautaId: uid,
            taskId: null,
            reflection: "short",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request({ event: "continue", missionId: "absent", revision: 0 }),
        )
      ).status,
    ).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports stale writes and keeps database details private", async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: "learning_stale_revision" },
    });
    expect(
      (
        await POST(
          request({
            event: "continue",
            missionId: "o-que-e-um-problema",
            revision: 0,
          }),
        )
      ).status,
    ).toBe(409);
    mocks.rpc.mockResolvedValue({
      error: { message: "secret connection failure" },
    });
    const res = await POST(
      request({
        event: "continue",
        missionId: "o-que-e-um-problema",
        revision: 0,
      }),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("secret");
  });

  it.each(["missing-pauta", "hidden-task", "other-pauta-task"])(
    "rejects manual practice references: %s",
    async (scenario) => {
      const taskId = "00000000-0000-4000-8000-000000000002";
      mocks.snapshot.mockResolvedValue({
        pautas: scenario === "missing-pauta" ? [] : [{ id: uid }],
        tasks:
          scenario === "other-pauta-task"
            ? [{ id: taskId, pauta_id: "another-pauta" }]
            : [],
      });
      const res = await POST(
        request({
          event: "practice",
          missionId: "o-que-e-um-problema",
          pautaId: uid,
          taskId,
          reflection: "Uma reflexão suficientemente longa sobre a prática.",
        }),
      );
      expect(res.status).toBe(400);
      expect(mocks.snapshot).toHaveBeenCalledWith(uid);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it.each([null, "00000000-0000-4000-8000-000000000002"])(
    "accepts an available pauta with optional authorized task %s",
    async (taskId) => {
      mocks.snapshot.mockResolvedValue({
        pautas: [{ id: uid }],
        tasks: taskId ? [{ id: taskId, pauta_id: uid }] : [],
      });
      const res = await POST(
        request({
          event: "practice",
          missionId: "o-que-e-um-problema",
          pautaId: uid,
          taskId,
          userId: "untrusted-user",
          reflection: "Uma reflexão suficientemente longa sobre a prática.",
        }),
      );
      expect(res.status).toBe(200);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "comun_learning_submit_practice",
        expect.objectContaining({
          p_user_id: uid,
          p_pauta_id: uid,
          p_task_id: taskId,
        }),
      );
    },
  );

  it("does not write when reference verification is unavailable", async () => {
    mocks.snapshot.mockRejectedValue(new Error("private connection details"));
    const res = await POST(
      request({
        event: "practice",
        missionId: "o-que-e-um-problema",
        pautaId: uid,
        taskId: null,
        reflection: "Uma reflexão suficientemente longa sobre a prática.",
      }),
    );
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("private connection");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
