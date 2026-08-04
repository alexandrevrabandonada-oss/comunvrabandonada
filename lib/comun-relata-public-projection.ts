export const COMUN_RELATA_PUBLIC_PROJECTION_POLICY = "relata-public-projection-v1" as const;

export type PublicProjectionCategory =
  | "public_lighting"
  | "power_distribution"
  | "smoke_or_environmental_trace";

export type ProjectionState =
  | "blocked"
  | "eligible_auto_local"
  | "review_required"
  | "visible_local_preview"
  | "suppressed"
  | "inactive"
  | "withdrawn";

const WORLD_METERS = 40075016.68557849;

export const PUBLIC_PROJECTION_RULES: Record<
  PublicProjectionCategory,
  { title: string; summary: string; gridMeters: number; minimumReports: number }
> = {
  public_lighting: {
    title: "Iluminação pública no território",
    summary: "Relatos organizados sobre iluminação pública, em localização aproximada.",
    gridMeters: 300,
    minimumReports: 1,
  },
  power_distribution: {
    title: "Distribuição de energia no território",
    summary: "Relatos organizados sobre distribuição de energia, em localização aproximada.",
    gridMeters: 800,
    minimumReports: 2,
  },
  smoke_or_environmental_trace: {
    title: "Vestígio ambiental no território",
    summary: "Relatos organizados sobre vestígio ambiental; não indica fogo ativo nem sua origem.",
    gridMeters: 1000,
    minimumReports: 1,
  },
};

export function isPublicProjectionCategory(value: unknown): value is PublicProjectionCategory {
  return value === "public_lighting" || value === "power_distribution" || value === "smoke_or_environmental_trace";
}

export type PublicCell = {
  cellX: number;
  cellY: number;
  gridMeters: number;
  center: { latitude: number; longitude: number };
  uncertaintyRadiusMeters: number;
};

function mercatorX(longitude: number) {
  return ((longitude + 180) / 360) * WORLD_METERS;
}

function mercatorY(latitude: number) {
  const safe = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (safe * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * WORLD_METERS;
}

function longitudeFromX(x: number) {
  return (x / WORLD_METERS) * 360 - 180;
}

function latitudeFromY(y: number) {
  const n = Math.PI - (2 * Math.PI * y) / WORLD_METERS;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

export function deriveComunRelataPublicCell(
  category: PublicProjectionCategory,
  longitude: number,
  latitude: number,
  declaredAccuracyMeters?: number | null,
): PublicCell {
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("RELATA_PUBLIC_LONGITUDE_INVALID");
  if (!Number.isFinite(latitude) || latitude < -85.05112878 || latitude > 85.05112878) throw new Error("RELATA_PUBLIC_LATITUDE_INVALID");
  const gridMeters = PUBLIC_PROJECTION_RULES[category].gridMeters;
  const cellX = Math.floor(mercatorX(longitude) / gridMeters);
  const cellY = Math.floor(mercatorY(latitude) / gridMeters);
  const centerX = (cellX + 0.5) * gridMeters;
  const centerY = (cellY + 0.5) * gridMeters;
  const diagonal = Math.sqrt(2) * gridMeters / 2;
  return {
    cellX,
    cellY,
    gridMeters,
    center: { latitude: latitudeFromY(centerY), longitude: longitudeFromX(centerX) },
    uncertaintyRadiusMeters: Math.max(diagonal, Number.isFinite(declaredAccuracyMeters) ? Number(declaredAccuracyMeters) : 0),
  };
}

/** Merge a new candidate without ever reducing the uncertainty radius. */
export function preserveComunRelataPublicPrecision(
  previous: Pick<PublicCell, "center" | "uncertaintyRadiusMeters">,
  next: PublicCell,
) {
  return {
    ...next,
    uncertaintyRadiusMeters: Math.max(previous.uncertaintyRadiusMeters, next.uncertaintyRadiusMeters),
  };
}

export type EligibilityInput = {
  category: string;
  reportCount: number;
  confidence: "high" | "medium" | "low" | "blocked";
  hasLocationCandidate: boolean;
  urgency?: string;
  privacyClass?: string;
  active?: boolean;
  reviewState?: string;
};

const BLOCKED_CATEGORIES = new Set([
  "electrical_hazard", "active_fire", "emergency", "other", "violence", "health", "children",
  "individualized_accusation", "retaliation_risk", "sensitive", "high_risk", "public_after_sanitization",
  "restricted",
]);

export function evaluateComunRelataPublicEligibility(input: EligibilityInput): {
  state: ProjectionState;
  reason: string;
} {
  if (!isPublicProjectionCategory(input.category) || BLOCKED_CATEGORIES.has(input.category)) return { state: "blocked", reason: "category_not_allowlisted" };
  if (input.active === false) return { state: "inactive", reason: "no_active_membership" };
  if (input.urgency === "emergency" || input.privacyClass && BLOCKED_CATEGORIES.has(input.privacyClass)) return { state: "blocked", reason: "safety_boundary" };
  if (input.confidence === "blocked") return { state: "blocked", reason: "match_blocked" };
  if (!input.hasLocationCandidate) return { state: "suppressed", reason: "approximate_location_required" };
  const rule = PUBLIC_PROJECTION_RULES[input.category];
  if (input.reportCount < rule.minimumReports) return { state: "suppressed", reason: "minimum_report_count_not_reached" };
  if (input.reviewState === "future_review_required") return { state: "review_required", reason: "future_review_required" };
  return { state: input.confidence === "high" ? "eligible_auto_local" : "review_required", reason: input.confidence === "high" ? "allowlisted_rule" : "confidence_requires_review" };
}

export type PublicProjectionRow = {
  public_id: string;
  category: PublicProjectionCategory;
  title: string;
  summary: string;
  community_state: string;
  report_count: number;
  confirmation_count: number;
  first_seen_date: string;
  last_activity_date: string;
  public_latitude: number;
  public_longitude: number;
  uncertainty_radius_meters: number;
  policy_version: string;
  eligibility_reason: string;
  projection_state: ProjectionState;
  created_at: string;
  updated_at: string;
};

export function sanitizeComunRelataPublicProjection(row: PublicProjectionRow) {
  if (!isPublicProjectionCategory(row.category)) throw new Error("RELATA_PUBLIC_CATEGORY_INVALID");
  const rule = PUBLIC_PROJECTION_RULES[row.category];
  return {
    publicId: row.public_id,
    category: row.category,
    title: rule.title,
    summary: rule.summary,
    communityState: row.community_state,
    reportCount: Math.max(0, Math.trunc(row.report_count)),
    confirmationCount: Math.max(0, Math.trunc(row.confirmation_count)),
    firstSeenDate: row.first_seen_date.slice(0, 10),
    lastActivityDate: row.last_activity_date.slice(0, 10),
    location: { latitude: row.public_latitude, longitude: row.public_longitude, uncertaintyRadiusMeters: row.uncertainty_radius_meters },
    policyVersion: COMUN_RELATA_PUBLIC_PROJECTION_POLICY,
    eligibilityReason: row.eligibility_reason,
    projectionState: row.projection_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
