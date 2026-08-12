import activeSnapshotJson from "@/data/comun/environment/public-equipment/social-assistance/active-snapshot.json";
import snapshotJson from "@/data/comun/environment/public-equipment/social-assistance/social-assistance-equipment-v1-20260812.json";
import sourceManifestJson from "@/data/comun/environment/public-equipment/social-assistance/source-manifest-v1.json";
import {
  COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY,
  isOfficialPublicEquipmentSourceUrl,
  normalizePublicEquipmentAddress,
  validatePublicEquipmentGeography,
  type PublicEquipmentAddress,
} from "./comun-environment-public-equipment-contract";

export const COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_METHODOLOGY_VERSION =
  "comun-public-social-assistance-equipment-snapshot-v1" as const;
export const COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST_VERSION =
  "comun-public-social-assistance-equipment-source-manifest-v1" as const;

export type SocialAssistanceEquipmentType =
  | "cras"
  | "creas"
  | "centro_pop"
  | "centro_dia"
  | "acolhimento"
  | "other";

export type PublicSocialAssistanceEquipmentSnapshotRecord = {
  equipmentId: string;
  cadsuasCode: string;
  officialName: string;
  equipmentType: SocialAssistanceEquipmentType;
  management: "public_municipal" | "public_state" | "public_federal";
  municipalityCode: "3306305";
  municipalityName: "Volta Redonda";
  address: PublicEquipmentAddress | null;
  addressPublication: "public" | "restricted_by_source" | "unknown";
  geography: {
    level: "address_only";
    latitude: null;
    longitude: null;
    source: "official_source";
  };
  territorialBinding: {
    state: "not_applicable_address_only";
    sectorCode: null;
  };
  status: "active_reported";
  sourceId: string;
};

export type PublicSocialAssistanceEquipmentSource = {
  sourceId: string;
  sourceType:
    | "cadsuas_public_directory"
    | "municipal_units_directory"
    | "municipal_current_activity_publication";
  originalPublisher: string;
  officialUrl: string;
  rawSha256: string;
  semanticSha256: string;
  retrievedAt: string;
  datasetVersion: string;
  parserVersion: "comun-public-social-assistance-equipment-capture-v1";
  status: "verified";
  previousSourceId: string | null;
};

export type PublicSocialAssistanceEquipmentSourceManifest = {
  manifestVersion: typeof COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST_VERSION;
  sources: PublicSocialAssistanceEquipmentSource[];
  automaticPublicationAllowed: false;
};

export type PublicSocialAssistanceEquipmentSnapshot = {
  snapshotId: string;
  previousSnapshotId: string | null;
  methodologyVersion: typeof COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_METHODOLOGY_VERSION;
  verifiedAt: string;
  municipality: { ibgeCode: "3306305"; name: "Volta Redonda" };
  sourceIds: string[];
  equipmentCount: number;
  addressOnlyCount: number;
  officialPointCount: 0;
  sectorMatchedCount: 0;
  boundaryAmbiguousCount: 0;
  outsideOrGeometryGapCount: 0;
  diagnostics: {
    cadsuasRows: number;
    municipalDirectoryRows: number;
    recordsWithCadsuasId: number;
    recordsMatchedMunicipalDirectory: number;
    recordsActiveReported: number;
    recordsPublicManagement: number;
    recordsAddressPublic: number;
    recordsAddressRestricted: number;
    recordsAddressUnknown: number;
    recordsAddressOnly: number;
    recordsWithOfficialPoint: 0;
    recordsWithoutSectorBinding: number;
    excludedNoMunicipalCorroboration: number;
    sourceConflicts: number;
  };
  records: PublicSocialAssistanceEquipmentSnapshotRecord[];
  qualityState: "verified_official_public_data";
  readiness: "READY_D3C_SOCIAL_ASSISTANCE";
  limitations: string[];
};

export const COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT =
  activeSnapshotJson as {
    activeSnapshotId: string;
    activeSnapshotFile: string;
    promotedAt: string;
  };
export const COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT =
  snapshotJson as unknown as PublicSocialAssistanceEquipmentSnapshot;
export const COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST =
  sourceManifestJson as PublicSocialAssistanceEquipmentSourceManifest;

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

