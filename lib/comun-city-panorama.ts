import { gzipSync } from "node:zlib";
import { getPowerInterruptionSummaryDto } from "./comun-essential-power-interruption-observatory";
import { getSurfaceWaterObservatoryPublicDto } from "./comun-observatory-surface-water";
import { getTerritorialContextPublicDto } from "./comun-observatory-territorial-context";
import {
  getSidewalkReviewedProjectionForObservatory,
  type ProjectionResult,
} from "./comun-observatory-sidewalk-adapter";
import { getTransportProgrammedNetworkPublicDto } from "./comun-transport-programmed-network";
import { getTransportSystemMetricsPublicResponse } from "./comun-transport-system-metrics";

export const COMUN_CITY_PANORAMA_ID = "volta-redonda-public-panorama-v1" as const;
export const COMUN_CITY_PANORAMA_METHODOLOGY_VERSION =
  "comun-city-panorama-v1" as const;

export type PanoramaSourceKind =
  | "official_public_data"
  | "reviewed_community_projection";
export type PanoramaAvailability = "available" | "temporarily_unavailable";
export type PanoramaComparabilityState =
  | "comparable"
  | "context_only"
  | "not_comparable_geography"
  | "not_comparable_period"
  | "not_comparable_methodology";
export type PublicEvidenceClaimKind =
  | "descriptive_fact"
  | "coverage_statement"
  | "data_gap";

export type PublicEvidenceReferenceV1 = {
  refId: string;
  observatoryId: string;
  layerId: string;
  claimKind: PublicEvidenceClaimKind;
  title: string;
  publicPath: string;
  sourceKind: PanoramaSourceKind;
  referencePeriod: string;
  sourceRefs: readonly string[];
  limitations: readonly string[];
};

export type CityPanoramaFact = {
  label: string;
  value: string;
  description: string;
};

export type PanoramaLayer = {
  id: "territory" | "sidewalks" | "transport" | "surface_water" | "power";
  label: string;
  sourceKind: PanoramaSourceKind;
  publicPath: string;
  availability: PanoramaAvailability;
  referencePeriod: string;
  geographicGranularity: string;
  temporalGranularity: string;
  coverageStatement: string;
  facts: readonly CityPanoramaFact[];
  limitations: readonly string[];
  sourceRefs: readonly string[];
};

export type PanoramaKnownGap = {
  domain: string;
  state: "partial" | "blocked";
  reasonCode: string;
  humanDescription: string;
};

export type CityPanoramaPublicDto = {
  panoramaId: typeof COMUN_CITY_PANORAMA_ID;
  methodologyVersion: typeof COMUN_CITY_PANORAMA_METHODOLOGY_VERSION;
  municipality: { ibgeCode: "3306305"; name: "Volta Redonda" };
  layers: readonly PanoramaLayer[];
  knownGaps: readonly PanoramaKnownGap[];
  comparability: readonly {
    state: PanoramaComparabilityState;
    statement: string;
  }[];
  evidenceReferences: readonly PublicEvidenceReferenceV1[];
};

export type CityPanoramaLayerInputs = {
  territorialContextEnabled: boolean;
  sidewalkAnalyticsEnabled: boolean;
  transportProgrammedEnabled: boolean;
  transportSystemMetricsEnabled: boolean;
  surfaceWaterEnabled: boolean;
  essentialPowerInterruptionEnabled: boolean;
  sidewalkProjection?: ProjectionResult | null;
};

