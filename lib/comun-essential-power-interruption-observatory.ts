import {
  COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT,
  COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT,
  COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST,
  type PowerInterruptionAneelRecord,
} from "./comun-power-interruptions-aneel";

export const COMUN_ESSENTIAL_POWER_INTERRUPTION_OBSERVATORY_ID =
  "essential-power-interruptions" as const;
export const COMUN_ESSENTIAL_POWER_INTERRUPTION_METHODOLOGY_VERSION =
  "comun-essential-power-interruptions-v1" as const;
export const POWER_INTERRUPTION_DEFAULT_PAGE_SIZE = 25;
export const POWER_INTERRUPTION_MAX_PAGE_SIZE = 100;

type NullableSourceValue = string | null;

export type PowerInterruptionCause = {
  origin: NullableSourceValue;
  type: NullableSourceValue;
  cause: NullableSourceValue;
  detail: NullableSourceValue;
};

export type PowerInterruptionPublicRecord = {
  id: string;
  competence: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  electricalSet: string;
  feeder: string | null;
  substation: string | null;
  sourceLocationLabel: string | null;
  cause: PowerInterruptionCause;
  affectedConsumers: number | null;
  activeConsumers: number | null;
  voltageLevel: number | null;
  interruptedElementType: string | null;
  expurgoReason: string | null;
};

export type PowerInterruptionFilterValues = {
  months: readonly string[];
  electricalSets: readonly string[];
  origins: readonly string[];
  types: readonly string[];
  causes: readonly string[];
};

export type PowerInterruptionRecordsPage = {
  observations: readonly PowerInterruptionPublicRecord[];
  page: {
    limit: number;
    nextCursor: string | null;
    totalMatchingRecords: number;
  };
  appliedFilters: PowerInterruptionQuery;
  facets: PowerInterruptionFilterValues;
};

export type PowerInterruptionQuery = {
  month: string | null;
  set: string | null;
  origin: string | null;
  type: string | null;
  cause: string | null;
  cursor: string | null;
  limit: number;
};

export type PowerInterruptionSummaryDto = {
  observatoryId: typeof COMUN_ESSENTIAL_POWER_INTERRUPTION_OBSERVATORY_ID;
  methodologyVersion: typeof COMUN_ESSENTIAL_POWER_INTERRUPTION_METHODOLOGY_VERSION;
  sourceKind: "official_public_data";
  privateReportAggregate: false;
  reference: {
    resourceYear: number;
    firstPublishedCompetence: string;
    latestPublishedCompetence: string;
    completeCalendarYear: false;
    reportedCompetencePeriods: readonly string[];
  };
  municipality: { ibgeCode: string; name: string; state: string };
  distributor: { officialName: string; officialAbbreviation: string };
  recordCount: number;
  countsByMonth: readonly { competence: string; recordCount: number }[];
  causeDimensions: readonly {
    dimension: "origin" | "type" | "cause";
    values: readonly { label: string | null; recordCount: number }[];
  }[];
  source: {
    snapshotId: string;
    rawSha256: string;
    retrievedAt: string | null;
    sourceUrl: string;
    schemaState: "stable" | "changed" | "unknown";
  };
  limitations: readonly string[];
};

export class PowerInterruptionQueryError extends Error {
  constructor(readonly code: "invalid_filter" | "invalid_cursor" | "invalid_limit") {
    super(code);
  }
}

type RawQuery = Record<string, string | string[] | undefined>;

function timestamp(value: string) {
  return Date.parse(`${value.replace(" ", "T")}Z`);
}

function sourceText(value: string | null | undefined) {
  return value?.trim() || null;
}

function distinctSourceValues(values: Iterable<string | null>) {
  return [...new Set([...values].filter((value): value is string => value !== null))].sort(
    (left, right) => left.localeCompare(right, "pt-BR"),
  );
}

const sortedRecords = [...COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.records].sort(
  (left, right) => {
    const byDate = timestamp(right.DatInicioInterrupcao) - timestamp(left.DatInicioInterrupcao);
    return byDate || right.interruptionKey.localeCompare(left.interruptionKey);
  },
);

const positionByInterruptionKey = new Map(
  sortedRecords.map((record, index) => [record.interruptionKey, index]),
);

