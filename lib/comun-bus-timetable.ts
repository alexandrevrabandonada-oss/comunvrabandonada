import { createHash } from "node:crypto";

export const BUS_DAY_TYPES = ["weekday", "saturday", "sunday", "holiday", "special"] as const;
export type BusDayType = (typeof BUS_DAY_TYPES)[number];

export type TimetableImportEntry = {
  lineCode: string;
  direction: string;
  stopCode: string;
  dayType: BusDayType;
  departureTime: string;
  serviceDayOffset?: number;
};

export function validateTimetableImport(entries: unknown[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of entries.entries()) {
    const entry = raw as Partial<TimetableImportEntry>;
    if (!entry || typeof entry.lineCode !== "string" || typeof entry.direction !== "string" || typeof entry.stopCode !== "string") errors.push(`row_${index}_identity`);
    if (!BUS_DAY_TYPES.includes(entry.dayType as BusDayType)) errors.push(`row_${index}_day_type`);
    if (typeof entry.departureTime !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(entry.departureTime)) errors.push(`row_${index}_time`);
    const offset = entry.serviceDayOffset ?? 0;
    if (![-1, 0, 1].includes(offset)) errors.push(`row_${index}_offset`);
    const key = `${entry.lineCode}|${entry.direction}|${entry.stopCode}|${entry.dayType}|${entry.departureTime}|${offset}`;
    if (seen.has(key)) errors.push(`row_${index}_duplicate`);
    seen.add(key);
  }
  return { ok: errors.length === 0, errors };
}

export function normalizedTimetableSha256(entries: TimetableImportEntry[]) {
  const normalized = [...entries].map((entry) => ({ ...entry, serviceDayOffset: entry.serviceDayOffset ?? 0 })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function diffTimetable(previous: TimetableImportEntry[], next: TimetableImportEntry[]) {
  const key = (entry: TimetableImportEntry) => JSON.stringify({ ...entry, serviceDayOffset: entry.serviceDayOffset ?? 0 });
  const oldKeys = new Set(previous.map(key));
  const newKeys = new Set(next.map(key));
  return { added: next.filter((entry) => !oldKeys.has(key(entry))), removed: previous.filter((entry) => !newKeys.has(key(entry))), unchanged: next.filter((entry) => oldKeys.has(key(entry))) };
}
