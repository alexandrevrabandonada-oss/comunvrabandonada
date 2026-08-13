import { describe, expect, it } from "vitest";
import {
  getPowerInterruptionFilterValues,
  getPowerInterruptionRecordsPage,
  getPowerInterruptionSummaryDto,
  parsePowerInterruptionQuery,
  PowerInterruptionQueryError,
  powerInterruptionPublicPayloadBytes,
} from "./comun-essential-power-interruption-observatory";

describe("essential power interruption observatory", () => {
  it("uses the official snapshot without turning partial DEC/FEC data into a municipal indicator", () => {
    const dto = getPowerInterruptionSummaryDto();
    expect(dto.sourceKind).toBe("official_public_data");
    expect(dto.privateReportAggregate).toBe(false);
    expect(dto.recordCount).toBe(5676);
    expect(dto.reference).toMatchObject({ resourceYear: 2026, latestPublishedCompetence: "2026-06", completeCalendarYear: false });
    expect(dto.reference.reportedCompetencePeriods).toEqual(["2026-01", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(JSON.stringify(dto)).not.toMatch(/wallet|relata|protocol|receipt/i);
    expect(dto.limitations.join(" ")).toContain("DEC e FEC permanecem separados");
  });

  it("keeps the source values public-safe without account, event or individual consumer-unit fields", () => {
    const page = getPowerInterruptionRecordsPage({ limit: "25" });
    expect(page.observations).toHaveLength(25);
    const serialized = JSON.stringify(page);
    for (const forbidden of ["CodInterrupcao", "CodEvento", "CodOcorrencia", "CodConjUnidadeConsumidora", "interruptionKey", "protocol", "receipt", "wallet", "account", "attachment", "latitude", "longitude"]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(page.observations[0]).toEqual(expect.objectContaining({ competence: expect.any(String), electricalSet: expect.any(String), durationSeconds: expect.any(Number) }));
  });

  it("paginates deterministically without duplicate records", () => {
    const first = getPowerInterruptionRecordsPage({ limit: "25" });
    const second = getPowerInterruptionRecordsPage({ limit: "25", cursor: first.page.nextCursor! });
    expect(first.page.nextCursor).toBeTruthy();
    expect(new Set([...first.observations, ...second.observations].map((record) => record.id)).size).toBe(50);
    expect(first.observations[0]!.startedAt >= first.observations[1]!.startedAt).toBe(true);
  });

  it("allows only exact source facets and bounded page sizes", () => {
    const facets = getPowerInterruptionFilterValues();
    expect(facets.months).toContain("2026-06");
    expect(() => parsePowerInterruptionQuery({ month: "2026-02" })).toThrow(PowerInterruptionQueryError);
    expect(() => parsePowerInterruptionQuery({ set: "arbitrary" })).toThrow(PowerInterruptionQueryError);
    expect(() => parsePowerInterruptionQuery({ limit: "101" })).toThrow(PowerInterruptionQueryError);
    expect(() => getPowerInterruptionRecordsPage({ cursor: "v1.99999" })).toThrow(PowerInterruptionQueryError);
  });

  it("keeps summary and initial record payloads bounded", () => {
    const bytes = powerInterruptionPublicPayloadBytes();
    expect(bytes.summary).toBeLessThan(20_000);
    expect(bytes.defaultRecordsPage).toBeLessThan(40_000);
  });
});