const KNOWN_GAPS: readonly PanoramaKnownGap[] = [
  { domain: "Qualidade do ar atual", state: "blocked", reasonCode: "COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE", humanDescription: "O contrato atual do COMUN ainda não possui uma fonte pública suficientemente validada para mostrar qualidade do ar atual." },
  { domain: "Hidrometeorologia operacional em Volta Redonda", state: "partial", reasonCode: "COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA", humanDescription: "O contrato atual não possui uma estação operacional em Volta Redonda com leitura atual verificável para publicação." },
  { domain: "Água para consumo humano", state: "partial", reasonCode: "PARTIAL_D4", humanDescription: "O contrato atual do COMUN ainda não possui uma fonte pública suficientemente validada para mostrar qualidade da água distribuída para consumo." },
  { domain: "Histórico sistemático de falta d'água", state: "partial", reasonCode: "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY", humanDescription: "O contrato atual possui apenas avisos oficiais isolados, não uma série pública comparável de interrupções de abastecimento." },
  { domain: "Desempenho operacional da iluminação pública", state: "partial", reasonCode: "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY", humanDescription: "O contrato atual ainda não possui uma fonte pública suficientemente validada para mostrar desempenho operacional da iluminação." },
  { domain: "Equipamentos públicos de Educação", state: "partial", reasonCode: "PARTIAL_D3B", humanDescription: "As fontes de Educação ainda estão em validação e não entram nesta leitura territorial." },
  { domain: "Tempo real do transporte", state: "partial", reasonCode: "COMUN_48_2_C3_DEFERRED_NO_PUBLIC_REALTIME_CONTRACT", humanDescription: "O contrato atual mostra a rede programada e estudos oficiais, não a operação em tempo real." },
  { domain: "DEC/FEC municipal histórico comparável", state: "partial", reasonCode: "PARTIAL_E1_POWER", humanDescription: "Os dados capturados não possuem uma relação município-conjunto válida por período para produzir agregado municipal comparável de DEC/FEC." },
] as const;

const COMPARABILITY: readonly CityPanoramaPublicDto["comparability"][number][] = [
  { state: "context_only", statement: "As camadas podem ser lidas lado a lado, mas não formam uma métrica única da cidade." },
  { state: "not_comparable_geography", statement: "Um setor censitário não é uma linha de ônibus, um ponto público ou um conjunto elétrico." },
  { state: "not_comparable_period", statement: "Cada camada tem seu próprio período de referência; uma medição do rio não é dado em tempo real." },
  { state: "not_comparable_methodology", statement: "Observações comunitárias revisadas e dados oficiais têm metodologias e coberturas diferentes." },
] as const;

function unavailableLayer(
  id: PanoramaLayer["id"],
  label: string,
  sourceKind: PanoramaSourceKind,
  publicPath: string,
  limitation: string,
): PanoramaLayer {
  return {
    id,
    label,
    sourceKind,
    publicPath,
    availability: "temporarily_unavailable",
    referencePeriod: "Não disponível nesta configuração",
    geographicGranularity: "Não disponível",
    temporalGranularity: "Não disponível",
    coverageStatement: "Camada temporariamente indisponível.",
    facts: [],
    limitations: [limitation],
    sourceRefs: [],
  };
}

function territoryLayer(enabled: boolean): PanoramaLayer {
  if (!enabled) return unavailableLayer("territory", "Território e serviços públicos", "official_public_data", "/comun/observatorios/territorio", "A superfície territorial pública não está ativa.");
  const dto = getTerritorialContextPublicDto();
  return {
    id: "territory",
    label: "Território e serviços públicos",
    sourceKind: dto.sourceKind,
    publicPath: "/comun/observatorios/territorio",
    availability: "available",
    referencePeriod: `Censo ${dto.snapshots.territory.censusYear}; snapshots de Saúde e Assistência com verificação própria`,
    geographicGranularity: "Setores censitários e registros oficiais de equipamentos",
    temporalGranularity: "Censo 2022 e snapshots versionados",
    coverageStatement: "Setores censitários não são bairros. A presença de equipamento não mede cobertura ou capacidade de serviço.",
    facts: [
      { label: "Setores censitários", value: String(dto.summary.sectorCount), description: "Recorte oficial do Censo 2022." },
      { label: "Pessoas recenseadas", value: new Intl.NumberFormat("pt-BR").format(dto.summary.populationTotal), description: "Censo 2022; não é população atual." },
      { label: "Domicílios", value: new Intl.NumberFormat("pt-BR").format(dto.summary.householdsTotal), description: "Censo 2022." },
      { label: "Equipamentos públicos de Saúde", value: String(dto.summary.healthEquipmentCount), description: `${dto.summary.healthMatchedToSectorCount} têm vínculo censitário seguro; ${dto.summary.healthBoundaryAmbiguousCount + dto.summary.healthOutsideOrGeometryGapCount} não têm vínculo seguro.` },
      { label: "Assistência Social", value: String(dto.summary.socialAssistanceEquipmentCount), description: "Unidades confirmadas somente por endereço público, sem marcador ou vínculo setorial." },
    ],
    limitations: dto.limitations,
    sourceRefs: dto.sources.map((source) => source.id),
  };
}