export function validatePublicSocialAssistanceEquipmentSnapshot(
  candidate = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT,
  manifest = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST,
) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  if (
    manifest.manifestVersion !==
    COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST_VERSION
  ) {
    errors.push("invalid_source_manifest_version");
  }
  if (manifest.automaticPublicationAllowed !== false) {
    errors.push("automatic_publication_must_be_disabled");
  }
  for (const source of manifest.sources) {
    if (sourceIds.has(source.sourceId)) errors.push(`duplicate_source:${source.sourceId}`);
    sourceIds.add(source.sourceId);
    if (!isOfficialPublicEquipmentSourceUrl(source.officialUrl)) {
      errors.push(`unapproved_source:${source.sourceId}`);
    }
    if (!isSha256(source.rawSha256) || !isSha256(source.semanticSha256)) {
      errors.push(`invalid_source_hash:${source.sourceId}`);
    }
    if (source.status !== "verified") errors.push(`unverified_source:${source.sourceId}`);
  }
  if (
    candidate.snapshotId !==
      COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId ||
    candidate.methodologyVersion !==
      COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_METHODOLOGY_VERSION ||
    candidate.municipality.ibgeCode !== COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.ibgeCode ||
    candidate.municipality.name !== COMUN_PUBLIC_EQUIPMENT_MUNICIPALITY.name
  ) {
    errors.push("invalid_active_snapshot_contract");
  }
  if (candidate.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
    errors.push("missing_snapshot_source");
  }

  const cadsuasCodes = new Set<string>();
  let publicAddress = 0;
  let restrictedAddress = 0;
  let unknownAddress = 0;
  for (const record of candidate.records) {
    if (cadsuasCodes.has(record.cadsuasCode)) {
      errors.push(`duplicate_cadsuas:${record.cadsuasCode}`);
    }
    cadsuasCodes.add(record.cadsuasCode);
    if (record.equipmentId !== `social-assistance:cadsuas:${record.cadsuasCode}`) {
      errors.push(`invalid_equipment_id:${record.cadsuasCode}`);
    }
    if (
      record.status !== "active_reported" ||
      !["public_municipal", "public_state", "public_federal"].includes(record.management) ||
      record.municipalityCode !== "3306305" ||
      record.municipalityName !== "Volta Redonda" ||
      !sourceIds.has(record.sourceId)
    ) {
      errors.push(`invalid_public_active_record:${record.cadsuasCode}`);
    }
    if (
      record.geography.level !== "address_only" ||
      record.geography.latitude !== null ||
      record.geography.longitude !== null ||
      record.geography.source !== "official_source" ||
      record.territorialBinding.state !== "not_applicable_address_only" ||
      record.territorialBinding.sectorCode !== null
    ) {
      errors.push(`invalid_address_only_or_sector:${record.cadsuasCode}`);
    }
    for (const error of validatePublicEquipmentGeography(record.geography).errors) {
      errors.push(`${error}:${record.cadsuasCode}`);
    }
    if (record.addressPublication === "public") {
      publicAddress += 1;
      if (normalizePublicEquipmentAddress(record.address) === null) {
        errors.push(`missing_public_address:${record.cadsuasCode}`);
      }
    } else if (record.addressPublication === "restricted_by_source") {
      restrictedAddress += 1;
      if (record.address !== null) errors.push(`restricted_address_leak:${record.cadsuasCode}`);
    } else {
      unknownAddress += 1;
      if (record.address !== null) errors.push(`unknown_address_leak:${record.cadsuasCode}`);
    }
  }

  if (
    candidate.equipmentCount !== candidate.records.length ||
    candidate.addressOnlyCount !== candidate.records.length ||
    candidate.officialPointCount !== 0 ||
    candidate.sectorMatchedCount !== 0 ||
    candidate.boundaryAmbiguousCount !== 0 ||
    candidate.outsideOrGeometryGapCount !== 0 ||
    candidate.diagnostics.recordsAddressOnly !== candidate.records.length ||
    candidate.diagnostics.recordsWithOfficialPoint !== 0 ||
    candidate.diagnostics.recordsWithoutSectorBinding !== candidate.records.length ||
    candidate.diagnostics.recordsActiveReported !== candidate.records.length ||
    candidate.diagnostics.recordsPublicManagement !== candidate.records.length ||
    candidate.diagnostics.recordsAddressPublic !== publicAddress ||
    candidate.diagnostics.recordsAddressRestricted !== restrictedAddress ||
    candidate.diagnostics.recordsAddressUnknown !== unknownAddress
  ) {
    errors.push("snapshot_count_invariant_failed");
  }
  return { ok: errors.length === 0, errors };
}

type DriftRecord = Pick<
  PublicSocialAssistanceEquipmentSnapshotRecord,
  | "equipmentId"
  | "officialName"
  | "equipmentType"
  | "management"
  | "address"
  | "addressPublication"
  | "status"
>;

export function diffPublicSocialAssistanceEquipmentSnapshots(
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
    managementChanged: [] as string[],
    addressChanged: [] as string[],
    addressPublicationChanged: [] as string[],
    statusChanged: [] as string[],
  };
  for (const [id, current] of candidateById) {
    const prior = previousById.get(id);
    if (!prior) {
      changes.equipmentAdded.push(id);
      continue;
    }
    if (prior.officialName !== current.officialName) changes.nameChanged.push(id);
    if (prior.equipmentType !== current.equipmentType) changes.typeChanged.push(id);
    if (prior.management !== current.management) changes.managementChanged.push(id);
    if (JSON.stringify(prior.address) !== JSON.stringify(current.address)) {
      changes.addressChanged.push(id);
    }
    if (prior.addressPublication !== current.addressPublication) {
      changes.addressPublicationChanged.push(id);
    }
    if (prior.status !== current.status) changes.statusChanged.push(id);
  }
  for (const id of previousById.keys()) {
    if (!candidateById.has(id)) changes.equipmentRemoved.push(id);
  }
  for (const value of Object.values(changes)) value.sort();
  return changes;
}
