import { describe, expect, it } from "vitest";
import { diffTimetable, normalizedTimetableSha256, validateTimetableImport } from "./comun-bus-timetable";

const base = { lineCode: "FIX-01", direction: "Centro", stopCode: "FIX-STOP-01", dayType: "weekday" as const, departureTime: "23:58", serviceDayOffset: 0 };

describe("versionamento de horários do Ônibus", () => {
  it("accepts explicit day types and after-midnight offsets", () => {
    expect(validateTimetableImport([{ ...base, serviceDayOffset: 1 }]).ok).toBe(true);
  });
  it("rejects missing source-shaped duplicates before persistence", () => {
    expect(validateTimetableImport([base, base]).errors).toContain("row_1_duplicate");
  });
  it("produces stable hashes and history-preserving diffs", () => {
    const next = { ...base, departureTime: "23:59" };
    expect(normalizedTimetableSha256([base])).toBe(normalizedTimetableSha256([base]));
    expect(diffTimetable([base], [next]).added).toHaveLength(1);
    expect(diffTimetable([base], [next]).removed).toHaveLength(1);
  });
});