async function sidewalksLayer(input: CityPanoramaLayerInputs): Promise<PanoramaLayer> {
  if (!input.sidewalkAnalyticsEnabled) return unavailableLayer("sidewalks", "Calçadas", "reviewed_community_projection", "/comun/observatorios/calcadas", "A leitura dedicada de Calçadas não está ativa.");
  const projection = input.sidewalkProjection ?? await getSidewalkReviewedProjectionForObservatory();
  if (!projection.available) return unavailableLayer("sidewalks", "Calçadas", "reviewed_community_projection", "/comun/observatorios/calcadas", "A projeção pública revisada está temporariamente indisponível.");
  const count = projection.observations.length;
  const pointLanguage = projection.coverageState === "partial_due_to_safety_cap" ? `Mais de ${count}` : String(count);
  return {
    id: "sidewalks",
    label: "Calçadas",
    sourceKind: "reviewed_community_projection",
    publicPath: "/comun/observatorios/calcadas",
    availability: "available",
    referencePeriod: projection.source.updatedAt ? `Atualização da projeção: ${projection.source.updatedAt.slice(0, 10)}` : "Atualização por ponto revisado",
    geographicGranularity: "Pontos públicos aproximados",
    temporalGranularity: "Observações revisadas, sem série histórica",
    coverageStatement: "Observações revisadas e publicadas no COMUN. Não representam todas as calçadas da cidade.",
    facts: [{ label: "Pontos revisados", value: pointLanguage, description: projection.coverageState === "partial_due_to_safety_cap" ? "A leitura atingiu o limite defensivo da projeção pública." : "Pontos da projeção pública revisada." }],
    limitations: ["Zero observações não significa zero problemas de calçada na cidade.", "Não há ranking territorial nem inferência sobre todos os logradouros."],
    sourceRefs: [projection.source.id],
  };
}

function transportLayer(input: CityPanoramaLayerInputs): PanoramaLayer {
  if (!input.transportProgrammedEnabled) return unavailableLayer("transport", "Transporte", "official_public_data", "/comun/observatorios/transporte", "A rede programada pública não está ativa.");
  const programmed = getTransportProgrammedNetworkPublicDto();
  const metrics = input.transportSystemMetricsEnabled ? getTransportSystemMetricsPublicResponse() : null;
  const facts: CityPanoramaFact[] = [
    { label: "Linhas no snapshot", value: String(programmed.snapshot.lineCount), description: "Rede programada oficial; não mede a operação realizada." },
  ];
  if (metrics) {
    const monthlyTransported = metrics.metrics.passengers.items.find((metric) => metric.metricId === "average_monthly_transported_passengers");
    if (monthlyTransported) facts.push({ label: monthlyTransported.label, value: new Intl.NumberFormat("pt-BR").format(monthlyTransported.value), description: monthlyTransported.sourceReportedPeriod });
  }
  return {
    id: "transport",
    label: "Transporte",
    sourceKind: "official_public_data",
    publicPath: "/comun/observatorios/transporte",
    availability: "available",
    referencePeriod: metrics ? `Rede verificada em ${programmed.snapshot.verifiedAt.slice(0, 10)}; estudo tarifário com período informado pela fonte` : `Rede verificada em ${programmed.snapshot.verifiedAt.slice(0, 10)}`,
    geographicGranularity: "Rede municipal programada",
    temporalGranularity: "Programação publicada e estudo periódico",
    coverageStatement: "Mostra o que está programado e parâmetros oficiais do estudo quando disponíveis; não é tempo real.",
    facts,
    limitations: ["Não há inferência de atraso, pontualidade, lotação ou tempo real.", "PMM não é exibido como indicador numérico porque sua semântica permanece pendente."],
    sourceRefs: [programmed.source.catalogSourceId, ...(metrics?.provenance.map((source) => source!.sourceId) ?? [])],
  };
}

