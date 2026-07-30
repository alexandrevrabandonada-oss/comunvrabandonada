import { describe, expect, it } from "vitest";
import {
  formatSidewalkOperationAge,
  hasExactSidewalkLocationConsent,
  summarizeSidewalkOperations,
} from "./sidewalk-operations";

describe("sidewalk operations", () => {
  const now = new Date("2026-07-30T12:00:00Z");

  it("resume funil, fila e falhas sem expor registros", () => {
    const summary = summarizeSidewalkOperations(
      {
        uploads: [
          {
            status: "confirmed",
            confirmation_state: "confirmed",
            created_at: "2026-07-30T10:00:00Z",
            expires_at: "2026-07-30T11:00:00Z",
            record_id: "record-a",
          },
          {
            status: "uploaded",
            confirmation_state: "failed_retryable",
            failure_code: "confirmation_failed",
            created_at: "2026-07-30T09:00:00Z",
            expires_at: "2026-07-30T10:00:00Z",
          },
          {
            status: "abandoned",
            confirmation_state: "abandoned",
            failure_code: "expired_cleanup_marked",
            created_at: "2026-07-20T09:00:00Z",
            expires_at: "2026-07-20T10:00:00Z",
          },
        ],
        records: [
          {
            status: "under_review",
            visibility: "internal",
            created_at: "2026-07-29T06:00:00Z",
          },
          {
            status: "published",
            visibility: "public",
            created_at: "2026-07-30T10:30:00Z",
          },
        ],
        photos: [
          {
            review_status: "pending",
            is_public: false,
            derivative_asset_id: null,
          },
          {
            review_status: "approved",
            is_public: true,
            derivative_asset_id: "derivative-a",
          },
        ],
      },
      now,
    );

    expect(summary.funnel7d).toEqual({
      authorized: 2,
      uploaded: 2,
      confirmed: 1,
      records: 2,
      published: 1,
    });
    expect(summary.queue.pendingRecords).toBe(1);
    expect(summary.queue.oldestAgeHours).toBe(30);
    expect(summary.queue.pendingPhotos).toBe(1);
    expect(summary.failures24h).toEqual([
      { code: "confirmation_failed", count: 1 },
    ]);
    expect(summary.publishedTotal).toBe(1);
  });

  it("formata idade operacional para leitura humana", () => {
    expect(formatSidewalkOperationAge(null)).toBe("sem fila");
    expect(formatSidewalkOperationAge(0.5)).toBe("menos de 1 hora");
    expect(formatSidewalkOperationAge(7.8)).toBe("7 h");
    expect(formatSidewalkOperationAge(49)).toBe("2 dias");
  });

  it("reconhece somente consentimento exato explícito", () => {
    expect(
      hasExactSidewalkLocationConsent({
        consent_publish: "yes",
        consent_location_precision: "exact",
      }),
    ).toBe(true);
    expect(
      hasExactSidewalkLocationConsent({
        consent_publish: "yes",
        consent_location_precision: "approximate",
      }),
    ).toBe(false);
    expect(hasExactSidewalkLocationConsent(null)).toBe(false);
  });
});
