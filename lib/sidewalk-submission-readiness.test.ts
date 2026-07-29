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

  it("reuses an existing anonymous session without CAPTCHA or bootstrap POST", async () => {
    const signInAnonymously = vi.fn();
    const getCaptchaToken = vi.fn();
    const result = await ensureSidewalkAnonymousSession(
      {
        auth: {
          getSession: vi
            .fn()
            .mockResolvedValue({ data: { session: { user: "anonymous" } } }),
          signInAnonymously,
        },
      },
      getCaptchaToken,
    );
    expect(result).toEqual({ source: "existing" });
    expect(getCaptchaToken).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("creates one anonymous session with one CAPTCHA token after submission", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session: { user: "anonymous" } },
      error: null,
    });
    const getCaptchaToken = vi.fn().mockResolvedValue("captcha-token");
    const result = await ensureSidewalkAnonymousSession(
      {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          signInAnonymously,
        },
      },
      getCaptchaToken,
    );
    expect(result).toEqual({ source: "created" });
    expect(getCaptchaToken).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledWith({
      options: { captchaToken: "captcha-token" },
    });
  });

  it("blocks bootstrap before POST when CAPTCHA returns an empty token", async () => {
    const signInAnonymously = vi.fn();
    await expect(
      ensureSidewalkAnonymousSession(
        {
          auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            signInAnonymously,
          },
        },
        vi.fn().mockResolvedValue("  "),
      ),
    ).rejects.toThrow("token válido");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("fails without retry when the anonymous provider rejects bootstrap", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { code: "provider_disabled" },
    });
    await expect(
      ensureSidewalkAnonymousSession(
        {
          auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            signInAnonymously,
          },
        },
        vi.fn().mockResolvedValue("captcha-token"),
      ),
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
