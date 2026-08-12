import {
  COMUN_SURFACE_WATER_ACTIVE_SNAPSHOT,
  COMUN_SURFACE_WATER_METHODOLOGY_VERSION,
  COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS,
  COMUN_SURFACE_WATER_SNAPSHOT,
  COMUN_SURFACE_WATER_SOURCE_MANIFEST,
  normalizeOfficialSurfaceWaterIndexes,
  normalizeSurfaceWaterMeasurements,
  validateSurfaceWaterSnapshot,
} from "./comun-environment-surface-water-quality";

export const COMUN_SURFACE_WATER_OBSERVATORY_ID = "environment-surface-water" as const;

const snapshotMetadata = COMUN_SURFACE_WATER_SNAPSHOT as typeof COMUN_SURFACE_WATER_SNAPSHOT & {
  verifiedAt: string;
  periodStart: string;
  periodEnd: string;
};
const manifestSources = COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources as Array<(typeof COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources)[number] & { retrievedAt: string }>;

const EXPLANATIONS: Record<string, string> = {
  biochemical_oxygen_demand: "Indica o oxigênio consumido na decomposição de matéria orgânica.",
  total_phosphorus: "Registra o fósforo total medido na amostra.",
  ammoniacal_nitrogen: "Registra o nitrogênio amoniacal medido na amostra.",
  dissolved_oxygen: "Registra o oxigênio dissolvido medido na amostra.",
  ph: "Indica a acidez ou alcalinidade medida na amostra.",
  turbidity: "Registra a turbidez medida na amostra.",
  escherichia_coli: "Registra Escherichia coli medida na amostra.",
  total_dissolved_solids: "Registra sólidos dissolvidos totais medidos na amostra.",
  water_temperature: "Registra a temperatura da água no momento da coleta.",
  air_temperature: "Registra a temperatura do ar no momento da coleta.",
};

export type SurfaceWaterObservatoryPublicDto = {
  observatoryId: typeof COMUN_SURFACE_WATER_OBSERVATORY_ID;
  methodologyVersion: typeof COMUN_SURFACE_WATER_METHODOLOGY_VERSION;
  sourceKind: "official_public_data";
  privateReportAggregate: false;
  snapshot: { id: string; referenceYear: 2025; verifiedAt: string; parserVersion: string };
  period: { start: string; end: string };
  waterBody: "Rio Paraíba do Sul";
  municipality: "Volta Redonda";
  stations: Array<{ id: string; code: string; officialName: null; sampleCount: number; coordinates: null }>;
  parameters: Array<{ id: string; officialLabel: string; unit: string | null; explanation: string }>;
  samples: Array<{ stationId: string; sampledAt: string; measurements: ReturnType<typeof normalizeSurfaceWaterMeasurements> }>;
  officialIndexes: ReturnType<typeof normalizeOfficialSurfaceWaterIndexes>;
  sources: Array<{ id: string; publisher: "INEA"; officialUrl: string; rawSha256: string; retrievedAt: string; reportedYear: number; parserVersion: string }>;
  limitations: string[];
};

export function getSurfaceWaterObservatoryPublicDto(): SurfaceWaterObservatoryPublicDto {
  const validation = validateSurfaceWaterSnapshot();
  if (!validation.ok) throw new Error(`surface_water_snapshot_invalid:${validation.errors.join(",")}`);
  const measurements = normalizeSurfaceWaterMeasurements();
  const samples = COMUN_SURFACE_WATER_SNAPSHOT.rows.map((row) => {
    const stationId = `surface-water:inea:${String(row[0])}`;
    const sampledAt = String(row[1]);
    return { stationId, sampledAt, measurements: measurements.filter((item) => item.stationId === stationId && item.sampledAt === sampledAt) };
  });
  return {
    observatoryId: COMUN_SURFACE_WATER_OBSERVATORY_ID,
    methodologyVersion: COMUN_SURFACE_WATER_METHODOLOGY_VERSION,
    sourceKind: "official_public_data",
    privateReportAggregate: false,
    snapshot: { id: COMUN_SURFACE_WATER_ACTIVE_SNAPSHOT.activeSnapshotId, referenceYear: 2025, verifiedAt: snapshotMetadata.verifiedAt, parserVersion: COMUN_SURFACE_WATER_SNAPSHOT.parserVersion },
    period: { start: snapshotMetadata.periodStart, end: snapshotMetadata.periodEnd },
    waterBody: "Rio Paraíba do Sul",
    municipality: "Volta Redonda",
    stations: COMUN_SURFACE_WATER_SNAPSHOT.stations.map((station) => ({ id: station.stationId, code: station.officialCode, officialName: null, sampleCount: samples.filter((sample) => sample.stationId === station.stationId).length, coordinates: null })),
    parameters: COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS.map((parameter) => ({ id: parameter.canonicalId, officialLabel: parameter.officialLabel, unit: parameter.officialUnit, explanation: EXPLANATIONS[parameter.canonicalId] ?? "Parâmetro publicado pela fonte oficial." })),
    samples,
    officialIndexes: normalizeOfficialSurfaceWaterIndexes(),
    sources: manifestSources.map((source) => ({ id: source.sourceId, publisher: "INEA", officialUrl: source.officialUrl, rawSha256: source.rawSha256, retrievedAt: source.retrievedAt, reportedYear: source.reportedYear, parserVersion: COMUN_SURFACE_WATER_SNAPSHOT.parserVersion })),
    limitations: [...COMUN_SURFACE_WATER_SNAPSHOT.limitations, "Monitoramento do Rio Paraíba do Sul não é o mesmo que monitoramento da água distribuída para consumo humano.", "Os dados não identificam, por si só, a origem de poluição nem substituem comparação normativa específica."],
  };
}

export function validateSurfaceWaterObservatoryPublicDto(dto = getSurfaceWaterObservatoryPublicDto()) {
  const errors: string[] = [];
  if (dto.sourceKind !== "official_public_data" || dto.privateReportAggregate !== false) errors.push("public_firewall_failed");
  if (dto.snapshot.referenceYear !== 2025 || dto.stations.length !== 2 || dto.samples.length !== 24) errors.push("snapshot_summary_mismatch");
  if (!dto.stations.every((station) => ["PS0419", "PS0421"].includes(station.code) && station.coordinates === null && station.sampleCount === 12)) errors.push("station_contract_failed");
  if (dto.samples.some((sample) => sample.measurements.length !== 10) || dto.samples.flatMap((sample) => sample.measurements).length !== 240) errors.push("measurement_count_mismatch");
  if (dto.officialIndexes.length !== 24 || dto.officialIndexes.some((index) => index.indexMethod !== "IQA_NSF")) errors.push("official_index_contract_failed");
  if (dto.parameters.length !== 10 || dto.sources.some((source) => !source.officialUrl.startsWith("https://www.inea.rj.gov.br/"))) errors.push("source_contract_failed");
  return { ok: errors.length === 0, errors };
}
