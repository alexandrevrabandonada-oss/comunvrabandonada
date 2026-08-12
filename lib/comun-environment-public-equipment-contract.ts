import sourceAuditJson from "@/data/comun/environment/public-equipment/source-audit-v1.json";
import { locateOfficialPointInTerritorialSector } from "./comun-public-equipment-sector-locator.mjs";
export type { SectorLocatorInput } from "./comun-public-equipment-sector-locator.mjs";
export { locateOfficialPointInTerritorialSector };

export const COMUN_PUBLIC_EQUIPMENT_CONTRACT_VERSION =
  "comun-public-equipment-data-contract-v1" as const;
export const COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY = {
  ibgeCode: "3306305",
  cnesCode: "330630",
  name: "Volta Redonda",
  stateCode: "33",
} as const;
export const COMUN_PUBLIC_EQUIPMENT_SOURCE_DOMAINS = [
  "apidadosabertos.saude.gov.br",
  "dados.gov.br",
  "download.inep.gov.br",
  "www.gov.br",
  "www2.voltaredonda.rj.gov.br",
  "www.voltaredonda.rj.gov.br",
  "servicos.voltaredonda.rj.gov.br",
  "aplicacoes.mds.gov.br",
  "concla.ibge.gov.br",
] as const;
export const COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES = [
  "1023",
  "1031",
  "1120",
] as const;

export type PublicEquipmentDomain =
  "health" | "education" | "social_assistance";
export type PublicEquipmentDecision =
  "READY_D3B1" | "PARTIAL_D3B" | "BLOCKED_D3B";

export type PublicEquipmentAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhoodLabel: string | null;
  postalCode: string | null;
};

export type PublicEquipmentGeography =
  | {
      level: "official_public_point";
      latitude: number;
      longitude: number;
      source: "official_source";
    }
  | {
      level: "address_only";
      latitude: null;
      longitude: null;
      source: "official_source";
    }
  | {
      level: "derived_geocoded_point";
      latitude: number;
      longitude: number;
      source: "derived";
      geocoder: string;
      confidence: string;
    };

export type PublicHealthEquipment = {
  equipmentId: string;
  cnesCode: string;
  officialName: string;
  equipmentType: string | null;
  managementSphere: string | null;
  susRelation: string | null;
  municipalityCode: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.ibgeCode;
  municipalityName: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.name;
  address: PublicEquipmentAddress | null;
  geography: PublicEquipmentGeography;
  sourceId: string;
};

export type PublicEducationEquipment = {
  equipmentId: string;
  inepCode: string | null;
  officialName: string;
  administrativeCategory: string;
  educationStages: readonly string[];
  municipalityCode: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.ibgeCode;
  municipalityName: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.name;
  address: PublicEquipmentAddress | null;
  geography: PublicEquipmentGeography;
  sourceId: string;
};

export type PublicSocialAssistanceEquipment = {
  equipmentId: string;
  cadsuasCode: string | null;
  officialName: string;
  equipmentType:
    "cras" | "creas" | "centro_pop" | "centro_dia" | "acolhimento" | "other";
  municipalityCode: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.ibgeCode;
  municipalityName: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.name;
  address: PublicEquipmentAddress | null;
  geography: PublicEquipmentGeography;
  sourceId: string;
};

export type PublicEquipmentRecord =
  | PublicHealthEquipment
  | PublicEducationEquipment
  | PublicSocialAssistanceEquipment;

export type PublicEquipmentSourceAudit = {
  sourceId: string;
  domain: PublicEquipmentDomain;
  sourceType: string;
  originalPublisher: string;
  officialUrl: string;
  contentType: string;
  retrievedAt: string;
  rawSha256: string;
  semanticSha256: string | null;
  datasetVersion: string;
  parserVersion: string;
  qualityState: "verified_source" | "partial" | "source_conflict";
  status: "active" | "superseded";
  machineReadable: boolean;
  stableId: string;
  address: string;
  officialCoordinates: string;
  statusAvailable: boolean | string;
  updateFrequency: string;
  privacyRisk: string;
  sourceConflictRisk: string;
  recommendedUse: string;
};

