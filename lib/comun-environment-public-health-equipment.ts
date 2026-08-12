import activeSnapshotJson from "@/data/comun/environment/public-equipment/health/active-snapshot.json";
import snapshotJson from "@/data/comun/environment/public-equipment/health/health-equipment-v1-20260811.json";
import sourceManifestJson from "@/data/comun/environment/public-equipment/health/source-manifest-v1.json";
import { COMUN_TERRITORIAL_PUBLIC_BASE } from "./comun-environment-territorial-base";
import {
  COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES,
  COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY,
  isOfficialPublicEquipmentSourceUrl,
  type PublicEquipmentAddress,
} from "./comun-environment-public-equipment-contract";
import { locateOfficialPointInTerritorialSector } from "./comun-public-equipment-sector-locator.mjs";

export const COMUN_PUBLIC_HEALTH_EQUIPMENT_METHODOLOGY_VERSION =
  "comun-public-health-equipment-snapshot-v1" as const;
export const COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST_VERSION =
  "comun-public-health-equipment-source-manifest-v1" as const;

export type OfficialPublicPoint = {
  level: "official_public_point";
  latitude: number;
  longitude: number;
  source: "official_source";
};

export type AddressOnly = {
  level: "address_only";
  latitude: null;
  longitude: null;
  source: "official_source";
};

export type PublicHealthEquipmentSnapshotRecord = {
  equipmentId: string;
  cnesCode: string;
  officialName: string;
  cnesUnitTypeCode: string | null;
  cnesUnitTypeLabel: string | null;
  legalNatureCode: string;
  legalNatureLabel: string;
  managementSphere: string | null;
  susRelation: string | null;
  municipalityCode: "3306305";
  municipalityName: "Volta Redonda";
  address: PublicEquipmentAddress | null;
  geography: OfficialPublicPoint | AddressOnly;
  territorialBinding:
    | { state: "matched"; sectorCode: string }
    | { state: "boundary_ambiguous"; sectorCode: null }
    | { state: "outside_or_geometry_gap"; sectorCode: null }
    | { state: "not_applicable_address_only"; sectorCode: null };
  status: "active_reported";
  sourceId: string;
};

export type PublicHealthEquipmentSource = {
  sourceId: string;
  sourceType:
    | "cnes_active_establishments"
    | "cnes_unit_type_dictionary"
    | "legal_nature_dictionary";
  originalPublisher: string;
  officialUrl: string;
  rawSha256: string;
  semanticSha256: string;
  retrievedAt: string;
  datasetVersion: string;
  parserVersion: "comun-public-health-equipment-capture-v1";
  status: "verified";
  previousSourceId: string | null;
  queryContract?: {
    codigo_uf: "33";
    codigo_municipio: "330630";
    status: "1";
    pageSize: 20;
  };
  sourceReportedFrom?: string;
  sourceReportedThrough?: string;
};

type PublicHealthEquipmentSourceManifest = {
  manifestVersion: typeof COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST_VERSION;
  sources: PublicHealthEquipmentSource[];
  legalNatureDefinitions: Array<{
    code: string;
    label: string;
    sourceId: string;
  }>;
  unitTypeDefinitions: Array<{
    code: string;
    label: string;
    sourceId: string;
  }>;
  automaticPublicationAllowed: false;
};

export type PublicHealthEquipmentSnapshot = {
  snapshotId: string;
  previousSnapshotId: string | null;
  methodologyVersion: typeof COMUN_PUBLIC_HEALTH_EQUIPMENT_METHODOLOGY_VERSION;
  verifiedAt: string;
  municipality: typeof COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY;
  sourceIds: string[];
  territorialSnapshotId: string;
  equipmentCount: number;
  officialPointCount: number;
  addressOnlyCount: number;
  sectorMatchedCount: number;
  boundaryAmbiguousCount: number;
  outsideOrGeometryGapCount: number;
  diagnostics: {
    recordsFetched: number;
    recordsMunicipality: number;
    recordsActive: number;
    recordsPublicLegalNature: number;
    recordsRejectedPrivateNature: number;
    recordsWithOfficialPoint: number;
    recordsAddressOnly: number;
    recordsMatchedToSector: number;
    recordsBoundaryAmbiguous: number;
    recordsOutsideGeometry: number;
  };
  records: PublicHealthEquipmentSnapshotRecord[];
  qualityState: "verified_official_public_data";
  readiness: "READY_D3C_HEALTH";
  limitations: string[];
};

export const COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT =
  activeSnapshotJson as {
    activeSnapshotId: string;
    activeSnapshotFile: string;
    promotedAt: string;
  };
export const COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT =
  snapshotJson as unknown as PublicHealthEquipmentSnapshot;
export const COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST =
  sourceManifestJson as PublicHealthEquipmentSourceManifest;

const EXPECTED_LEGAL_NATURE_LABELS = new Map([
  ["1023", "Órgão Público do Poder Executivo Estadual ou do Distrito Federal"],
  ["1031", "Órgão Público do Poder Executivo Municipal"],
  ["1120", "Autarquia Municipal"],
]);

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

