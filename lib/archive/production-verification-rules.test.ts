import { describe, expect, it } from "vitest";
import {
  isAllowedVerificationKey,
  isVerificationRunStale,
  redactObjectKey,
  safeVerificationSummary,
  sanitizeVerificationError,
} from "./production-verification-rules";
describe("production verification safety", () => {
  it("permite somente prefixo isolado", () => {
    expect(
      isAllowedVerificationKey("smoke/production-verification/x/original/a"),
    ).toBe(true);
    expect(isAllowedVerificationKey("originals/a")).toBe(false);
    expect(isAllowedVerificationKey("smoke/production-verification/../a")).toBe(
      false,
    );
  });
  it("redige keys e erros", () => {
    expect(redactObjectKey("smoke/production-verification/x/a")).not.toContain(
      "x/a",
    );
    expect(
      sanitizeVerificationError(new Error("secret=abc https://x.test/a")),
    ).not.toContain("abc");
  });
  it("detecta lock stale", () =>
    expect(
      isVerificationRunStale(new Date(Date.now() - 31 * 60000).toISOString()),
    ).toBe(true));
  it("produz resumo seguro", () =>
    expect(
      safeVerificationSummary({ steps: [], cleanup: true, durationMs: 2 }),
    ).toEqual({ steps: [], cleanup: true, durationMs: 2 }));
});
