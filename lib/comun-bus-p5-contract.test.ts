import { describe, expect, it } from "vitest";
import { buildCanonicalBusRelataText, COMUN_BUS_ISSUE_TYPES, isComunBusIssueType } from "./comun-bus-p5-contract";

describe("COMUN P5 bus contract", () => {
  it("accepts only the eight canonical issue types", () => {
    expect(COMUN_BUS_ISSUE_TYPES).toHaveLength(8);
    expect(COMUN_BUS_ISSUE_TYPES.every(isComunBusIssueType)).toBe(true);
    expect(isComunBusIssueType("public_transport")).toBe(false);
  });

  it("builds one bounded private Relata description", () => {
    const text = buildCanonicalBusRelataText({ issueType: "overcrowding", lineLabel: "FIX-01", direction: "Centro", description: "Fixture sintética." });
    expect(text).toContain("Lotação");
    expect(text).toContain("FIX-01");
    expect(text.length).toBeLessThanOrEqual(600);
  });
});
