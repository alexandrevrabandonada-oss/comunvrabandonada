import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ session: vi.fn(), snapshot: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/community-auth", () => ({ getCommunitySession: mocks.session }));
vi.mock("@/lib/learning/server", () => ({ learningSnapshot: mocks.snapshot }));
import { catalog } from "@/lib/learning/core";
import { LearningEntry } from "./entry";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("COMUN_LEARNING_R0_ENABLED", "enabled");
  mocks.session.mockResolvedValue({
    user: { id: "server-validated-actor-a" },
    profile: { status: "active" },
  });
  mocks.snapshot.mockResolvedValue({
    progress: [],
    practices: [],
    savedResources: [],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("server-only participation learning summary", () => {
  it("disabled means no session lookup and no private query", async () => {
    vi.stubEnv("COMUN_LEARNING_R0_ENABLED", "disabled");
    expect(await LearningEntry()).toBeNull();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("never queries private progress for a guest or inactive profile", async () => {
    for (const session of [
      null,
      { user: { id: "a" }, profile: { status: "suspended" } },
    ]) {
      mocks.session.mockResolvedValue(session);
      expect(renderToStaticMarkup(await LearningEntry())).toContain(
        "Entrar para consultar",
      );
    }
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("uses only server-validated identity and renders a minimum catalog projection", async () => {
    mocks.snapshot.mockResolvedValue({
      progress: [
        {
          mission_id: catalog.missions[0].id,
          step: 2,
          revision: 4,
          status: "started",
          updated_at: "2026-10-07T10:00:00Z",
        },
      ],
      practices: [
        {
          reflection: "private reflection",
          review_note: "private note",
          state: "pending",
          mission_id: "other",
        },
      ],
      savedResources: [],
    });
    const html = renderToStaticMarkup(await LearningEntry());
    expect(mocks.snapshot).toHaveBeenCalledExactlyOnceWith(
      "server-validated-actor-a",
    );
    expect(html).toContain("Retomar atividade");
    expect(html).toContain("Etapa 3 de 6");
    expect(html).not.toMatch(
      /server-validated-actor|private reflection|private note|revision|user_id/,
    );
  });
  it("never presents an unavailable query as empty progress", async () => {
    mocks.snapshot.mockRejectedValue(new Error("private database details"));
    const html = renderToStaticMarkup(await LearningEntry());
    expect(html).toContain("Tentar novamente");
    expect(html).not.toMatch(/Conhecer atividades|private database details/);
  });
});
