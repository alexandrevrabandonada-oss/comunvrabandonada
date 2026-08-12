import {
  COMUN_TERRITORIAL_ACTIVE_SNAPSHOT,
  COMUN_TERRITORIAL_PUBLIC_BASE,
  COMUN_TERRITORIAL_SOURCE_MANIFEST,
} from "./comun-environment-territorial-base";
import {
  COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT,
  COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT,
  COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST,
} from "./comun-environment-public-health-equipment";
import {
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT,
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT,
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST,
} from "./comun-environment-public-social-assistance-equipment";
import type { PublicEquipmentAddress } from "./comun-environment-public-equipment-contract";

export const COMUN_TERRITORIAL_CONTEXT_METHODOLOGY_VERSION =
  "comun-territorial-context-v1" as const;

export type TerritorialContextSource = {
  id: string;
  label: string;
  originalPublisher: string;
  officialUrl: string;
  rawSha256: string;
  verifiedAt: string;
  sourceKind: "official_public_data";
  automaticPublicationAllowed: false;
};

export type TerritorialContextAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhoodLabel: string | null;
  postalCode: string | null;
};

export type TerritorialContextHealthPoint = {
  id: string;
  officialName: string;
  unitType: string | null;
  address: TerritorialContextAddress | null;
  point: { latitude: number; longitude: number; source: "official_source" };
  territorialBinding:
    | { state: "matched"; sectorCode: string }
    | { state: "boundary_ambiguous"; sectorCode: null }
    | { state: "outside_or_geometry_gap"; sectorCode: null };
  sourceId: string;
};

export type TerritorialContextSocialAssistanceUnit = {
  id: string;
  officialName: string;
  equipmentType: string;
  address: TerritorialContextAddress | null;
  addressPublication: "public" | "restricted_by_source" | "unknown";
  geography: "address_only";
  territorialBinding: "not_applicable_address_only";
  sourceId: string;
};

export type TerritorialContextPublicDto = {
  observatoryId: "territory";
  methodologyVersion: typeof COMUN_TERRITORIAL_CONTEXT_METHODOLOGY_VERSION;
  sourceKind: "official_public_data";
  privateReportAggregate: false;
  municipality: { code: "3306305"; name: "Volta Redonda" };
  snapshots: {
    territory: { id: string; verifiedAt: string; censusYear: 2022 };
    health: { id: string; verifiedAt: string };
    socialAssistance: { id: string; verifiedAt: string };
  };
  summary: {
    sectorCount: number;
    populationTotal: number;
    householdsTotal: number;
    healthEquipmentCount: number;
    healthMatchedToSectorCount: number;
    healthBoundaryAmbiguousCount: number;
    healthOutsideOrGeometryGapCount: number;
    socialAssistanceEquipmentCount: number;
    socialAssistanceOfficialPointCount: 0;
    educationEquipmentCount: 0;
  };
  health: {
    points: TerritorialContextHealthPoint[];
    unitTypes: string[];
  };
  socialAssistance: { units: TerritorialContextSocialAssistanceUnit[] };
  sources: TerritorialContextSource[];
  limitations: string[];
  sectorMap: {
    state: "deferred_payload_budget";
    reason: "COMUN_48_2_D3C_SECTOR_MAP_DEFERRED_PAYLOAD_BUDGET";
    sourceRecordCount: number;
    rawSnapshotBytes: number;
  };
};

function publicAddress(address: PublicEquipmentAddress | null): TerritorialContextAddress | null {
  if (!address) return null;
  return {
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhoodLabel: address.neighborhoodLabel,
    postalCode: address.postalCode,
  };
}

function allowedSources() {
  const territorySources = COMUN_TERRITORIAL_SOURCE_MANIFEST.sources.map((source) => ({
    id: source.sourceId,
    label: source.sourceType.replaceAll("_", " "),
    originalPublisher: source.originalPublisher,
    officialUrl: source.officialUrl,
    rawSha256: source.rawSha256,
    verifiedAt: source.retrievedAt,
    sourceKind: source.sourceKind,
    automaticPublicationAllowed: source.automaticPublicationAllowed,
  }));
  const healthSources = COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST.sources.map((source) => ({
    id: source.sourceId,
    label: source.sourceType.replaceAll("_", " "),
    originalPublisher: source.originalPublisher,
    officialUrl: source.officialUrl,
    rawSha256: source.rawSha256,
    verifiedAt: source.retrievedAt,
    sourceKind: "official_public_data" as const,
    automaticPublicationAllowed: false as const,
  }));
  const socialSources = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST.sources.map((source) => ({
    id: source.sourceId,
    label: source.sourceType.replaceAll("_", " "),
    originalPublisher: source.originalPublisher,
    officialUrl: source.officialUrl,
    rawSha256: source.rawSha256,
    verifiedAt: source.retrievedAt,
    sourceKind: "official_public_data" as const,
    automaticPublicationAllowed: false as const,
  }));
  return [...territorySources, ...healthSources, ...socialSources] satisfies TerritorialContextSource[];
}

