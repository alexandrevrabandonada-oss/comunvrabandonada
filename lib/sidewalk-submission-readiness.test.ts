import { describe, expect, it, vi } from "vitest";
import {
  createSingleSubmissionGuard,
  ensureSidewalkAnonymousSession,
  getSidewalkSubmissionReadiness,
} from "./sidewalk-submission-readiness";

const valid = {
  hasPhoto: true,
  hasPoint: true,
  pointConfirmed: true,
  hasCondition: true,
  consentPublish: true,
  reviewConfirmed: true,
};

describe("sidewalk submission readiness", () => {
  it("keeps an incomplete form closed and explains its visible requirements", () => {
    expect(
      getSidewalkSubmissionReadiness({
        ...valid,
        hasPoint: false,
        pointConfirmed: false,
        consentPublish: false,
      }),
    ).toEqual({
      ready: false,
      missing: ["point", "publication_consent"],
    });
  });

  it("accepts a complete visible payload without a hidden session predicate", () => {
    expect(getSidewalkSubmissionReadiness(valid)).toEqual({
      ready: true,
      missing: [],
    });
  });

  it("reuses an existing anonymous session without a bootstrap POST", async () => {
    const signInAnonymously = vi.fn();
    const result = await ensureSidewalkAnonymousSession({
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { user: "anonymous" } } }),
        signInAnonymously,
      },
    });
    expect(result).toEqual({ source: "existing" });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("creates one anonymous session only after submission requests it", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session: { user: "anonymous" } },
      error: null,
    });
    const result = await ensureSidewalkAnonymousSession({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInAnonymously,
      },
    });
    expect(result).toEqual({ source: "created" });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("fails without retry when the anonymous provider rejects bootstrap", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { code: "provider_disabled" },
    });
    await expect(
      ensureSidewalkAnonymousSession({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          signInAnonymously,
        },
      }),
    ).rejects.toThrow("Não foi possível criar a sessão privada");
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("blocks a second logical submission until the first one finishes", () => {
    const guard = createSingleSubmissionGuard();
    expect(guard.enter()).toBe(true);
    expect(guard.enter()).toBe(false);
    guard.release();
    expect(guard.enter()).toBe(true);
  });
});
