import { describe, expect, it } from "vitest";
import {
  cityPanoramaPayloadDiagnostics,
  getCityPanoramaPublicDto,
} from "./comun-city-panorama";
import { adaptSidewalkReviewedProjection } from "./comun-observatory-sidewalk-adapter";

const allPublicLayers = {
  territorialContextEnabled: true,
  sidewalkAnalyticsEnabled: true,
  transportProgrammedEnabled: true,
  transportSystemMetricsEnabled: true,
  surfaceWaterEnabled: true,
  essentialPowerInterruptionEnabled: true,
  sidewalkProjection: adaptSidewalkReviewedProjection([]),
};

describe("city panorama public DTO", () => {
  it("derives descriptive facts from specialized public DTOs without a city score", async () => {
    const dto = await getCityPanoramaPublicDto(allPublicLayers);
    expect(dto.panoramaId).toBe("volta-redonda-public-panorama-v1");
    expect(dto.municipality).toEqual({ ibgeCode: "3306305", name: "Volta Redonda" });
    expect(dto.layers).toHaveLength(5);
    expect(dto.layers.find((layer) => layer.id === "territory")?.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Setores censitários", value: "739" }),
      expect.objectContaining({ label: "Pessoas recenseadas", value: "261.563" }),
    ]));
    expect(dto.layers.find((layer) => layer.id === "surface_water")?.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Coletas", value: "24" }),
      expect.objectContaining({ label: "Medições", value: "240" }),
    ]));
    expect(dto.layers.find((layer) => layer.id === "power")?.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Registros no snapshot", value: "5.676" }),
      expect.objectContaining({ label: "Competência ausente", value: "2026-02" }),
    ]));
    const topLevelKeys = Object.keys(dto);
    expect(topLevelKeys).not.toEqual(expect.arrayContaining(["score", "ranking", "causalClaim", "privateReportAggregate"]));
  });

  it("keeps unavailable underlying layers explicit without making up stale facts", async () => {
    const dto = await getCityPanoramaPublicDto({ ...allPublicLayers, transportProgrammedEnabled: false, surfaceWaterEnabled: false });
    expect(dto.layers.find((layer) => layer.id === "transport")).toMatchObject({ availability: "temporarily_unavailable", facts: [] });
    expect(dto.layers.find((layer) => layer.id === "surface_water")).toMatchObject({ availability: "temporarily_unavailable", facts: [] });
  });

  it("keeps sidewalks reviewed-only and does not interpret an empty projection as city-wide absence", async () => {
    const dto = await getCityPanoramaPublicDto(allPublicLayers);
    const sidewalks = dto.layers.find((layer) => layer.id === "sidewalks");
    expect(sidewalks?.sourceKind).toBe("reviewed_community_projection");
    expect(sidewalks?.coverageStatement).toContain("Não representam todas as calçadas da cidade");
    expect(sidewalks?.limitations.join(" ")).toContain("Zero observações não significa zero problemas");
  });

  it("preserves period, geography and methodology non-comparability", async () => {
    const dto = await getCityPanoramaPublicDto(allPublicLayers);
    expect(dto.comparability.map((item) => item.state)).toEqual(expect.arrayContaining([
      "context_only",
      "not_comparable_geography",
      "not_comparable_period",
      "not_comparable_methodology",
    ]));
    expect(dto.knownGaps.map((gap) => gap.reasonCode)).toEqual(expect.arrayContaining([
      "PARTIAL_E1_POWER",
      "COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE",
    ]));
    expect(dto.evidenceReferences.every((reference) => ["descriptive_fact", "coverage_statement", "data_gap"].includes(reference.claimKind))).toBe(true);
  });

  it("keeps the public panorama payload bounded", async () => {
    const dto = await getCityPanoramaPublicDto(allPublicLayers);
    const diagnostics = cityPanoramaPayloadDiagnostics(dto);
    expect(diagnostics.serializedBytes).toBeLessThan(100_000);
    expect(diagnostics.compressedBytesEstimate).toBeLessThan(100_000);
  });
});
