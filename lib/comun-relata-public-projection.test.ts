import { describe, expect, it } from "vitest";
import {
  deriveComunRelataPublicCell,
  evaluateComunRelataPublicEligibility,
  preserveComunRelataPublicPrecision,
  sanitizeComunRelataPublicProjection,
} from "./comun-relata-public-projection";

describe("Relata 48.0D sanitized projection", () => {
  it("derives a metric cell and never emits the submitted coordinate", () => {
    const cell = deriveComunRelataPublicCell("public_lighting", -44.1, -22.5, 5);
    expect(cell.gridMeters).toBe(300);
    expect(cell.center.latitude).not.toBe(-22.5);
    expect(cell.uncertaintyRadiusMeters).toBeGreaterThan(200);
  });

  it("keeps power distribution private until two reports exist", () => {
    expect(evaluateComunRelataPublicEligibility({ category: "power_distribution", reportCount: 1, confidence: "high", hasLocationCandidate: true }).state).toBe("suppressed");
    expect(evaluateComunRelataPublicEligibility({ category: "power_distribution", reportCount: 2, confidence: "high", hasLocationCandidate: true }).state).toBe("eligible_auto_local");
  });

  it("blocks safety-sensitive categories", () => {
    expect(evaluateComunRelataPublicEligibility({ category: "active_fire", reportCount: 9, confidence: "high", hasLocationCandidate: true, urgency: "emergency" }).state).toBe("blocked");
  });

  it("returns only the public allowlist and templated copy", () => {
    const result = sanitizeComunRelataPublicProjection({
      public_id: "00000000-0000-0000-0000-000000000001", category: "public_lighting", title: "private", summary: "private", community_state: "active", report_count: 2, confirmation_count: 1, first_seen_date: "2026-08-03T01:02:03Z", last_activity_date: "2026-08-03T01:02:03Z", public_latitude: -22.5, public_longitude: -44.1, uncertainty_radius_meters: 300, policy_version: "wrong", eligibility_reason: "allowlisted_rule", projection_state: "visible_local_preview", created_at: "2026-08-03T01:02:03Z", updated_at: "2026-08-03T01:02:03Z",
    });
    expect(result.title).toBe("Iluminação pública no território");
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result).not.toHaveProperty("collective_case_id");
  });

  it("never makes a projection more precise after a refresh", () => {
    const next = deriveComunRelataPublicCell("public_lighting", -44.1, -22.5, 1);
    expect(preserveComunRelataPublicPrecision({ center: next.center, uncertaintyRadiusMeters: 900 }, next).uncertaintyRadiusMeters).toBe(900);
  });
});