type DomainAudit = {
  decision: PublicEquipmentDecision;
  canonicalSourceIds: string[];
  corroboratingSourceIds?: string[];
  recordsWithOfficialCoordinates: number;
  selectionRule: string;
  conflicts: string[];
  limitations: string[];
  [key: string]: unknown;
};

export type PublicEquipmentSourceAuditDocument = {
  contractVersion: typeof COMUN_PUBLIC_EQUIPMENT_CONTRACT_VERSION;
  auditedAt: string;
  municipality: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY;
  automaticPublicationAllowed: false;
  geocodingPolicy: {
    externalGeocodingAllowed: false;
    producedGeographyLevels: Array<"official_public_point" | "address_only">;
    sectorBinding: "official_point_only";
  };
  sources: PublicEquipmentSourceAudit[];
  domains: Record<PublicEquipmentDomain, DomainAudit>;
  limitations: string[];
};

export const COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT =
  sourceAuditJson as PublicEquipmentSourceAuditDocument;

function cleanAddressPart(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizePublicEquipmentAddress(
  value: Partial<PublicEquipmentAddress> | null | undefined,
): PublicEquipmentAddress | null {
  if (!value) return null;
  const normalized = {
    street: cleanAddressPart(value.street),
    number: cleanAddressPart(value.number),
    complement: cleanAddressPart(value.complement),
    neighborhoodLabel: cleanAddressPart(value.neighborhoodLabel),
    postalCode: cleanAddressPart(value.postalCode),
  };
  return Object.values(normalized).every((part) => part === null)
    ? null
    : normalized;
}

function validPublicCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function validatePublicEquipmentGeography(
  geography: PublicEquipmentGeography,
  options: { allowDerived?: boolean } = {},
) {
  const errors: string[] = [];
  if (geography.level === "address_only") {
    if (
      geography.latitude !== null ||
      geography.longitude !== null ||
      geography.source !== "official_source"
    ) {
      errors.push("invalid_address_only_geography");
    }
  } else {
    if (!validPublicCoordinate(geography.latitude, geography.longitude)) {
      errors.push("invalid_public_coordinate");
    }
    if (
      geography.level === "official_public_point" &&
      geography.source !== "official_source"
    ) {
      errors.push("official_point_requires_official_source");
    }
    if (geography.level === "derived_geocoded_point" && !options.allowDerived) {
      errors.push("derived_geocoding_forbidden");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function isOfficialPublicEquipmentSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      COMUN_PUBLIC_EQUIPMENT_SOURCE_DOMAINS.includes(
        url.hostname as (typeof COMUN_PUBLIC_EQUIPMENT_SOURCE_DOMAINS)[number],
      )
    );
  } catch {
    return false;
  }
}

export function isPublicCnesLegalNature(code: string | number | null) {
  return COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES.includes(
    String(code ?? "") as (typeof COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES)[number],
  );
}

export function validatePublicEquipmentRecords(
  records: readonly PublicEquipmentRecord[],
) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const record of records) {
    if (!record.equipmentId) errors.push("missing_equipment_id");
    if (ids.has(record.equipmentId)) {
      errors.push(`duplicate_equipment_id:${record.equipmentId}`);
    }
    ids.add(record.equipmentId);
    if (
      record.municipalityCode !==
        COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.ibgeCode ||
      record.municipalityName !== COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.name
    ) {
      errors.push(`wrong_municipality:${record.equipmentId}`);
    }
    for (const error of validatePublicEquipmentGeography(record.geography)
      .errors) {
      errors.push(`${error}:${record.equipmentId}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

type EquipmentComparable = {
  equipmentId: string;
  officialName: string;
  equipmentType: string | null;
  address: PublicEquipmentAddress | null;
  geography: PublicEquipmentGeography;
  status: string | null;
};

function stable(value: unknown) {
  return JSON.stringify(value);
}

export function diffPublicEquipmentCatalogs(
  previous: readonly EquipmentComparable[],
  next: readonly EquipmentComparable[],
) {
  const oldById = new Map(
    previous.map((record) => [record.equipmentId, record]),
  );
  const newById = new Map(next.map((record) => [record.equipmentId, record]));
  const changes = {
    equipmentAdded: [] as string[],
    equipmentRemoved: [] as string[],
    nameChanged: [] as string[],
    typeChanged: [] as string[],
    addressChanged: [] as string[],
    coordinatesChanged: [] as string[],
    statusChanged: [] as string[],
  };
  for (const [id, current] of newById) {
    const prior = oldById.get(id);
    if (!prior) {
      changes.equipmentAdded.push(id);
      continue;
    }
    if (prior.officialName !== current.officialName)
      changes.nameChanged.push(id);
    if (prior.equipmentType !== current.equipmentType)
      changes.typeChanged.push(id);
    if (stable(prior.address) !== stable(current.address))
      changes.addressChanged.push(id);
    if (stable(prior.geography) !== stable(current.geography))
      changes.coordinatesChanged.push(id);
    if (prior.status !== current.status) changes.statusChanged.push(id);
  }
  for (const id of oldById.keys()) {
    if (!newById.has(id)) changes.equipmentRemoved.push(id);
  }
  for (const values of Object.values(changes)) values.sort();
  return changes;
}

export function validatePublicEquipmentSourceAudit(
  audit = COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT,
) {
  const errors: string[] = [];
  if (audit.contractVersion !== COMUN_PUBLIC_EQUIPMENT_CONTRACT_VERSION) {
    errors.push("wrong_contract_version");
  }
  if (audit.automaticPublicationAllowed !== false) {
    errors.push("automatic_publication_must_be_disabled");
  }
  if (audit.geocodingPolicy.externalGeocodingAllowed !== false) {
    errors.push("external_geocoding_must_be_disabled");
  }
  if (
    audit.geocodingPolicy.producedGeographyLevels.includes(
      "derived_geocoded_point" as "official_public_point",
    )
  ) {
    errors.push("derived_geography_present_in_d3b0");
  }
  const sourceIds = new Set<string>();
  for (const source of audit.sources) {
    if (sourceIds.has(source.sourceId))
      errors.push(`duplicate_source:${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (!isOfficialPublicEquipmentSourceUrl(source.officialUrl)) {
      errors.push(`unapproved_source:${source.sourceId}`);
    }
    if (!/^[a-f0-9]{64}$/.test(source.rawSha256)) {
      errors.push(`invalid_source_hash:${source.sourceId}`);
    }
    if (
      source.semanticSha256 &&
      !/^[a-f0-9]{64}$/.test(source.semanticSha256)
    ) {
      errors.push(`invalid_semantic_hash:${source.sourceId}`);
    }
  }
  for (const [domainName, domain] of Object.entries(audit.domains)) {
    for (const sourceId of [
      ...domain.canonicalSourceIds,
      ...(domain.corroboratingSourceIds ?? []),
    ]) {
      if (!sourceIds.has(sourceId))
        errors.push(`missing_domain_source:${domainName}:${sourceId}`);
    }
  }
  if (audit.domains.health.decision !== "READY_D3B1")
    errors.push("health_not_ready");
  if (audit.domains.education.decision !== "PARTIAL_D3B")
    errors.push("education_must_remain_partial");
  if (audit.domains.social_assistance.decision !== "PARTIAL_D3B")
    errors.push("assistance_must_remain_partial");
  if (audit.domains.education.conflicts.length === 0)
    errors.push("education_conflict_missing");
  if (audit.domains.social_assistance.conflicts.length === 0)
    errors.push("assistance_conflict_missing");
  return { ok: errors.length === 0, errors };
}
