import { describe, expect, it } from "vitest";
import { classifyDifference, differenceMinutes, sanitizePreview } from "./comun-bus-domain";

describe("COMUN Ônibus contracts", () => {
  it("handles a journey after midnight", () => {
    const observed = new Date(2026, 7, 4, 0, 4);
    expect(differenceMinutes("23:58", observed)).toBe(6);
    expect(classifyDifference(6, 5)).toBe("late");
  });
  it("keeps no-observation separate from a failed trip", () => {
    expect(classifyDifference(null)).toBe("not_calculable");
  });
  it("sanitizes the local complaint preview", () => {
    expect(sanitizePreview({ line: "Linha", description: "private", differenceMinutes: 3, problemKind: "staff_conduct_private" })).toMatchObject({ line: "Linha", differenceMinutes: 3, sentToStmu: false, requestProtocol: true });
  });
});
