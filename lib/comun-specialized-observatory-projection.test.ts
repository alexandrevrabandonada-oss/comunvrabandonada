import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  surfaceWaterProjection,
  powerInterruptionProjection,
  specializedObservatoryMetadata,
} from "./comun-specialized-observatory-projection";
import { getSurfaceWaterObservatoryPublicDto } from "./comun-observatory-surface-water";
import { getPowerInterruptionSummaryDto } from "./comun-essential-power-interruption-observatory";
import {
  readPublicSurfaceWater,
  readPublicPowerInterruptions,
} from "./comun-specialized-observatory-public";

describe("specialized public evidence projection", () => {
  it("uses source dates, territory and limits without copying extra/private fixture fields", () => {
    const dto = getSurfaceWaterObservatoryPublicDto();
    const result = surfaceWaterProjection({
      ...dto,
      email: "synthetic@example.invalid",
      token: "SYNTHETIC_PRIVATE",
      reportId: "PRIVATE_REPORT",
    } as typeof dto);
    expect(Object.keys(result).sort()).toEqual(
      [
        "title",
        "summary",
        "territory",
        "period",
        "retrievedAt",
        "dateLabel",
        "sources",
        "limitations",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /SYNTHETIC_PRIVATE|PRIVATE_REPORT|email|example.invalid/,
    );
    expect(result.summary).toContain(dto.snapshot.verifiedAt);
    expect(result.summary).toContain("INEA");
    expect(result.summary).toContain(dto.period.start);
    expect(result.summary).toContain("não são tempo real");
    expect(result.limitations).toEqual(dto.limitations);
  });
  it("keeps energy gaps and source retrieval distinct from a new publication date", () => {
    const dto = getPowerInterruptionSummaryDto();
    const result = powerInterruptionProjection(dto);
    expect(result.summary).toContain(dto.source.retrievedAt!);
    expect(result.period).toContain(dto.reference.latestPublishedCompetence);
    expect(result.summary).toContain("nem contagem de pessoas");
    expect(result.dateLabel).toBe("Consulta à fonte");
    expect(result.limitations).toEqual(dto.limitations);
  });
  it("page evidence, OG, description and share marker derive from one projection with noindex", () => {
    const projection = surfaceWaterProjection(
      getSurfaceWaterObservatoryPublicDto(),
    );
    const metadata = specializedObservatoryMetadata(
      "/comun/observatorios/ambiente/qualidade-dos-rios",
      projection,
    );
    expect(metadata.title).toBe(projection.title);
    expect(metadata.description).toBe(projection.summary);
    expect(metadata.openGraph).toMatchObject({
      title: projection.title,
      description: projection.summary,
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.other).toEqual({ "comun:share": "public" });
  });
  it("unavailable content has no advertised snapshot or canonical object", () => {
    const metadata = specializedObservatoryMetadata(
      "/comun/observatorios/ambiente/qualidade-dos-rios",
      null,
    );
    expect(metadata.other).toEqual({ "comun:share": "blocked" });
    expect(metadata.description).toBe("");
    expect(metadata.alternates).toBeUndefined();
  });
  it("does not bypass either feature boundary when resolving page and metadata", () => {
    vi.stubEnv("COMUN_OBSERVATORIES_FOUNDATION_ENABLED", "disabled");
    vi.stubEnv(
      "COMUN_OBSERVATORY_ENVIRONMENT_SURFACE_WATER_ENABLED",
      "enabled",
    );
    vi.stubEnv(
      "COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED",
      "enabled",
    );
    try {
      expect(readPublicSurfaceWater()).toBeNull();
      expect(readPublicPowerInterruptions()).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rejects a private or non-official source instead of advertising it", () => {
    const dto = getSurfaceWaterObservatoryPublicDto();
    expect(() =>
      surfaceWaterProjection({
        ...dto,
        privateReportAggregate: true,
      } as unknown as typeof dto),
    ).toThrow("PUBLIC_PROJECTION_REQUIRED");
    const energy = getPowerInterruptionSummaryDto();
    expect(() =>
      powerInterruptionProjection({
        ...energy,
        sourceKind: "private_report",
      } as unknown as typeof energy),
    ).toThrow("PUBLIC_PROJECTION_REQUIRED");
  });
});

it("a missing source retrieval date is explicit, never fabricated", () => {
  const dto = getPowerInterruptionSummaryDto();
  const projection = powerInterruptionProjection({
    ...dto,
    source: { ...dto.source, retrievedAt: null },
  });
  expect(projection.retrievedAt).toBeNull();
  expect(projection.summary).toContain("data não informada");
  expect(projection.summary).not.toContain("null");
});