function surfaceWaterLayer(enabled: boolean): PanoramaLayer {
  if (!enabled) return unavailableLayer("surface_water", "Qualidade dos rios", "official_public_data", "/comun/observatorios/ambiente/qualidade-dos-rios", "A superfície de qualidade dos rios não está ativa.");
  const dto = getSurfaceWaterObservatoryPublicDto();
  const measurementCount = dto.samples.reduce((total, sample) => total + sample.measurements.length, 0);
  return {
    id: "surface_water",
    label: "Qualidade dos rios",
    sourceKind: dto.sourceKind,
    publicPath: "/comun/observatorios/ambiente/qualidade-dos-rios",
    availability: "available",
    referencePeriod: `Referência ${dto.snapshot.referenceYear}`,
    geographicGranularity: "Rio Paraíba do Sul; dois pontos oficiais em Volta Redonda",
    temporalGranularity: "Coletas de 2025; não é tempo real",
    coverageStatement: "Monitoramento oficial de água superficial; não é água distribuída para consumo humano.",
    facts: [
      { label: "Pontos oficiais", value: dto.stations.map((station) => station.code).join(" e "), description: "Pontos publicados pela fonte, sem coordenada inventada." },
      { label: "Coletas", value: String(dto.samples.length), description: "Coletas oficiais de referência em 2025." },
      { label: "Medições", value: String(measurementCount), description: "Medições estruturadas, separadas do IQA publicado." },
    ],
    limitations: dto.limitations,
    sourceRefs: dto.sources.map((source) => source.id),
  };
}

function powerLayer(enabled: boolean): PanoramaLayer {
  if (!enabled) return unavailableLayer("power", "Energia elétrica", "official_public_data", "/comun/observatorios/servicos-essenciais/energia", "A superfície de interrupções oficiais de energia não está ativa.");
  const dto = getPowerInterruptionSummaryDto();
  return {
    id: "power",
    label: "Energia elétrica",
    sourceKind: dto.sourceKind,
    publicPath: "/comun/observatorios/servicos-essenciais/energia",
    availability: "available",
    referencePeriod: dto.reference.reportedCompetencePeriods.join(", "),
    geographicGranularity: "Registros técnicos da fonte; conjuntos elétricos não são bairros",
    temporalGranularity: "Competências publicadas, não ano-calendário completo",
    coverageStatement: "Registros publicados de interrupção não são apagões únicos, pessoas afetadas nem consumidores únicos.",
    facts: [
      { label: "Registros no snapshot", value: new Intl.NumberFormat("pt-BR").format(dto.recordCount), description: "Registros oficiais publicados para as competências presentes." },
      { label: "Competência ausente", value: "2026-02", description: "A competência não está presente no snapshot; isso não significa zero interrupções." },
    ],
    limitations: dto.limitations,
    sourceRefs: [dto.source.snapshotId],
  };
}

function evidenceForLayer(layer: PanoramaLayer): PublicEvidenceReferenceV1 {
  return {
    refId: `panorama:${layer.id}:coverage`,
    observatoryId: layer.id,
    layerId: layer.id,
    claimKind: "coverage_statement",
    title: layer.label,
    publicPath: layer.publicPath,
    sourceKind: layer.sourceKind,
    referencePeriod: layer.referencePeriod,
    sourceRefs: layer.sourceRefs,
    limitations: layer.limitations,
  };
}

export async function getCityPanoramaPublicDto(
  input: CityPanoramaLayerInputs,
): Promise<CityPanoramaPublicDto> {
  const layers = await Promise.all([
    Promise.resolve(territoryLayer(input.territorialContextEnabled)),
    sidewalksLayer(input),
    Promise.resolve(transportLayer(input)),
    Promise.resolve(surfaceWaterLayer(input.surfaceWaterEnabled)),
    Promise.resolve(powerLayer(input.essentialPowerInterruptionEnabled)),
  ]);
  const evidenceReferences = [
    ...layers.map(evidenceForLayer),
    ...KNOWN_GAPS.map((gap): PublicEvidenceReferenceV1 => ({
      refId: `panorama:gap:${gap.reasonCode}`,
      observatoryId: "panorama",
      layerId: "gap",
      claimKind: "data_gap",
      title: gap.domain,
      publicPath: "/comun/observatorios/panorama",
      sourceKind: "official_public_data",
      referencePeriod: "Contrato atual do COMUN",
      sourceRefs: [gap.reasonCode],
      limitations: [gap.humanDescription],
    })),
  ];
  return {
    panoramaId: COMUN_CITY_PANORAMA_ID,
    methodologyVersion: COMUN_CITY_PANORAMA_METHODOLOGY_VERSION,
    municipality: { ibgeCode: "3306305", name: "Volta Redonda" },
    layers,
    knownGaps: KNOWN_GAPS,
    comparability: COMPARABILITY,
    evidenceReferences,
  };
}

export function cityPanoramaPayloadDiagnostics(dto: CityPanoramaPublicDto) {
  const serialized = JSON.stringify(dto);
  return {
    serializedBytes: Buffer.byteLength(serialized),
    compressedBytesEstimate: gzipSync(serialized).byteLength,
  };
}
