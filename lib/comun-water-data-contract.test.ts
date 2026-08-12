import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_DRINKING_WATER_QUALITY_CANDIDATE,
  COMUN_SURFACE_WATER_QUALITY_CANDIDATE,
  isOfficialWaterSourceUrl,
  validateDrinkingWaterQualityCandidate,
  validateSurfaceWaterQualityCandidate,
  validateWaterDataContract,
  type DrinkingWaterMeasurement,
  type OfficialWaterQualityIndex,
  type SurfaceWaterSample,
} from "./comun-water-data-contract";

describe("water data contract D4A", () => {
  it("keeps surface water and drinking water as separate descriptors", () => {
    expect(COMUN_SURFACE_WATER_QUALITY_CANDIDATE.domain).toBe("surface_water_quality");
    expect(COMUN_DRINKING_WATER_QUALITY_CANDIDATE.domain).toBe("drinking_water_quality");
    expect(validateWaterDataContract()).toEqual({ ok: true, errors: [] });
  });

  it("allows only official HTTPS source domains and preserves source hashes", () => {
    for (const source of [
      ...COMUN_SURFACE_WATER_QUALITY_CANDIDATE.sources,
      ...COMUN_DRINKING_WATER_QUALITY_CANDIDATE.sources,
    ]) {
      expect(isOfficialWaterSourceUrl(source.sourceUrl)).toBe(true);
      expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(isOfficialWaterSourceUrl("https://example.com/water.csv")).toBe(false);
  });

  it("keeps a stable verified station identity without inventing coordinates", () => {
    expect(COMUN_SURFACE_WATER_QUALITY_CANDIDATE.verifiedStations).toEqual([
      expect.objectContaining({
        stationId: "surface-water:inea:PS0419",
        officialCode: "PS0419",
        municipality: "Volta Redonda",
        latitude: null,
        longitude: null,
      }),
    ]);
  });

  it("keeps measurements, official indexes, control, and surveillance semantically distinct", () => {
    const sample: SurfaceWaterSample = {
      stationId: "surface-water:inea:PS0419",
      sampledAt: null,
      parameter: "dissolved_oxygen",
      value: null,
      qualifier: null,
      unit: null,
      sourceId: "inea-rh-iii-iqa-2023-n12",
    };
    const index: OfficialWaterQualityIndex = {
      stationId: sample.stationId,
      value: null,
      classification: null,
      indexMethod: "IQA",
      period: "2023",
      sourceId: sample.sourceId,
    };
    const drinking: DrinkingWaterMeasurement = {
      supplySystemId: "official-id-required",
      municipalityCode: "3306305",
      controlKind: "control",
      parameter: "turbidity",
      result: null,
      unit: null,
      sampledAt: null,
      reportedPeriod: "unknown",
      sourceId: "sisagua-control-monthly-basic-20260812",
    };
    expect(sample.value).toBeNull();
    expect(index.indexMethod).toBe("IQA");
    expect(drinking.controlKind).toBe("control");
    expect(COMUN_DRINKING_WATER_QUALITY_CANDIDATE.controlKinds).toEqual([
      "control",
      "surveillance",
    ]);
  });

  it("fails closed if a source, station, or supply system contract is forged", () => {
    const badSurface = structuredClone(COMUN_SURFACE_WATER_QUALITY_CANDIDATE);
    badSurface.sources[0].sourceUrl = "https://untrusted.example/source";
    badSurface.verifiedStations[0].latitude = -22.5;
    expect(validateSurfaceWaterQualityCandidate(badSurface).errors).toEqual(
      expect.arrayContaining([
        "non_official_source:inea-rh-iii-quality-page-20260812",
        "invalid_station_coordinate:surface-water:inea:PS0419",
      ]),
    );

    const badDrinking = structuredClone(COMUN_DRINKING_WATER_QUALITY_CANDIDATE);
    badDrinking.supplySystemIdentity.status = "verified";
    expect(validateDrinkingWaterQualityCandidate(badDrinking).errors).toContain(
      "verified_supply_system_requires_official_id",
    );
  });

  it("has no runtime fetch or private Relata import", () => {
    const source = readFileSync(
      new URL("./comun-water-data-contract.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/comun_relata|wallet|attachment|forwarding|account/i);
    expect(source).not.toMatch(/potable|non_compliant|compliant/i);
  });

  it("keeps both domains candidate-only and partial until a separate snapshot tile", () => {
    expect(COMUN_SURFACE_WATER_QUALITY_CANDIDATE).toMatchObject({
      activeSnapshot: false,
      automaticPublicationAllowed: false,
      decision: "PARTIAL_D4",
    });
    expect(COMUN_DRINKING_WATER_QUALITY_CANDIDATE).toMatchObject({
      activeSnapshot: false,
      automaticPublicationAllowed: false,
      decision: "PARTIAL_D4",
      supplySystemIdentity: { saaeVrSystemId: null, status: "not_verified" },
    });
  });
});
