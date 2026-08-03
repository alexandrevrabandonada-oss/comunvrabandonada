import { describe, expect, it } from "vitest";
import {
  isComunRelataEvidenceCleanupCandidate,
  sanitizeComunRelataEvidenceCleanupCounts,
} from "./comun-relata-evidence-cleanup";

describe("COMUN Relata evidence cleanup", () => {
  const now = new Date("2026-08-03T18:00:00.000Z");

  it("keeps dry-run candidates deterministic without identifiers", () => {
    const records = [
      { state: "quarantine" as const, reviewAfter: "2026-08-02T00:00:00Z" },
      { state: "withdrawn" as const, reviewAfter: "2026-08-01T00:00:00Z" },
      { state: "sealed_private" as const, reviewAfter: "2026-08-01T00:00:00Z" },
      { state: "rejected" as const, reviewAfter: "2026-08-05T00:00:00Z" },
    ];
    expect(isComunRelataEvidenceCleanupCandidate(records[0], now)).toBe(true);
    expect(isComunRelataEvidenceCleanupCandidate(records[2], now)).toBe(false);
    expect(sanitizeComunRelataEvidenceCleanupCounts(records, now)).toEqual([
      { state: "quarantine", count: 1 },
      { state: "withdrawn", count: 1 },
    ]);
  });
});
