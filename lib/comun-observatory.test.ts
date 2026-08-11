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

  it("preserves the 48.2-A miniapp route while analytics is disabled", () => {
    expect(getPublicObservatoryRegistry(true, false)[0].publicRoute).toBe(
      "/comun/calcadas",
    );
  });

  it("routes the sidewalk hub card to the dedicated observatory only when analytics is enabled", () => {
    expect(getPublicObservatoryRegistry(true, true)[0].publicRoute).toBe(
      "/comun/observatorios/calcadas",
    );
  });

  it("only exposes programmed transport through its isolated C1 flag", () => {
    expect(getPublicObservatoryRegistry(true, true, false)[1]).toMatchObject({
      id: "transport",
      status: "preparing",
      publicRoute: null,
    });
    expect(getPublicObservatoryRegistry(true, true, true)[1]).toMatchObject({
      id: "transport",
      status: "available",
      publicRoute: "/comun/observatorios/transporte",
    });
  });

  it("labels old sources without hiding them", () => {
    expect(
      freshnessForUpdatedAt(
        "2025-01-01T00:00:00.000Z",
        Date.UTC(2026, 7, 10),
      ),
    ).toBe("stale");
  });

  it("does not register sensitive Relata domains as public observatory sources", () => {
    const registry = JSON.stringify(getPublicObservatoryRegistry(true, true));
    [
      "public_health",
      "public_education",
      "child_protection",
      "private_report_aggregate",
    ].forEach((forbidden) => expect(registry).not.toContain(forbidden));
  });
});
