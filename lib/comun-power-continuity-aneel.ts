import candidateJson from "@/data/comun/essential-services/power/power-continuity-candidate-v1-20260812.json";
import manifestJson from "@/data/comun/essential-services/power/source-manifest-v1.json";

export const COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE_VERSION =
  "comun-power-continuity-candidate-v1-20260812" as const;
export const COMUN_POWER_CONTINUITY_ANEEL_OFFICIAL_HOST =
  "dadosabertos.aneel.gov.br" as const;

type Candidate = {
  candidateVersion: typeof COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE_VERSION;
  sourceKind: "official_public_data";
  decision: "PARTIAL_E1_POWER" | "READY_E2_POWER_OBSERVATORY";
  activeSnapshot: boolean;
  automaticPublicationAllowed: boolean;
  runtimeExternalFetchAllowed: boolean;
  municipality: { ibgeCode: string; name: string };
  utility: { name: string; cnpj: string };
  indicators: {
    allowed: string[];
    firstObservedPeriod: string;
    latestObservedPeriod: string;
    periodCount: number;
    decRecordCount: number;
    fecRecordCount: number;
    recordCount: number;
    electricalSetIdsWithIndicators: string[];
  };
  currentMunicipalityRelation: {
    reportedAt: string;
    temporalCoverage: "single_current_materialization" | "period_by_period";
    electricalSetIds: string[];
    electricalSetIdsWithoutObservedDecFec: string[];
  };
  coreLatestComparablePeriod: string | null;
  limits: { available: boolean; periodJoinState: string; normativeClassificationAllowed: boolean };
  compensation: { available: boolean; captureState: string; municipalityIdentityVerified: boolean };
  semantics: {
    municipalityAggregateAllowed: boolean;
    outageEventInferenceAllowed: boolean;
    neighborhoodInferenceAllowed: boolean;
    geographicProjectionAllowed: boolean;
    privateDataAllowed: boolean;
  };
};

type SourceManifest = {
  sourceKind: "official_public_data";
  runtimeExternalFetchAllowed: boolean;
  automaticPublicationAllowed: boolean;
  sources: Array<{
    sourceId: string;
    officialUrl: string;
    rawSha256: string | null;
    materialized: boolean;
  }>;
};

export const COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE = candidateJson as Candidate;
export const COMUN_POWER_CONTINUITY_ANEEL_SOURCE_MANIFEST = manifestJson as SourceManifest;

export function isOfficialAneelPowerSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === COMUN_POWER_CONTINUITY_ANEEL_OFFICIAL_HOST;
  } catch {
    return false;
  }
}

export function parseAneelReferencePeriod(year: number, period: number) {
  if (!Number.isInteger(year) || !Number.isInteger(period) || period < 1 || period > 12) return null;
  return `${year}-${String(period).padStart(2, "0")}`;
}

export function hasDuplicatePowerContinuityKeys(
  records: ReadonlyArray<{ electricalSetId: string; indicator: "DEC" | "FEC"; period: string }>,
) {
  const keys = new Set<string>();
  for (const record of records) {
    const key = `${record.electricalSetId}:${record.indicator}:${record.period}`;
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}

export function validatePowerContinuityAneelCandidate(
  candidate = COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE,
  manifest = COMUN_POWER_CONTINUITY_ANEEL_SOURCE_MANIFEST,
) {
  const errors: string[] = [];
  if (candidate.candidateVersion !== COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE_VERSION) {
    errors.push("wrong_candidate_version");
  }
  if (candidate.sourceKind !== "official_public_data" || manifest.sourceKind !== "official_public_data") {
    errors.push("non_official_source_kind");
  }
  if (candidate.automaticPublicationAllowed || manifest.automaticPublicationAllowed) {
    errors.push("automatic_publication_forbidden");
  }
  if (candidate.runtimeExternalFetchAllowed || manifest.runtimeExternalFetchAllowed) {
    errors.push("runtime_external_fetch_forbidden");
  }
  if (candidate.municipality.ibgeCode !== "3306305" || candidate.utility.name !== "LIGHT SESA") {
    errors.push("wrong_municipality_or_utility");
  }
  if (candidate.indicators.decRecordCount + candidate.indicators.fecRecordCount !== candidate.indicators.recordCount) {
    errors.push("indicator_count_mismatch");
  }
  if (candidate.indicators.allowed.join(",") !== "DEC,FEC") errors.push("indicator_allowlist_mismatch");
  if (candidate.currentMunicipalityRelation.temporalCoverage !== "period_by_period") {
    if (candidate.activeSnapshot) errors.push("active_snapshot_without_temporal_relation");
    if (candidate.coreLatestComparablePeriod !== null) errors.push("comparable_period_without_temporal_relation");
    if (candidate.decision !== "PARTIAL_E1_POWER") errors.push("partial_decision_required");
  }
  if (
    candidate.semantics.municipalityAggregateAllowed ||
    candidate.semantics.outageEventInferenceAllowed ||
    candidate.semantics.neighborhoodInferenceAllowed ||
    candidate.semantics.geographicProjectionAllowed ||
    candidate.semantics.privateDataAllowed
  ) {
    errors.push("forbidden_derivation_enabled");
  }
  if (candidate.limits.normativeClassificationAllowed) errors.push("normative_classification_forbidden");
  for (const source of manifest.sources) {
    if (!isOfficialAneelPowerSourceUrl(source.officialUrl)) errors.push(`non_official_source:${source.sourceId}`);
    if (source.materialized && !/^[a-f0-9]{64}$/.test(source.rawSha256 ?? "")) {
      errors.push(`invalid_materialized_source_hash:${source.sourceId}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isPowerContinuitySnapshotPromotionAllowed(
  candidate = COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE,
) {
  return (
    candidate.activeSnapshot &&
    candidate.currentMunicipalityRelation.temporalCoverage === "period_by_period" &&
    candidate.coreLatestComparablePeriod !== null
  );
}