const filterValues: PowerInterruptionFilterValues = Object.freeze({
  months: [...COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.reportedCompetencePeriods],
  electricalSets: distinctSourceValues(
    sortedRecords.map((record) => sourceText(record.DscConjuntoUnidadeConsumidora)),
  ),
  origins: distinctSourceValues(sortedRecords.map((record) => sourceText(record.DscFatoGeradorOrigem))),
  types: distinctSourceValues(sortedRecords.map((record) => sourceText(record.DscFatoGeradorTipo))),
  causes: distinctSourceValues(sortedRecords.map((record) => sourceText(record.DscFatoGeradorCausa))),
});

function normalizeSingle(value: string | string[] | undefined) {
  if (value === undefined) return null;
  if (Array.isArray(value) || value.length > 160) throw new PowerInterruptionQueryError("invalid_filter");
  const normalized = value.trim();
  if (!normalized) throw new PowerInterruptionQueryError("invalid_filter");
  return normalized;
}

function assertAllowed(value: string | null, candidates: readonly string[]) {
  if (value !== null && !candidates.includes(value)) {
    throw new PowerInterruptionQueryError("invalid_filter");
  }
  return value;
}

function parseLimit(value: string | string[] | undefined) {
  if (value === undefined) return POWER_INTERRUPTION_DEFAULT_PAGE_SIZE;
  if (Array.isArray(value) || !/^\d{1,3}$/.test(value)) {
    throw new PowerInterruptionQueryError("invalid_limit");
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > POWER_INTERRUPTION_MAX_PAGE_SIZE) {
    throw new PowerInterruptionQueryError("invalid_limit");
  }
  return parsed;
}

function parseCursor(value: string | string[] | undefined) {
  if (value === undefined) return null;
  if (Array.isArray(value) || !/^v1\.(0|[1-9]\d{0,4})$/.test(value)) {
    throw new PowerInterruptionQueryError("invalid_cursor");
  }
  const start = Number(value.slice(3));
  if (start >= sortedRecords.length) throw new PowerInterruptionQueryError("invalid_cursor");
  return value;
}

export function parsePowerInterruptionQuery(query: RawQuery = {}): PowerInterruptionQuery {
  const month = assertAllowed(normalizeSingle(query.month), filterValues.months);
  const electricalSet = assertAllowed(normalizeSingle(query.set), filterValues.electricalSets);
  const origin = assertAllowed(normalizeSingle(query.origin), filterValues.origins);
  const type = assertAllowed(normalizeSingle(query.type), filterValues.types);
  const cause = assertAllowed(normalizeSingle(query.cause), filterValues.causes);
  return {
    month,
    set: electricalSet,
    origin,
    type,
    cause,
    cursor: parseCursor(query.cursor),
    limit: parseLimit(query.limit),
  };
}

function matches(record: PowerInterruptionAneelRecord, query: PowerInterruptionQuery) {
  const competence = `${record.AnoCompetencia}-${String(record.MesCompetencia).padStart(2, "0")}`;
  return (
    (!query.month || competence === query.month) &&
    (!query.set || sourceText(record.DscConjuntoUnidadeConsumidora) === query.set) &&
    (!query.origin || sourceText(record.DscFatoGeradorOrigem) === query.origin) &&
    (!query.type || sourceText(record.DscFatoGeradorTipo) === query.type) &&
    (!query.cause || sourceText(record.DscFatoGeradorCausa) === query.cause)
  );
}

function toPublicRecord(record: PowerInterruptionAneelRecord): PowerInterruptionPublicRecord {
  const position = positionByInterruptionKey.get(record.interruptionKey);
  if (position === undefined) throw new Error("missing_public_record_position");
  return {
    id: `${COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.snapshotId}:record:${position + 1}`,
    competence: `${record.AnoCompetencia}-${String(record.MesCompetencia).padStart(2, "0")}`,
    startedAt: record.DatInicioInterrupcao,
    endedAt: record.DatFimInterrupcao,
    durationSeconds: record.durationSeconds,
    electricalSet: record.DscConjuntoUnidadeConsumidora,
    feeder: record.CodAlimentador,
    substation: record.CodSubestacao === null ? null : String(record.CodSubestacao),
    sourceLocationLabel: sourceText(record.DscLocalizacaoInterrupcao),
    cause: {
      origin: sourceText(record.DscFatoGeradorOrigem),
      type: sourceText(record.DscFatoGeradorTipo),
      cause: sourceText(record.DscFatoGeradorCausa),
      detail: sourceText(record.DscFatoGeradorDetalhe),
    },
    affectedConsumers: record.QtdConsumidoresAfetados,
    activeConsumers: record.QtdConsumidoresAtivos,
    voltageLevel: record.NumNivelTensao,
    interruptedElementType: sourceText(record.DscTipoElementoInterrompido),
    expurgoReason: sourceText(record.DscMotivoExpurgo),
  };
}

