import { describe, expect, it } from "vitest";
import {
  canExposeInObservatory,
  freshnessForUpdatedAt,
  getPublicObservatoryRegistry,
} from "./comun-observatory";

describe("observatory public firewall", () => {
  it("only admits public source kinds with explicit provenance", () => {
    expect(
      canExposeInObservatory({
        sourceKind: "reviewed_community_projection",
        publicSafe: true,
        automaticPublicationAllowed: false,
        sourceReference: "P4 reviewed-public-projection",
        sourceUrl: "/comun/calcadas",
      }),
    ).toBe(true);
    expect(
      canExposeInObservatory({
        sourceKind: "private_report_aggregate" as never,
        publicSafe: true,
        automaticPublicationAllowed: false,
        sourceReference: "private source",
        sourceUrl: "/api/private",
      }),
    ).toBe(false);
  });

  it("keeps the sidewalk surface in preparation until its adapter is enabled", () => {
    expect(getPublicObservatoryRegistry(false)[0]).toMatchObject({
      id: "sidewalks",
      status: "preparing",
      publicRoute: null,
    });
  });

  it("labels old sources without hiding them", () => {
    expect(freshnessForUpdatedAt("2025-01-01T00:00:00.000Z", Date.UTC(2026, 7, 10))).toBe("stale");
  });

  it("does not register sensitive Relata domains as public observatory sources", () => {
    const registry = JSON.stringify(getPublicObservatoryRegistry(true));
    ["public_health", "public_education", "child_protection", "private_report_aggregate"].forEach(
      (forbidden) => expect(registry).not.toContain(forbidden),
    );
  });
});