function validOfficialPoint(point: OfficialPublicPoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    point.source === "official_source"
  );
}

export function validatePublicHealthEquipmentSnapshot(
  candidate = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT,
  manifest = COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST,
) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  const unitTypes = new Map<string, string>();
  const sectorCodes = new Set(
    COMUN_TERRITORIAL_PUBLIC_BASE.sectors.map((sector) => sector.sectorCode),
  );

  if (
    manifest.manifestVersion !==
    COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST_VERSION
  ) {
    errors.push("invalid_source_manifest_version");
  }
  if (manifest.automaticPublicationAllowed !== false) {
    errors.push("automatic_publication_must_be_disabled");
  }
  for (const source of manifest.sources) {
    if (sourceIds.has(source.sourceId)) {
      errors.push(`duplicate_source:${source.sourceId}`);
    }
    sourceIds.add(source.sourceId);
    if (!isOfficialPublicEquipmentSourceUrl(source.officialUrl)) {
      errors.push(`unapproved_source:${source.sourceId}`);
    }
    if (!isSha256(source.rawSha256) || !isSha256(source.semanticSha256)) {
      errors.push(`invalid_source_hash:${source.sourceId}`);
    }
    if (source.status !== "verified") {
      errors.push(`unverified_source:${source.sourceId}`);
    }
  }
  const establishmentsSource = manifest.sources.find(
    (source) => source.sourceType === "cnes_active_establishments",
  );
  if (
    !establishmentsSource?.queryContract ||
    establishmentsSource.queryContract.codigo_uf !== "33" ||
    establishmentsSource.queryContract.codigo_municipio !== "330630" ||
    establishmentsSource.queryContract.status !== "1"
  ) {
    errors.push("invalid_active_municipality_query_contract");
  }
  for (const definition of manifest.unitTypeDefinitions) {
    if (unitTypes.has(definition.code)) {
      errors.push(`duplicate_unit_type:${definition.code}`);
    }
    unitTypes.set(definition.code, definition.label);
    if (!sourceIds.has(definition.sourceId)) {
      errors.push(`missing_unit_type_source:${definition.code}`);
    }
  }
  const legalDefinitions = new Map(
    manifest.legalNatureDefinitions.map((entry) => [entry.code, entry.label]),
  );
  for (const code of COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES) {
    if (legalDefinitions.get(code) !== EXPECTED_LEGAL_NATURE_LABELS.get(code)) {
      errors.push(`invalid_legal_nature_definition:${code}`);
    }
  }
  if (legalDefinitions.size !== COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES.length) {
    errors.push("unexpected_legal_nature_definition");
  }

  if (
    candidate.snapshotId !==
    COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId
  ) {
    errors.push("active_snapshot_mismatch");
  }
  if (
    candidate.methodologyVersion !==
    COMUN_PUBLIC_HEALTH_EQUIPMENT_METHODOLOGY_VERSION
  ) {
    errors.push("invalid_methodology");
  }
  if (
    candidate.territorialSnapshotId !==
    COMUN_TERRITORIAL_PUBLIC_BASE.snapshotId
  ) {
    errors.push("territorial_snapshot_mismatch");
  }
  if (
    candidate.municipality.ibgeCode !== "3306305" ||
    candidate.municipality.cnesCode !== "330630" ||
    candidate.municipality.name !== "Volta Redonda"
  ) {
    errors.push("invalid_municipality");
  }
  if (candidate.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
    errors.push("missing_snapshot_source");
  }
  if (candidate.records.length !== candidate.equipmentCount) {
    errors.push("equipment_count_mismatch");
  }

  const cnesCodes = new Set<string>();
  let officialPoints = 0;
  let addressOnly = 0;
  let matched = 0;
  let boundaryAmbiguous = 0;
  let outside = 0;

  for (const record of candidate.records) {
    if (cnesCodes.has(record.cnesCode)) {
      errors.push(`duplicate_cnes:${record.cnesCode}`);
    }
    cnesCodes.add(record.cnesCode);
    if (record.equipmentId !== `health:cnes:${record.cnesCode}`) {
      errors.push(`invalid_equipment_id:${record.cnesCode}`);
    }
    if (
      record.status !== "active_reported" ||
      record.municipalityCode !== "3306305" ||
      record.municipalityName !== "Volta Redonda"
    ) {
      errors.push(`invalid_active_municipality_record:${record.cnesCode}`);
    }
    if (
      !COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES.includes(
        record.legalNatureCode as (typeof COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES)[number],
      ) ||
      legalDefinitions.get(record.legalNatureCode) !== record.legalNatureLabel
    ) {
      errors.push(`non_public_legal_nature:${record.cnesCode}`);
    }
    if (
      record.cnesUnitTypeCode !== null &&
      unitTypes.get(record.cnesUnitTypeCode) !== record.cnesUnitTypeLabel
    ) {
      errors.push(`invalid_unit_type:${record.cnesCode}`);
    }
    if (!sourceIds.has(record.sourceId)) {
      errors.push(`missing_record_source:${record.cnesCode}`);
    }

    if (record.geography.level === "address_only") {
      addressOnly += 1;
      if (
        record.geography.latitude !== null ||
        record.geography.longitude !== null ||
        record.geography.source !== "official_source" ||
        record.territorialBinding.state !== "not_applicable_address_only"
      ) {
        errors.push(`invalid_address_only:${record.cnesCode}`);
      }
      continue;
    }

    officialPoints += 1;
    if (!validOfficialPoint(record.geography)) {
      errors.push(`invalid_official_point:${record.cnesCode}`);
      continue;
    }
    const recalculated = locateOfficialPointInTerritorialSector(
      record.geography,
      COMUN_TERRITORIAL_PUBLIC_BASE.sectors,
    );
    if (recalculated.state !== record.territorialBinding.state) {
      errors.push(`territorial_binding_state_mismatch:${record.cnesCode}`);
      continue;
    }
    if (record.territorialBinding.state === "matched") {
      matched += 1;
      if (
        recalculated.state !== "matched" ||
        recalculated.sectorCode !== record.territorialBinding.sectorCode ||
        !sectorCodes.has(record.territorialBinding.sectorCode)
      ) {
        errors.push(`invalid_matched_sector:${record.cnesCode}`);
      }
    } else if (record.territorialBinding.state === "boundary_ambiguous") {
      boundaryAmbiguous += 1;
    } else if (record.territorialBinding.state === "outside_or_geometry_gap") {
      outside += 1;
    } else {
      errors.push(`invalid_official_point_binding:${record.cnesCode}`);
    }
  }

  const expectedCounts = [
    [candidate.equipmentCount, officialPoints + addressOnly, "geography"],
    [candidate.officialPointCount, officialPoints, "official_point"],
    [candidate.addressOnlyCount, addressOnly, "address_only"],
    [candidate.sectorMatchedCount, matched, "sector_matched"],
    [candidate.boundaryAmbiguousCount, boundaryAmbiguous, "boundary_ambiguous"],
    [candidate.outsideOrGeometryGapCount, outside, "outside_geometry"],
  ] as const;
  for (const [declared, actual, label] of expectedCounts) {
    if (declared !== actual) errors.push(`${label}_count_mismatch`);
  }
  if (
    candidate.officialPointCount !==
    candidate.sectorMatchedCount +
      candidate.boundaryAmbiguousCount +
      candidate.outsideOrGeometryGapCount
  ) {
    errors.push("territorial_binding_invariant_failed");
  }
  if (
    candidate.diagnostics.recordsPublicLegalNature !== candidate.equipmentCount ||
    candidate.diagnostics.recordsRejectedPrivateNature + candidate.equipmentCount !==
      candidate.diagnostics.recordsActive
  ) {
    errors.push("capture_diagnostic_invariant_failed");
  }

  return { ok: errors.length === 0, errors };
}