function countBy<T extends string | null>(
  values: Iterable<T>,
): readonly { label: T; recordCount: number }[] {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => (left ?? "").localeCompare(right ?? "", "pt-BR"))
    .map(([label, recordCount]) => ({ label, recordCount }));
}

const materializedSource = COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST.sources.find(
  (source) => source.sourceId === "aneel-power-interruptions-2026-parquet",
);
if (!materializedSource) throw new Error("missing_aneel_materialized_source");

const countsByMonth = COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.reportedCompetencePeriods.map(
  (competence) => ({
    competence,
    recordCount: sortedRecords.filter(
      (record) => `${record.AnoCompetencia}-${String(record.MesCompetencia).padStart(2, "0")}` === competence,
    ).length,
  }),
);

const summary: PowerInterruptionSummaryDto = Object.freeze({
  observatoryId: COMUN_ESSENTIAL_POWER_INTERRUPTION_OBSERVATORY_ID,
  methodologyVersion: COMUN_ESSENTIAL_POWER_INTERRUPTION_METHODOLOGY_VERSION,
  sourceKind: "official_public_data",
  privateReportAggregate: false,
  reference: {
    resourceYear: 2026,
    firstPublishedCompetence: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.reportedCompetencePeriods[0]!,
    latestPublishedCompetence: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.latestPublishedCompetence,
    completeCalendarYear: false as const,
    reportedCompetencePeriods: [...COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.reportedCompetencePeriods],
  },
  municipality: { ...COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.municipality },
  distributor: {
    officialName: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.distributor.officialName,
    officialAbbreviation: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.distributor.officialAbbreviation,
  },
  recordCount: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.recordCount,
  countsByMonth,
  causeDimensions: [
    { dimension: "origin" as const, values: countBy(sortedRecords.map((record) => sourceText(record.DscFatoGeradorOrigem))) },
    { dimension: "type" as const, values: countBy(sortedRecords.map((record) => sourceText(record.DscFatoGeradorTipo))) },
    { dimension: "cause" as const, values: countBy(sortedRecords.map((record) => sourceText(record.DscFatoGeradorCausa))) },
  ],
  source: {
    snapshotId: COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT.activeSnapshotId,
    rawSha256: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.sourceRawSha256,
    retrievedAt: COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST.retrievedAt,
    sourceUrl: materializedSource.officialUrl,
    schemaState: "stable" as const,
  },
  limitations: [
    "A fonte contém competências publicadas de janeiro e março a junho de 2026; não representa um ano-calendário completo.",
    "Registros publicados de interrupção não são uma contagem de apagões, quedas ou pessoas únicas afetadas.",
    "DEC e FEC permanecem separados: esta fonte não permite um agregado municipal comparável.",
    "Conjuntos elétricos são identificadores técnicos da fonte, não bairros ou recortes territoriais.",
    "Os valores de causa são os rótulos publicados pela ANEEL; o COMUN não atribui responsabilidade ou causa material.",
  ],
});

export function getPowerInterruptionSummaryDto() {
  return summary;
}

export function getPowerInterruptionFilterValues() {
  return filterValues;
}

export function getPowerInterruptionRecordsPage(queryInput: RawQuery = {}): PowerInterruptionRecordsPage {
  const query = parsePowerInterruptionQuery(queryInput);
  const matching = sortedRecords.filter((record) => matches(record, query));
  const start = query.cursor === null ? 0 : Number(query.cursor.slice(3));
  if (query.cursor !== null && start >= matching.length) {
    throw new PowerInterruptionQueryError("invalid_cursor");
  }
  const pageRecords = matching.slice(start, start + query.limit);
  const nextCursor = start + pageRecords.length < matching.length ? `v1.${start + pageRecords.length}` : null;
  return {
    observations: pageRecords.map(toPublicRecord),
    page: { limit: query.limit, nextCursor, totalMatchingRecords: matching.length },
    appliedFilters: query,
    facets: filterValues,
  };
}

export function powerInterruptionPublicPayloadBytes() {
  return {
    summary: Buffer.byteLength(JSON.stringify(summary)),
    defaultRecordsPage: Buffer.byteLength(JSON.stringify(getPowerInterruptionRecordsPage())),
  };
}