export function getTerritorialContextPublicDto(): TerritorialContextPublicDto {
  const healthPoints = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records
    .map((record): TerritorialContextHealthPoint | null => {
      if (
        record.geography.level !== "official_public_point" ||
        !["matched", "boundary_ambiguous", "outside_or_geometry_gap"].includes(
          record.territorialBinding.state,
        )
      ) {
        return null;
      }
      return {
      id: record.equipmentId,
      officialName: record.officialName,
      unitType: record.cnesUnitTypeLabel,
      address: publicAddress(record.address),
      point: {
        latitude: record.geography.latitude,
        longitude: record.geography.longitude,
        source: "official_source" as const,
      },
      territorialBinding: record.territorialBinding,
      sourceId: record.sourceId,
      } as TerritorialContextHealthPoint;
    })
    .filter((record): record is TerritorialContextHealthPoint => record !== null)
    .sort((a, b) => a.officialName.localeCompare(b.officialName, "pt-BR"));
  const socialUnits = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.records
    .map((record) => ({
      id: record.equipmentId,
      officialName: record.officialName,
      equipmentType: record.equipmentType,
      address: record.addressPublication === "public" ? publicAddress(record.address) : null,
      addressPublication: record.addressPublication,
      geography: "address_only" as const,
      territorialBinding: "not_applicable_address_only" as const,
      sourceId: record.sourceId,
    }))
    .sort((a, b) => a.officialName.localeCompare(b.officialName, "pt-BR"));
  const unitTypes = [...new Set(healthPoints.flatMap((point) => (point.unitType ? [point.unitType] : [])))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  return {
    observatoryId: "territory",
    methodologyVersion: COMUN_TERRITORIAL_CONTEXT_METHODOLOGY_VERSION,
    sourceKind: "official_public_data",
    privateReportAggregate: false,
    municipality: { code: "3306305", name: "Volta Redonda" },
    snapshots: {
      territory: { id: COMUN_TERRITORIAL_ACTIVE_SNAPSHOT.activeSnapshotId, verifiedAt: COMUN_TERRITORIAL_PUBLIC_BASE.verifiedAt, censusYear: 2022 },
      health: { id: COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId, verifiedAt: COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.verifiedAt },
      socialAssistance: { id: COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId, verifiedAt: COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.verifiedAt },
    },
    summary: {
      sectorCount: COMUN_TERRITORIAL_PUBLIC_BASE.sectorCount,
      populationTotal: COMUN_TERRITORIAL_PUBLIC_BASE.diagnostics.populationTotalFromSectors,
      householdsTotal: COMUN_TERRITORIAL_PUBLIC_BASE.diagnostics.householdsTotalFromSectors,
      healthEquipmentCount: COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.equipmentCount,
      healthMatchedToSectorCount: COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.sectorMatchedCount,
      healthBoundaryAmbiguousCount: COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.boundaryAmbiguousCount,
      healthOutsideOrGeometryGapCount: COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.outsideOrGeometryGapCount,
      socialAssistanceEquipmentCount: COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.equipmentCount,
      socialAssistanceOfficialPointCount: 0,
      educationEquipmentCount: 0,
    },
    health: { points: healthPoints, unitTypes },
    socialAssistance: { units: socialUnits },
    sources: allowedSources(),
    limitations: [
      "Setores censitários não são bairros.",
      "A presença de equipamentos não mede disponibilidade, capacidade, distância ou suficiência de serviços.",
      "Assistência Social permanece somente em lista: as fontes ativas não fornecem ponto oficial para mapa ou vínculo censitário.",
      "Educação continua em validação de fontes e não compõe esta leitura.",
      "Nenhuma camada ambiental, indicador de exposição ou inferência de risco integra esta superfície.",
    ],
    sectorMap: {
      state: "deferred_payload_budget",
      reason: "COMUN_48_2_D3C_SECTOR_MAP_DEFERRED_PAYLOAD_BUDGET",
      sourceRecordCount: COMUN_TERRITORIAL_PUBLIC_BASE.sectorCount,
      rawSnapshotBytes: 2277823,
    },
  };
}

export function validateTerritorialContextPublicDto(
  dto = getTerritorialContextPublicDto(),
) {
  const errors: string[] = [];
  if (dto.sourceKind !== "official_public_data" || dto.privateReportAggregate !== false) {
    errors.push("public_firewall_failed");
  }
  if (dto.summary.sectorCount !== 739 || dto.summary.populationTotal !== 261563 || dto.summary.householdsTotal !== 115652) {
    errors.push("territory_summary_mismatch");
  }
  if (dto.summary.healthEquipmentCount !== 102 || dto.health.points.length !== 102) errors.push("health_count_mismatch");
  if (dto.summary.healthMatchedToSectorCount !== 97 || dto.summary.healthBoundaryAmbiguousCount !== 1 || dto.summary.healthOutsideOrGeometryGapCount !== 4) errors.push("health_binding_count_mismatch");
  if (dto.summary.socialAssistanceEquipmentCount !== 16 || dto.socialAssistance.units.length !== 16 || dto.summary.socialAssistanceOfficialPointCount !== 0) errors.push("social_assistance_count_mismatch");
  if (dto.summary.educationEquipmentCount !== 0) errors.push("education_must_be_excluded");
  if (dto.health.points.some((point) => !/^3306305\d{8}$/.test(point.territorialBinding.state === "matched" ? point.territorialBinding.sectorCode : "3306305" + "00000000"))) errors.push("invalid_sector_code");
  if (dto.socialAssistance.units.some((unit) => unit.geography !== "address_only" || unit.territorialBinding !== "not_applicable_address_only")) errors.push("social_assistance_geography_leak");
  if (dto.sources.some((source) => source.sourceKind !== "official_public_data" || source.automaticPublicationAllowed !== false || !source.officialUrl.startsWith("https://"))) errors.push("invalid_source");
  return { ok: errors.length === 0, errors };
}
