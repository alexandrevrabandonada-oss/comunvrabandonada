import { describe, expect, it } from "vitest";
import { assertCleanupTarget, isCleanupEligible } from "./sidewalk-upload-cleanup";

describe("sidewalk upload cleanup", () => {
  it("recusa ambiente remoto sem opt-in e allowlist", () => {
    expect(() => assertCleanupTarget({ url: "https://wrong.supabase.co", allowNonLocal: false, allowlist: [] })).toThrow("CLEANUP_NON_LOCAL_REFUSED");
    expect(() => assertCleanupTarget({ url: "https://wrong.supabase.co", projectRef: "wrong", allowNonLocal: true, allowlist: ["other"] })).toThrow("CLEANUP_PROJECT_REF_NOT_ALLOWLISTED");
  });
  it("aceita local e remoto explicitamente autorizado", () => {
    expect(assertCleanupTarget({ url: "http://127.0.0.1:54321", allowNonLocal: false, allowlist: [] }).local).toBe(true);
    expect(assertCleanupTarget({ url: "https://approved.supabase.co", projectRef: "approved", allowNonLocal: true, allowlist: ["approved"] }).local).toBe(false);
  });
  it("protege referência ativa e respeita idade mínima", () => {
    const now = new Date("2026-07-21T20:00:00Z");
    expect(isCleanupEligible({ status: "uploaded", expires_at: "2026-07-20T18:00:00Z", record_id: "active" }, now, 86_400_000)).toBe(false);
    expect(isCleanupEligible({ status: "uploaded", confirmation_state: "failed_retryable", expires_at: "2026-07-20T18:00:00Z" }, now, 86_400_000)).toBe(true);
    expect(isCleanupEligible({ status: "uploaded", confirmation_state: "confirmed", expires_at: "2026-07-20T18:00:00Z" }, now, 86_400_000)).toBe(false);
    expect(isCleanupEligible({ status: "confirmed", expires_at: "2026-07-19T18:00:00Z" }, now, 86_400_000)).toBe(false);
  });
});
