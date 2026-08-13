import contractJson from "@/data/comun/essential-services/essential-services-public-data-contract-v1.json";

export const COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT_VERSION =
  "comun-essential-services-public-data-contract-v1" as const;
export const COMUN_ESSENTIAL_SERVICES_DOMAINS = [
  "power_distribution_continuity",
  "water_supply_service",
  "public_lighting_service",
] as const;
export const COMUN_ESSENTIAL_SERVICES_OFFICIAL_SOURCE_DOMAINS = [
  "dadosabertos.aneel.gov.br",
  "www.saaevr.com.br",
  "servicos.voltaredonda.rj.gov.br",
  "www.voltaredonda.rj.gov.br",
] as const;

export type EssentialServicesDomain = (typeof COMUN_ESSENTIAL_SERVICES_DOMAINS)[number];
export type EssentialServicesReadiness =
  | "READY_E1_POWER"
  | "PARTIAL_E1_POWER"
  | "PARTIAL_E_POWER"
  | "READY_E1_WATER"
  | "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY"
  | "READY_E1_LIGHTING"
  | "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY";
export type WaterSupplyEventKind =
  | "scheduled_maintenance"
  | "network_break"
  | "treatment_interruption"
  | "pumping_interruption"
  | "energy_dependency"
  | "other_official_notice";

export type EssentialServicesSource = {
  sourceId: string;
  publisher: string;
  officialUrl: string;
  rawSha256: string;
  publicSafe: boolean;
  runtimeSuitable: boolean;
};

export type WaterSupplyOfficialNotice = {
  noticeId: string;
  publishedAt: string;
  reportedStartAt: string | null;
  expectedResumeAt: string | null;
  actualResumeAt: string | null;
  gradualResumption: boolean;
  eventKind: WaterSupplyEventKind;
  affectedAreaLabels: string[];
  dependency: "power_distribution" | null;
  sourceId: string;
};

export type PublicLightingServiceDescriptor = {
  administrativeServiceEstimateDays: number | null;
  estimateIsSla: false;
  incidentDatasetEstablished: false;
};

type EssentialServicesContract = {
  contractVersion: typeof COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT_VERSION;
  sourceKind: "official_public_data";
  automaticPublicationAllowed: false;
  runtimeExternalFetchAllowed: false;
  decisions: Record<EssentialServicesDomain, EssentialServicesReadiness>;
  domains: Record<EssentialServicesDomain, {
    canonicalDomain: EssentialServicesDomain;
    decision: EssentialServicesReadiness;
    candidateSnapshotAllowed?: boolean;
    sources: EssentialServicesSource[];
  }>;
};

export const COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT =
  contractJson as EssentialServicesContract;

export function isOfficialEssentialServicesSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_ESSENTIAL_SERVICES_OFFICIAL_SOURCE_DOMAINS.includes(
        url.hostname as (typeof COMUN_ESSENTIAL_SERVICES_OFFICIAL_SOURCE_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

export function validateEssentialServicesDataContract(
  contract = COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT,
) {
  const errors: string[] = [];
  if (contract.contractVersion !== COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT_VERSION) {
    errors.push("wrong_contract_version");
  }
  if (contract.sourceKind !== "official_public_data") errors.push("wrong_source_kind");
  if (contract.automaticPublicationAllowed) errors.push("automatic_publication_forbidden");
  if (contract.runtimeExternalFetchAllowed) errors.push("runtime_external_fetch_forbidden");

  for (const domain of COMUN_ESSENTIAL_SERVICES_DOMAINS) {
    const descriptor = contract.domains[domain];
    if (!descriptor || descriptor.canonicalDomain !== domain) errors.push(`wrong_domain:${domain}`);
    if (!descriptor || contract.decisions[domain] !== descriptor.decision) {
      errors.push(`decision_mismatch:${domain}`);
      continue;
    }
    for (const source of descriptor.sources) {
      if (!isOfficialEssentialServicesSourceUrl(source.officialUrl)) {
        errors.push(`non_official_source:${source.sourceId}`);
      }
      if (!isSha256(source.rawSha256)) errors.push(`invalid_source_hash:${source.sourceId}`);
      if (!source.publicSafe) errors.push(`non_public_source:${source.sourceId}`);
      if (source.runtimeSuitable) errors.push(`runtime_source_forbidden:${source.sourceId}`);
    }
  }

  if (contract.decisions.power_distribution_continuity !== "PARTIAL_E1_POWER") {
    errors.push("power_readiness_not_fail_closed");
  }
  if (contract.domains.power_distribution_continuity?.candidateSnapshotAllowed !== false) {
    errors.push("power_candidate_snapshot_must_remain_disabled");
  }
  if (contract.decisions.water_supply_service !== "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY") {
    errors.push("water_completeness_not_fail_closed");
  }
  if (contract.decisions.public_lighting_service !== "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY") {
    errors.push("lighting_completeness_not_fail_closed");
  }
  return { ok: errors.length === 0, errors };
}

export function canUsePowerContinuityAsOutageEvents() {
  return false;
}

export function isWaterSupplyNoticeReadyForConfirmedResumption(
  notice: WaterSupplyOfficialNotice,
) {
  return notice.actualResumeAt !== null && !notice.gradualResumption;
}
