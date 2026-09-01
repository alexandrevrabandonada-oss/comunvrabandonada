import {
  COMUN_RELATA_PUBLIC_PROJECTION_POLICY,
  PUBLIC_PROJECTION_RULES,
  isPublicProjectionCategory,
  type PublicProjectionCategory,
  type PublicProjectionRow,
} from "./comun-relata-public-projection.ts";

export const COMUN_DENUNCIAS_MAP_READINESS_CONTRACT =
  "comun-denuncias-map-readiness-v1" as const;

export type ComunDenunciasMapReadinessBlocker =
  | "FEATURE_DISABLED"
  | "NO_ELIGIBLE_COLLECTIVE"
  | "NO_VALID_CONSENT"
  | "NO_SPATIAL_CANDIDATE"
  | "NO_PUBLIC_PROJECTION"
  | "NO_ALLOWED_CATEGORY"
  | "INVALID_CLUSTER_POLICY";

export type ComunDenunciasMapReadinessEvidence = {
  featureEnabled: boolean;
  realCollectives: number;
  eligibleCollectives: number;
  activeConsents: number;
  activeConfirmations: number;
  spatialCandidates: number;
  projectionRows: number;
  activeProjectionRows: number;
  allowedCategoryRows: number;
  eligibleRows: number;
  invalidClusterPolicyRows: number;
};

export type ComunDenunciasMapReadiness = {
  contract: typeof COMUN_DENUNCIAS_MAP_READINESS_CONTRACT;
  mapDataReady: boolean;
  blockers: ComunDenunciasMapReadinessBlocker[];
  evidence: ComunDenunciasMapReadinessEvidence;
  confirmationRequiredForPublication: false;
};

function count(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function resolveComunDenunciasMapReadiness(
  input: ComunDenunciasMapReadinessEvidence,
): ComunDenunciasMapReadiness {
  const evidence = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      key === "featureEnabled" ? value === true : count(Number(value)),
    ]),
  ) as ComunDenunciasMapReadinessEvidence;
  const blockers: ComunDenunciasMapReadinessBlocker[] = [];

  if (!evidence.featureEnabled) blockers.push("FEATURE_DISABLED");
  if (evidence.eligibleCollectives === 0)
    blockers.push("NO_ELIGIBLE_COLLECTIVE");
  if (evidence.activeConsents === 0) blockers.push("NO_VALID_CONSENT");
  if (evidence.spatialCandidates === 0) blockers.push("NO_SPATIAL_CANDIDATE");
  if (evidence.activeProjectionRows === 0)
    blockers.push("NO_PUBLIC_PROJECTION");
  if (evidence.allowedCategoryRows === 0) blockers.push("NO_ALLOWED_CATEGORY");
  if (evidence.invalidClusterPolicyRows > 0)
    blockers.push("INVALID_CLUSTER_POLICY");

  return {
    contract: COMUN_DENUNCIAS_MAP_READINESS_CONTRACT,
    mapDataReady: blockers.length === 0 && evidence.eligibleRows > 0,
    blockers,
    evidence,
    // Public confirmation was prepared by B0 but is not a precondition in the
    // canonical recompute function. Absence must remain observable, not become
    // an invented publication gate.
    confirmationRequiredForPublication: false,
  };
}

export function expectedComunDenunciasClusterMeters(
  category: PublicProjectionCategory,
) {
  return PUBLIC_PROJECTION_RULES[category].gridMeters;
}

export function isComunDenunciasPublicProjectionRowEligible(
  row: PublicProjectionRow,
) {
  if (!isPublicProjectionCategory(row.category)) return false;
  const expectedMeters = expectedComunDenunciasClusterMeters(row.category);
  return (
    row.policy_version === COMUN_RELATA_PUBLIC_PROJECTION_POLICY &&
    row.projection_state === "active" &&
    Number.isFinite(row.public_latitude) &&
    row.public_latitude >= -85.05112878 &&
    row.public_latitude <= 85.05112878 &&
    Number.isFinite(row.public_longitude) &&
    row.public_longitude >= -180 &&
    row.public_longitude <= 180 &&
    Number.isFinite(row.uncertainty_radius_meters) &&
    row.uncertainty_radius_meters >= expectedMeters
  );
}

export function resolveComunDenunciasMapReadinessFromPublicRows(
  rows: readonly PublicProjectionRow[],
  featureEnabled: boolean,
) {
  const allowedRows = rows.filter((row) =>
    isPublicProjectionCategory(row.category),
  );
  const eligibleRows = allowedRows.filter(
    isComunDenunciasPublicProjectionRowEligible,
  );
  const invalidClusterPolicyRows = allowedRows.length - eligibleRows.length;
  const implied = eligibleRows.length > 0 ? 1 : 0;

  return resolveComunDenunciasMapReadiness({
    featureEnabled,
    realCollectives: implied,
    eligibleCollectives: implied,
    activeConsents: implied,
    activeConfirmations: 0,
    spatialCandidates: implied,
    projectionRows: rows.length,
    activeProjectionRows: rows.filter(
      (row) => row.projection_state === "active",
    ).length,
    allowedCategoryRows: allowedRows.length,
    eligibleRows: eligibleRows.length,
    invalidClusterPolicyRows,
  });
}
