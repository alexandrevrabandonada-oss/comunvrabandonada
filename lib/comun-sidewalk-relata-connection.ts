export const SIDEWALK_CONDITIONS = [
  "broken_surface",
  "uneven_surface",
  "missing_sidewalk",
  "blocked_passage",
  "narrow_passage",
  "missing_curb_ramp",
  "damaged_curb_ramp",
  "fixed_obstacle",
  "temporary_obstacle",
  "vegetation_obstruction",
  "drainage_or_water",
  "other",
] as const;

export const SIDEWALK_JURISDICTIONS = [
  "public_municipal_sidewalk",
  "public_square_or_equipment",
  "urban_center_or_interchange",
  "private_property_frontage",
  "other_public_authority",
  "unknown",
] as const;

export type SidewalkJurisdiction = (typeof SIDEWALK_JURISDICTIONS)[number];

export const SIDEWALK_SERVICE_ADAPTER = {
  id: "vr-smi-public-sidewalk-maintenance-v1",
  channelId: "vr-fiscaliza-web",
  sourceVersion: "carta-165-sidewalk-maintenance-v1",
  institution: "Secretaria Municipal de Infraestrutura",
  scope: "public sidewalks, urban centers and interchanges",
  inspectionEstimateDays: 7,
  executionEstimateDays: 30,
  estimateNature: "service_realization_estimate",
  requirements: [
    "full_name",
    "contact",
    "street",
    "number",
    "reference",
    "structured_description",
  ],
  privateFrontagePolicy: "manual_review_only",
  unknownJurisdictionPolicy: "manual_review_only",
} as const;

export const SIDEWALK_RELATA_STATES = [
  "observation_only",
  "relata_available",
  "relata_created",
  "jurisdiction_required",
  "forwarding_eligible",
  "package_ready_channel_degraded",
  "ready_for_assisted_opening",
  "opened_by_person",
  "official_protocol_pending",
  "official_protocol_recorded",
  "resolved",
  "withdrawn",
] as const;

export function canPrepareSidewalkForwarding(jurisdiction: string | null | undefined) {
  return (
    jurisdiction === "public_municipal_sidewalk" ||
    jurisdiction === "public_square_or_equipment" ||
    jurisdiction === "urban_center_or_interchange" ||
    jurisdiction === "other_public_authority"
  );
}

export function classifySidewalkJurisdiction(jurisdiction: string | null | undefined) {
  if (!jurisdiction || !SIDEWALK_JURISDICTIONS.includes(jurisdiction as SidewalkJurisdiction)) {
    return "jurisdiction_required" as const;
  }
  return canPrepareSidewalkForwarding(jurisdiction)
    ? ("forwarding_eligible" as const)
    : ("jurisdiction_required" as const);
}
