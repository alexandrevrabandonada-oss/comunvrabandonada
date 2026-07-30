import { describe, expect, it } from "vitest";
import {
  assertCleanupTarget,
  isCleanupDeleteEligible,
  isCleanupMarkEligible,
} from "./sidewalk-upload-cleanup";

describe("sidewalk upload cleanup", () => {
  it("recusa ambiente remoto sem opt-in e allowlist", () => {
    expect(() =>
      assertCleanupTarget({
        url: "https://wrong.supabase.co",
        allowNonLocal: false,
        allowlist: [],
      }),
    ).toThrow("CLEANUP_NON_LOCAL_REFUSED");
    expect(() =>
      assertCleanupTarget({
        url: "https://wrong.supabase.co",
        projectRef: "wrong",
        allowNonLocal: true,
        allowlist: ["other"],
      }),
    ).toThrow("CLEANUP_PROJECT_REF_NOT_ALLOWLISTED");
  });

  it("aceita local e remoto explicitamente autorizado", () => {
    expect(
      assertCleanupTarget({
        url: "http://127.0.0.1:54321",
        allowNonLocal: false,
        allowlist: [],
      }).local,
    ).toBe(true);
    expect(
      assertCleanupTarget({
        url: "https://approved.supabase.co",
        projectRef: "approved",
        allowNonLocal: true,
        allowlist: ["approved"],
      }).local,
    ).toBe(false);
  });

  it("marca somente upload expirado sem registro ativo", () => {
    const now = new Date("2026-07-30T20:00:00Z");
    expect(
      isCleanupMarkEligible(
        {
          status: "uploaded",
          expires_at: "2026-07-29T18:00:00Z",
          record_id: "active",
        },
        now,
        86_400_000,
      ),
    ).toBe(false);
    expect(
      isCleanupMarkEligible(
        {
          status: "uploaded",
          confirmation_state: "failed_retryable",
          expires_at: "2026-07-29T18:00:00Z",
        },
        now,
        86_400_000,
      ),
    ).toBe(true);
    expect(
      isCleanupMarkEligible(
        {
          status: "confirmed",
          confirmation_state: "confirmed",
          expires_at: "2026-07-20T18:00:00Z",
        },
        now,
        86_400_000,
      ),
    ).toBe(false);
  });

  it("exclui somente objeto em quarentena por sete dias", () => {
    const now = new Date("2026-07-30T20:00:00Z");
    const base = {
      status: "abandoned",
      confirmation_state: "abandoned",
      failure_code: "expired_cleanup_marked",
      expires_at: "2026-07-20T18:00:00Z",
    };
    expect(isCleanupDeleteEligible(base, now, 7 * 86_400_000)).toBe(true);
    expect(
      isCleanupDeleteEligible(
        { ...base, record_id: "active" },
        now,
        7 * 86_400_000,
      ),
    ).toBe(false);
    expect(
      isCleanupDeleteEligible(
        { ...base, failure_code: "confirmation_failed" },
        now,
        7 * 86_400_000,
      ),
    ).toBe(false);
    expect(
      isCleanupDeleteEligible(
        { ...base, expires_at: "2026-07-28T18:00:00Z" },
        now,
        7 * 86_400_000,
      ),
    ).toBe(false);
  });
});
