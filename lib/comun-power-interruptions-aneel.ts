import activeSnapshotJson from "@/data/comun/essential-services/power-interruptions/active-snapshot.json";
import sourceManifestJson from "@/data/comun/essential-services/power-interruptions/source-manifest-v1.json";
import snapshotJson from "@/data/comun/essential-services/power-interruptions/interruptions-v1-2026-06.json";

export const COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT_VERSION =
  "comun-power-interruptions-aneel-v1" as const;
export const COMUN_POWER_INTERRUPTION_ANEEL_OFFICIAL_HOST =
  "dadosabertos.aneel.gov.br" as const;
export const COMUN_POWER_INTERRUPTION_MUNICIPALITY_CODE = "3306305" as const;

type InterruptionRecord = {
  interruptionKey: string;
  durationSeconds: number;
  NumCNPJDistribuidora: string;
  NomAgente: string;
  SigAgente: string;
  CodMunicipioIBGE: number;
  CodInterrupcao: string;
  CodEvento: string | null;
  CodOcorrencia: string | null;
  CodConjUnidadeConsumidora: number | string;
  DscConjuntoUnidadeConsumidora: string;
  CodAlimentador: string | null;
  CodSubestacao: number | string | null;
  AnoCompetencia: number;
  MesCompetencia: number;
  DatInicioInterrupcao: string;
  DatFimInterrupcao: string;
  QtdConsumidoresAfetados: number | null;
  QtdConsumidoresAtivos: number | null;
};

type Snapshot = {
  snapshotId: string;
  snapshotVersion: typeof COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT_VERSION;
  sourceKind: "official_public_data";
  latestPublishedCompetence: string;
  reportedCompetencePeriods: string[];
  sourceRawSha256: string;
  recordCount: number;
  municipality: { ibgeCode: string; name: string; state: string };
  distributor: { cnpj: string; officialName: string; officialAbbreviation: string };
  semantics: {
    collectiveDecFecIncluded: boolean;
    municipalityAggregateAllowed: boolean;
    outageEventInferenceAllowed: boolean;
    consumerAffectedMeansUniquePeople: boolean;
    electricalSetMeansNeighborhood: boolean;
    geographicProjectionAllowed: boolean;
    privateDataAllowed: boolean;
  };
  records: InterruptionRecord[];
};

type ActiveSnapshot = {
  activeSnapshotId: string;
  snapshotFile: string;
  sourceManifestFile: string;
  automaticPublicationAllowed: boolean;
  runtimeExternalFetchAllowed: boolean;
};

type SourceManifest = {
  sourceKind: "official_public_data";
  runtimeExternalFetchAllowed: boolean;
  automaticPublicationAllowed: boolean;
  sources: Array<{ sourceId: string; officialUrl: string; rawSha256: string | null; materialized: boolean }>;
};

export const COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT = snapshotJson as Snapshot;
export const COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT = activeSnapshotJson as ActiveSnapshot;
export const COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST = sourceManifestJson as SourceManifest;

export function isOfficialAneelPowerInterruptionUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === COMUN_POWER_INTERRUPTION_ANEEL_OFFICIAL_HOST;
  } catch {
    return false;
  }
}

export function deriveOfficialInterruptionDurationSeconds(start: string, end: string) {
  const startAt = Date.parse(`${start.replace(" ", "T")}Z`);
  const endAt = Date.parse(`${end.replace(" ", "T")}Z`);
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt < startAt) return null;
  return (endAt - startAt) / 1000;
}

export function validatePowerInterruptionAneelSnapshot(
  snapshot = COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT,
  activeSnapshot = COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT,
  manifest = COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST,
) {
  const errors: string[] = [];
  if (snapshot.snapshotVersion !== COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT_VERSION) {
    errors.push("wrong_snapshot_version");
  }
  if (activeSnapshot.activeSnapshotId !== snapshot.snapshotId) errors.push("active_snapshot_pointer_mismatch");
  if (activeSnapshot.snapshotFile !== "interruptions-v1-2026-06.json") errors.push("active_snapshot_file_mismatch");
  if (activeSnapshot.sourceManifestFile !== "source-manifest-v1.json") errors.push("active_manifest_file_mismatch");
  if (snapshot.sourceKind !== "official_public_data" || manifest.sourceKind !== "official_public_data") {
    errors.push("non_official_source_kind");
  }
  if (activeSnapshot.automaticPublicationAllowed || activeSnapshot.runtimeExternalFetchAllowed || manifest.automaticPublicationAllowed || manifest.runtimeExternalFetchAllowed) {
    errors.push("public_runtime_or_auto_publication_forbidden");
  }
  if (snapshot.recordCount !== snapshot.records.length) errors.push("record_count_mismatch");
  if (snapshot.municipality.ibgeCode !== COMUN_POWER_INTERRUPTION_MUNICIPALITY_CODE) {
    errors.push("wrong_municipality");
  }
  if (snapshot.distributor.cnpj !== "60444437000146" || snapshot.distributor.officialAbbreviation !== "LIGHT SESA") {
    errors.push("unexpected_distributor");
  }
  const keys = new Set<string>();
  for (const record of snapshot.records) {
    if (String(record.CodMunicipioIBGE) !== COMUN_POWER_INTERRUPTION_MUNICIPALITY_CODE) errors.push("record_outside_municipality");
    if (record.NumCNPJDistribuidora !== snapshot.distributor.cnpj || record.NomAgente !== snapshot.distributor.officialName || record.SigAgente !== snapshot.distributor.officialAbbreviation) {
      errors.push("record_distributor_mismatch");
    }
    if (keys.has(record.interruptionKey)) errors.push("duplicate_interruption_identity");
    keys.add(record.interruptionKey);
    if (deriveOfficialInterruptionDurationSeconds(record.DatInicioInterrupcao, record.DatFimInterrupcao) !== record.durationSeconds) {
      errors.push("invalid_derived_duration");
    }
  }
  if (
    snapshot.semantics.collectiveDecFecIncluded ||
    snapshot.semantics.municipalityAggregateAllowed ||
    snapshot.semantics.outageEventInferenceAllowed ||
    snapshot.semantics.consumerAffectedMeansUniquePeople ||
    snapshot.semantics.electricalSetMeansNeighborhood ||
    snapshot.semantics.geographicProjectionAllowed ||
    snapshot.semantics.privateDataAllowed
  ) {
    errors.push("forbidden_semantic_derivation_enabled");
  }
  const materializedInterruptionSource = manifest.sources.find(
    (source) => source.sourceId === "aneel-power-interruptions-2026-parquet",
  );
  if (!materializedInterruptionSource || materializedInterruptionSource.rawSha256 !== snapshot.sourceRawSha256) {
    errors.push("source_hash_mismatch");
  }
  for (const source of manifest.sources) {
    if (!isOfficialAneelPowerInterruptionUrl(source.officialUrl)) errors.push(`non_official_source:${source.sourceId}`);
    if (source.materialized && !/^[a-f0-9]{64}$/.test(source.rawSha256 ?? "")) {
      errors.push(`invalid_materialized_source_hash:${source.sourceId}`);
    }
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function canUsePowerInterruptionDataForDecFec() {
  return false;
}

export function canSumAffectedConsumersAsUniquePeople() {
  return false;
}
