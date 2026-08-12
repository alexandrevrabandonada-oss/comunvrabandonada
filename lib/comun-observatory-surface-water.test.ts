import { describe, expect, it } from "vitest";
import { getSurfaceWaterObservatoryPublicDto, validateSurfaceWaterObservatoryPublicDto } from "./comun-observatory-surface-water";

describe("surface water observatory public DTO", () => {
  it("uses the active 2025 official snapshot with its two points and bounded data", () => {
    const dto = getSurfaceWaterObservatoryPublicDto();
    expect(dto.snapshot.referenceYear).toBe(2025);
    expect(dto.stations.map((station) => station.code)).toEqual(["PS0419", "PS0421"]);
    expect(dto.samples).toHaveLength(24);
    expect(dto.samples.flatMap((sample) => sample.measurements)).toHaveLength(240);
    expect(dto.stations.every((station) => station.coordinates === null)).toBe(true);
  });
  it("keeps official IQA separate and preserves qualifiers without legal inference", () => {
    const dto = getSurfaceWaterObservatoryPublicDto();
    expect(dto.officialIndexes).toHaveLength(24);
    expect(dto.samples.flatMap((sample) => sample.measurements)).toContainEqual(expect.objectContaining({ qualifier: "<" }));
    expect(JSON.stringify(dto)).not.toMatch(/potável|conforme|CSN|private_report|wallet/i);
    expect(validateSurfaceWaterObservatoryPublicDto(dto)).toEqual({ ok: true, errors: [] });
  });
});
