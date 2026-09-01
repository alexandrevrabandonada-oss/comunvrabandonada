import { describe, expect, it } from "vitest";
import {
  expectedComunDenunciasClusterMeters,
  isComunDenunciasPublicProjectionRowEligible,
  resolveComunDenunciasMapReadiness,
  resolveComunDenunciasMapReadinessFromPublicRows,
  type ComunDenunciasMapReadinessEvidence,
} from "./comun-denuncias-map-readiness";
import type { PublicProjectionRow } from "./comun-relata-public-projection";
import { sanitizeComunRelataPublicProjection } from "./comun-relata-public-projection";

const empty: ComunDenunciasMapReadinessEvidence = {
  featureEnabled: false,
  realCollectives: 0,
  eligibleCollectives: 0,
  activeConsents: 0,
  activeConfirmations: 0,
  spatialCandidates: 0,
  projectionRows: 0,
  activeProjectionRows: 0,
  allowedCategoryRows: 0,
  eligibleRows: 0,
  invalidClusterPolicyRows: 0,
};

const row = (
  overrides: Partial<PublicProjectionRow> = {},
): PublicProjectionRow => ({
  public_id: "00000000-0000-4000-8000-000000000001",
  category: "public_lighting",
  title: "private title",
  summary: "private summary",
  community_state: "active",
  report_count: 2,
  confirmation_count: 0,
  first_seen_date: "2026-08-01",
  last_activity_date: "2026-08-31",
  public_latitude: -22.52,
  public_longitude: -44.1,
  uncertainty_radius_meters: 300,
  policy_version: "relata-public-projection-v1",
  eligibility_reason: "explicit_projection_consent",
  projection_state: "active",
  created_at: "2026-08-31T00:00:00Z",
  updated_at: "2026-08-31T00:00:00Z",
  ...overrides,
});

describe("COMUN 49.1 map eligible data readiness", () => {
  it("explains zero data with multiple stable blockers", () => {
    const readiness = resolveComunDenunciasMapReadiness(empty);
    expect(readiness.mapDataReady).toBe(false);
    expect(readiness.blockers).toEqual([
      "FEATURE_DISABLED",
      "NO_ELIGIBLE_COLLECTIVE",
      "NO_VALID_CONSENT",
      "NO_SPATIAL_CANDIDATE",
      "NO_PUBLIC_PROJECTION",
      "NO_ALLOWED_CATEGORY",
    ]);
  });

  it("distinguishes missing and revoked consent without inventing consent", () => {
    const potential = { ...empty, featureEnabled: true, realCollectives: 1 };
    expect(resolveComunDenunciasMapReadiness(potential).blockers).toContain(
      "NO_VALID_CONSENT",
    );
    expect(
      resolveComunDenunciasMapReadiness({ ...potential, activeConsents: 0 })
        .mapDataReady,
    ).toBe(false);
  });

  it("does not invent public confirmation as a publication precondition", () => {
    const readiness = resolveComunDenunciasMapReadiness({
      ...empty,
      featureEnabled: true,
      realCollectives: 1,
      eligibleCollectives: 1,
      activeConsents: 2,
      activeConfirmations: 0,
      spatialCandidates: 1,
      projectionRows: 1,
      activeProjectionRows: 1,
      allowedCategoryRows: 1,
      eligibleRows: 1,
    });
    expect(readiness.confirmationRequiredForPublication).toBe(false);
    expect(readiness.mapDataReady).toBe(true);
  });

  it("fails closed for forbidden categories, missing projections and bad policy", () => {
    expect(
      resolveComunDenunciasMapReadinessFromPublicRows(
        [row({ category: "public_health" as PublicProjectionRow["category"] })],
        true,
      ).blockers,
    ).toContain("NO_ALLOWED_CATEGORY");
    expect(
      resolveComunDenunciasMapReadinessFromPublicRows([], true).blockers,
    ).toContain("NO_PUBLIC_PROJECTION");
    expect(
      resolveComunDenunciasMapReadinessFromPublicRows(
        [row({ policy_version: "wrong" })],
        true,
      ).blockers,
    ).toContain("INVALID_CLUSTER_POLICY");
  });

  it("validates the three canonical cluster levels", () => {
    expect(expectedComunDenunciasClusterMeters("public_lighting")).toBe(300);
    expect(expectedComunDenunciasClusterMeters("power_distribution")).toBe(800);
    expect(
      expectedComunDenunciasClusterMeters("smoke_or_environmental_trace"),
    ).toBe(1000);
    expect(
      isComunDenunciasPublicProjectionRowEligible(
        row({ category: "power_distribution", uncertainty_radius_meters: 799 }),
      ),
    ).toBe(false);
  });

  it("never carries private report material into the public DTO", () => {
    const projected = sanitizeComunRelataPublicProjection({
      ...row(),
      original_latitude: -22.500001,
      original_longitude: -44.100001,
      exact_address: "Rua privada, 123",
      reporter_name: "Pessoa privada",
      reporter_email: "private@example.test",
      reporter_phone: "24999999999",
      internal_case_id: "case-private",
      protocol: "COMUN-PRIVATE",
      original_text: "texto livre privado",
      attachments: ["private.webp"],
      auth_user_id: "user-private",
    } as PublicProjectionRow);
    const serialized = JSON.stringify(projected);
    for (const forbidden of [
      "original_latitude",
      "original_longitude",
      "Rua privada",
      "Pessoa privada",
      "private@example.test",
      "24999999999",
      "case-private",
      "COMUN-PRIVATE",
      "texto livre privado",
      "private.webp",
      "user-private",
    ])
      expect(serialized).not.toContain(forbidden);
  });

  it("requires the feature boundary and a real eligible public row for READY", () => {
    expect(
      resolveComunDenunciasMapReadinessFromPublicRows([row()], false)
        .mapDataReady,
    ).toBe(false);
    expect(
      resolveComunDenunciasMapReadinessFromPublicRows([row()], true)
        .mapDataReady,
    ).toBe(true);
  });
});
