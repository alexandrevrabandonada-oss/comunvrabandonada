import type { SurfaceWaterObservatoryPublicDto } from "./comun-observatory-surface-water";
import type { PowerInterruptionSummaryDto } from "./comun-essential-power-interruption-observatory";
import { projectComunPublicSummary } from "./comun-one-product-contract";

export type ObservatoryEvidenceProjection = {
  title: string;
  summary: string;
  territory: string;
  period: string;
  retrievedAt: string | null;
  dateLabel: string;
  sources: { publisher: string; url: string }[];
  limitations: string[];
};

// Only existing public snapshot DTOs enter this adapter. No request filters,
// private records or arbitrary browser fields form the shared description.
export function surfaceWaterProjection(dto: SurfaceWaterObservatoryPublicDto) {
  if (
    dto.sourceKind !== "official_public_data" ||
    dto.privateReportAggregate !== false
  )
    throw new Error("COMUN_OBSERVATORY_PUBLIC_PROJECTION_REQUIRED");
  const period = `${dto.period.start} a ${dto.period.end}`;
  return {
    title: "Qualidade dos Rios",
    summary: `INEA · ${dto.waterBody}, ${dto.municipality} · ${period}. Snapshot verificado em ${dto.snapshot.verifiedAt}. Medições nas datas publicadas; não são tempo real nem determinam potabilidade.`,
    territory: `${dto.waterBody} · ${dto.municipality}`,
    period,
    retrievedAt: dto.snapshot.verifiedAt,
    dateLabel: "Verificação do snapshot",
    sources: dto.sources.map((source) => ({
      publisher: source.publisher,
      url: source.officialUrl,
    })),
    limitations: [...dto.limitations],
  } satisfies ObservatoryEvidenceProjection;
}

export function powerInterruptionProjection(dto: PowerInterruptionSummaryDto) {
  if (
    dto.sourceKind !== "official_public_data" ||
    dto.privateReportAggregate !== false
  )
    throw new Error("COMUN_OBSERVATORY_PUBLIC_PROJECTION_REQUIRED");
  const period = `${dto.reference.firstPublishedCompetence} a ${dto.reference.latestPublishedCompetence}`;
  return {
    title: "Interrupções de energia elétrica",
    summary: `ANEEL · ${dto.municipality.name} · ${period}. Consulta à fonte: ${dto.source.retrievedAt ?? "data não informada"}. Registros publicados em snapshot; não são tempo real, ano completo nem contagem de pessoas ou apagões únicos.`,
    territory: dto.municipality.name,
    period,
    retrievedAt: dto.source.retrievedAt,
    dateLabel: "Consulta à fonte",
    sources: [{ publisher: "ANEEL", url: dto.source.sourceUrl }],
    limitations: [...dto.limitations],
  } satisfies ObservatoryEvidenceProjection;
}

export function specializedObservatoryMetadata(
  path: string,
  projection: ObservatoryEvidenceProjection | null,
) {
  return projectComunPublicSummary(
    projection
      ? {
          title: projection.title,
          summary: projection.summary,
          canonicalPath: path,
          publication: "published",
          privacy: "public",
        }
      : null,
  ).metadata;
}

export function observatorySourcesProjection(
  projection: ObservatoryEvidenceProjection,
) {
  return { ...projection, title: `Fontes e metodologia — ${projection.title}` };
}
