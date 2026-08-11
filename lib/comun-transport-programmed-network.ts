import activeSnapshotJson from "@/data/comun/transport/active-snapshot.json";
import manifestJson from "@/data/comun/transport/source-manifest-v2.json";
import networkJson from "@/data/comun/transport/programmed-network-v2.json";

export const COMUN_TRANSPORT_PROGRAMMED_METHODOLOGY_VERSION =
  "comun-transport-programmed-network-v2" as const;
export const COMUN_TRANSPORT_OFFICIAL_DOMAINS = [
  "www.voltaredonda.rj.gov.br",
] as const;

export type TransportSourceType = "catalog_html" | "timetable_pdf" | "itinerary_pdf";
export type TransportQualityState = "verified_source" | "partial" | "source_conflict";
export type TransportSourceStatus = "active" | "superseded" | "conflicting";
export type TimetableStatus = "available" | "partial" | "source_conflict" | "not_normalized" | "not_published";
export type ServiceDayType = "weekday" | "saturday" | "sunday_holiday";

export type TransportSource = {
  sourceId: string; sourceType: TransportSourceType; officialUrl: string; sha256: string;
  retrievedAt: string; publisher: string; lineCode?: string; orderNumber?: string;
  sourceUpdatedAt?: string; effectiveFrom?: string; parserVersion: string;
  qualityState: TransportQualityState; status: TransportSourceStatus; semanticSha256?: string;
  normalizationVersion?: string;
};
export type Departure = { time: string; serviceDayOffset: 0 | 1; variantCode: string | null; noteCodes: string[] };
export type ServicePattern = { serviceDayType: ServiceDayType; originLabel: string; directionLabel: string | null; departures: Departure[] };
export type ItineraryVariant = { variantId: string; label: string; direction: string; streetSequence: string[]; distanceKm: number | null; sourceId: string };
export type TransportLine = {
  id: string; lineCode: string; routeLabel: string; operator: string; catalogSourceId: string;
  timetableSourceId: string | null; itinerarySourceId: string | null; timetableStatus: TimetableStatus;
  itineraryStatus: TimetableStatus; servicePatterns: ServicePattern[]; itineraryVariants: ItineraryVariant[];
  notes: { code: string; text: string }[];
};
export type TransportSnapshot = {
  snapshotId: string; snapshotDate: string; verifiedAt: string; catalogSourceId: string;
  methodologyVersion: string; lineCount: number; qualityState: TransportQualityState; lines: TransportLine[];
  previousSnapshotId?: string;
  sourceHistory?: { previousCatalogSourceId: string; activeCatalogSourceId: string };
  changeSummary?: Record<string, string | number | boolean>;
};

const manifest = manifestJson as { manifestVersion: string; sources: TransportSource[] };
const rawNetwork = networkJson as Omit<TransportSnapshot, "lines"> & { lines: Array<Partial<TransportLine> & Pick<TransportLine, "lineCode" | "routeLabel" | "operator">> };
const activeSnapshot = activeSnapshotJson as { activeSnapshotId: string; previousSnapshotId: string; snapshotFile: string; manifestFile: string; normalizedCatalogFile: string };

function isOfficialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && COMUN_TRANSPORT_OFFICIAL_DOMAINS.includes(url.hostname as (typeof COMUN_TRANSPORT_OFFICIAL_DOMAINS)[number]);
  } catch { return false; }
}
function hasValidTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }

export const COMUN_TRANSPORT_SOURCE_MANIFEST = manifest;
export const COMUN_TRANSPORT_ACTIVE_SNAPSHOT = activeSnapshot;
export const COMUN_TRANSPORT_SNAPSHOT: TransportSnapshot = {
  ...rawNetwork,
  lines: rawNetwork.lines.map((line) => ({
    id: `municipal:${line.lineCode}`,
    catalogSourceId: rawNetwork.catalogSourceId,
    timetableSourceId: null,
    itinerarySourceId: null,
    timetableStatus: "not_normalized",
    itineraryStatus: "not_normalized",
    servicePatterns: [], itineraryVariants: [], notes: [], ...line,
  })) as TransportLine[],
};