type DriftRecord = Pick<
  PublicHealthEquipmentSnapshotRecord,
  | "equipmentId"
  | "officialName"
  | "cnesUnitTypeCode"
  | "legalNatureCode"
  | "address"
  | "geography"
  | "status"
>;

export function diffPublicHealthEquipmentSnapshots(
  previous: readonly DriftRecord[],
  candidate: readonly DriftRecord[],
) {
  const previousById = new Map(previous.map((record) => [record.equipmentId, record]));
  const candidateById = new Map(candidate.map((record) => [record.equipmentId, record]));
  const changes = {
    equipmentAdded: [] as string[],
    equipmentRemoved: [] as string[],
    nameChanged: [] as string[],
    typeChanged: [] as string[],
    legalNatureChanged: [] as string[],
    addressChanged: [] as string[],
    coordinatesChanged: [] as string[],
    statusChanged: [] as string[],
  };
  for (const [id, current] of candidateById) {
    const prior = previousById.get(id);
    if (!prior) {
      changes.equipmentAdded.push(id);
      continue;
    }
    if (prior.officialName !== current.officialName) changes.nameChanged.push(id);
    if (prior.cnesUnitTypeCode !== current.cnesUnitTypeCode) changes.typeChanged.push(id);
    if (prior.legalNatureCode !== current.legalNatureCode) {
      changes.legalNatureChanged.push(id);
    }
    if (JSON.stringify(prior.address) !== JSON.stringify(current.address)) {
      changes.addressChanged.push(id);
    }
    if (JSON.stringify(prior.geography) !== JSON.stringify(current.geography)) {
      changes.coordinatesChanged.push(id);
    }
    if (prior.status !== current.status) changes.statusChanged.push(id);
  }
  for (const id of previousById.keys()) {
    if (!candidateById.has(id)) changes.equipmentRemoved.push(id);
  }
  for (const values of Object.values(changes)) values.sort();
  return changes;
}
