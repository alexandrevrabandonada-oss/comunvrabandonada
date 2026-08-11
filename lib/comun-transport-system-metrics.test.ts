import { describe, expect, it } from "vitest";
import {
  COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT,
  COMUN_TRANSPORT_SYSTEM_METRICS_SOURCE_MANIFEST,
  getTransportSystemMetricsPublicResponse,
  validateTransportSystemMetrics,
} from "./comun-transport-system-metrics";

describe("transport system metrics C2", () => {
  it("validates the public official-only snapshot and provenance", () => {
    expect(validateTransportSystemMetrics()).toEqual({ ok: true, errors: [] });
    for (const source of COMUN_TRANSPORT_SYSTEM_METRICS_SOURCE_MANIFEST.sources) {
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(new URL(source.officialUrl).protocol).toBe("https:");
    }
  });

  it("keeps official passenger totals and the equivalent-passenger distinction", () => {
    const items = COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT.metrics.passengers.items;
    expect(items[0].value + items[1].value + items[2].value).toBe(23715007);
    expect(items.find((metric) => metric.metricId === "equivalent_passengers")?.value).toBe(14758419);
    expect(items.find((metric) => metric.metricId === "average_monthly_transported")?.value).toBe(1976251);
    expect(COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT.metrics.passengers.derivedComposition).toEqual(
      expect.arrayContaining([expect.objectContaining({ derived: true, denominatorMetricId: "total_transported_passengers" })]),
    );
  });

  it("keeps kilometers, IPK, fleet and costs as reported study parameters", () => {
    const { kilometers, fleet, costs } = COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT.metrics;
    expect(kilometers.items.find((metric) => metric.metricId === "productive_kilometers_monthly")?.value).toBe(806616.01);
    expect(kilometers.items.find((metric) => metric.metricId === "ipk")?.value).toBe(1.4521);
    expect(fleet.operating.value + fleet.reserve.value).toBe(fleet.total.value);
    expect(fleet.byAgeRange.find((range) => range.range === "more_than_12")).toMatchObject({ heavyVehicles: 11 });
    expect(costs.variableMonthly.value + costs.fixedMonthly.value).toBeCloseTo(costs.totalMonthly.value, 2);
  });

  it("keeps technical and public fares separate and defers ambiguous PMM", () => {
    const { technicalFare, publicFare } = COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT.metrics;
    expect(technicalFare).toMatchObject({ value: 5.9354, label: "Tarifa técnica calculada no estudo" });
    expect(publicFare).toMatchObject({ value: 5.9, effectiveFrom: "2026-02-01", decreeNumber: "19.858/2026" });
    expect(COMUN_TRANSPORT_SYSTEM_METRICS_SNAPSHOT.limitations).toContain(
      "COMUN_48_2_C2_PMM_DEFERRED_SOURCE_FORMAT_AMBIGUITY",
    );
  });

  it("never serializes private or operational transport data", () => {
    const serialized = JSON.stringify(getTransportSystemMetricsPublicResponse()).toLowerCase();
    ["private.comun_relata_reports", "comun_bus_relata_intakes", "wallet", "forwarding", "waiting_session"].forEach(
      (forbidden) => expect(serialized).not.toContain(forbidden),
    );
  });
});
