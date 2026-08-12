import { describe, expect, it } from "vitest";
import {
  getTerritorialContextPublicDto,
  validateTerritorialContextPublicDto,
} from "./comun-observatory-territorial-context";

describe("territorial context public DTO", () => {
  it("derives the published aggregate and equipment invariants", () => {
    const dto = getTerritorialContextPublicDto();
    expect(validateTerritorialContextPublicDto(dto)).toEqual({ ok: true, errors: [] });
    expect(dto.summary).toMatchObject({
      sectorCount: 739,
      populationTotal: 261563,
      householdsTotal: 115652,
      healthEquipmentCount: 102,
      healthMatchedToSectorCount: 97,
      healthBoundaryAmbiguousCount: 1,
      healthOutsideOrGeometryGapCount: 4,
      socialAssistanceEquipmentCount: 16,
      socialAssistanceOfficialPointCount: 0,
      educationEquipmentCount: 0,
    });
  });

  it("is an explicit public DTO and does not emit assistance coordinates or sector bindings", () => {
    const dto = getTerritorialContextPublicDto();
    expect(dto.sourceKind).toBe("official_public_data");
    expect(dto.privateReportAggregate).toBe(false);
    expect(JSON.stringify(dto)).not.toMatch(/private\.comun_|wallet|receipt|original_text/i);
    expect(dto.socialAssistance.units.every((unit) => unit.geography === "address_only" && unit.territorialBinding === "not_applicable_address_only")).toBe(true);
    expect(dto.socialAssistance.units.some((unit) => "point" in unit)).toBe(false);
  });

  it("keeps the sector geometry out of the bounded API payload", () => {
    const dto = getTerritorialContextPublicDto();
    expect(dto.sectorMap).toEqual({
      state: "deferred_payload_budget",
      reason: "COMUN_48_2_D3C_SECTOR_MAP_DEFERRED_PAYLOAD_BUDGET",
      sourceRecordCount: 739,
      rawSnapshotBytes: 2277823,
    });
    expect(JSON.stringify(dto)).not.toContain("MultiPolygon");
  });
});
