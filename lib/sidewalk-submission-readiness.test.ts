import { describe, expect, it, vi } from "vitest";
import {
  captureSidewalkSubmissionPayload,
  classifySidewalkAnonymousSessionFailure,
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
  it("captures the form synchronously before asynchronous session work", () => {
    const form = {} as HTMLFormElement;
    const values = new Map<string, string>([
      ["pauta_slug", "calcadas"],
      ["return_to", "/comun/calcadas"],
      ["description", "Trecho controlado"],
      ["category", "buraco"],
      ["problems", "buraco,irregular"],
      ["condition", "bad"],
      ["longitude", "-44.10"],
      ["latitude", "-22.50"],
      ["location_accuracy_m", "12"],
      ["location_source", "device"],
      ["affected_groups", "wheelchair_users"],
      ["consent_publish", "yes"],
    ]);
    const constructor = vi.fn(function (received: HTMLFormElement) {
      expect(received).toBe(form);
      return { get: (key: string) => values.get(key) ?? null };
    });
    vi.stubGlobal("FormData", constructor);

    expect(captureSidewalkSubmissionPayload(form)).toEqual({
      pauta_slug: "calcadas",
      return_to: "/comun/calcadas",
      description: "Trecho controlado",
      category: "buraco",
      problems: "buraco,irregular",
      condition: "bad",
      longitude: "-44.10",
      latitude: "-22.50",
      location_accuracy_m: "12",
      location_source: "device",
      affected_groups: "wheelchair_users",
      consent_publish: "yes",
    });
    expect(constructor).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

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
    const phases: string[] = [];
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
      (phase) => phases.push(phase),
    );
    expect(result).toEqual({ source: "created" });
    expect(getCaptchaToken).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledWith({
      options: { captchaToken: "captcha-token" },
    });
    expect(phases).toEqual(["checking_captcha", "creating_private_session"]);
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

  it("explains the known anonymous-provider rejection without exposing its raw code", async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { code: "anonymous_provider_disabled", message: "internal" },
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
    ).rejects.toThrow("sessão anônima ainda não foi liberada");
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("classifies known session failures into safe user-facing categories", () => {
    expect(
      classifySidewalkAnonymousSessionFailure({
        code: "anonymous_provider_disabled",
      }),
    ).toBe("anonymous_auth_unavailable");
    expect(
      classifySidewalkAnonymousSessionFailure({
        code: "captcha_verification_failed",
      }),
    ).toBe("captcha_not_accepted");
    expect(classifySidewalkAnonymousSessionFailure({ status: 429 })).toBe(
      "rate_limited",
    );
    expect(
      classifySidewalkAnonymousSessionFailure(new TypeError("failed")),
    ).toBe("network");
  });

  it("blocks a second logical submission until the first one finishes", () => {
    const guard = createSingleSubmissionGuard();
    expect(guard.enter()).toBe(true);
    expect(guard.enter()).toBe(false);
    guard.release();
    expect(guard.enter()).toBe(true);
  });
});