export function validateTransportProgrammedNetwork(snapshot = COMUN_TRANSPORT_SNAPSHOT, sources = manifest.sources) {
  const errors: string[] = [];
  const sourceIds = new Set<string>();
  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) errors.push("duplicate_source_id");
    sourceIds.add(source.sourceId);
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) errors.push(`invalid_hash:${source.sourceId}`);
    if (!isOfficialUrl(source.officialUrl)) errors.push(`non_official_url:${source.sourceId}`);
  }
  if (!sourceIds.has(snapshot.catalogSourceId)) errors.push("missing_catalog_source");
  if (activeSnapshot.activeSnapshotId !== snapshot.snapshotId || activeSnapshot.snapshotFile !== "programmed-network-v2.json" || activeSnapshot.manifestFile !== "source-manifest-v2.json") errors.push("active_snapshot_pointer_mismatch");
  if (snapshot.lineCount !== snapshot.lines.length) errors.push("line_count_mismatch");
  const lineIds = new Set<string>();
  for (const line of snapshot.lines) {
    if (!/^municipal:[0-9]{3}[A-Z]?$/.test(line.id) || !/^[0-9]{3}[A-Z]?$/.test(line.lineCode)) errors.push(`invalid_line:${line.lineCode}`);
    if (lineIds.has(line.id)) errors.push(`duplicate_line:${line.id}`); lineIds.add(line.id);
    if (!sourceIds.has(line.catalogSourceId) || (line.timetableSourceId !== null && !sourceIds.has(line.timetableSourceId)) || (line.itinerarySourceId !== null && !sourceIds.has(line.itinerarySourceId))) errors.push(`missing_source_ref:${line.lineCode}`);
    for (const pattern of line.servicePatterns) {
      let previous = -1;
      for (const departure of pattern.departures) {
        if (!hasValidTime(departure.time) || ![0, 1].includes(departure.serviceDayOffset)) errors.push(`invalid_departure:${line.lineCode}`);
        const minutes = departure.serviceDayOffset * 1440 + Number(departure.time.slice(0, 2)) * 60 + Number(departure.time.slice(3));
        if (minutes <= previous) errors.push(`non_chronological:${line.lineCode}`); previous = minutes;
      }
    }
    for (const itinerary of line.itineraryVariants) if (!sourceIds.has(itinerary.sourceId)) errors.push(`missing_itinerary_source:${line.lineCode}`);
  }
  return { ok: errors.length === 0, errors };
}

export function getTransportSource(sourceId: string | null) { return manifest.sources.find((source) => source.sourceId === sourceId) ?? null; }
export function getTransportLine(lineCode: string) { return COMUN_TRANSPORT_SNAPSHOT.lines.find((line) => line.lineCode === lineCode.toUpperCase()) ?? null; }
export function normalizeTransportSearch(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
export function findTransportLines(search = "", operator = "") {
  const query = normalizeTransportSearch(search); const operatorQuery = normalizeTransportSearch(operator);
  return COMUN_TRANSPORT_SNAPSHOT.lines.filter((line) => (!query || [line.lineCode, line.routeLabel, line.operator].some((value) => normalizeTransportSearch(value).includes(query))) && (!operatorQuery || normalizeTransportSearch(line.operator) === operatorQuery));
}
export function getTransportOperators() { return [...new Set(COMUN_TRANSPORT_SNAPSHOT.lines.map((line) => line.operator))].sort((a, b) => a.localeCompare(b, "pt-BR")); }
export function deriveScheduledGaps(departures: readonly Departure[]) {
  const minutes = departures.map((item) => item.serviceDayOffset * 1440 + Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3)));
  const gaps = minutes.slice(1).map((value, index) => value - minutes[index]).filter((gap) => gap > 0);
  if (!gaps.length) return { first: departures[0]?.time ?? null, last: departures.at(-1)?.time ?? null, count: departures.length, medianGapMinutes: null };
  const sorted = [...gaps].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2);
  return { first: departures[0]?.time ?? null, last: departures.at(-1)?.time ?? null, count: departures.length, medianGapMinutes: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 };
}
