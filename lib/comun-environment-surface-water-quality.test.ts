import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_SURFACE_WATER_ACTIVE_SNAPSHOT,
  COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS,
  COMUN_SURFACE_WATER_SNAPSHOT,
  COMUN_SURFACE_WATER_SOURCE_MANIFEST,
  isOfficialSurfaceWaterUrl,
  normalizeOfficialSurfaceWaterIndexes,
  normalizeSurfaceWaterMeasurements,
  validateSurfaceWaterSnapshot,
} from "./comun-environment-surface-water-quality";

describe("surface water raw source snapshot D4B0", () => {
  it("validates the promoted 2025 INEA snapshot and its exact active pointer", () => {
    expect(validateSurfaceWaterSnapshot()).toEqual({ ok: true, errors: [] });
    expect(COMUN_SURFACE_WATER_ACTIVE_SNAPSHOT.activeSnapshotId).toBe(
      COMUN_SURFACE_WATER_SNAPSHOT.snapshotId,
    );
    expect(COMUN_SURFACE_WATER_SNAPSHOT.referenceYear).toBe(2025);
  });

  it("preserves two official Volta Redonda stations and reconciles PS0419", () => {
    expect(COMUN_SURFACE_WATER_SNAPSHOT.stations.map((station) => station.officialCode)).toEqual([
      "PS0419",
      "PS0421",
    ]);
    expect(COMUN_SURFACE_WATER_SNAPSHOT.stations[0]).toMatchObject({
      stationId: "surface-water:inea:PS0419",
      waterBody: "Rio Paraíba do Sul",
      municipality: "Volta Redonda",
      geography: { latitude: null, longitude: null },
    });
  });

  it("normalizes actual samples while preserving qualifiers and missing values", () => {
    const measurements = normalizeSurfaceWaterMeasurements();
    expect(measurements).toHaveLength(240);
    expect(measurements).toContainEqual(expect.objectContaining({
      stationId: "surface-water:inea:PS0419",
      sampledAt: "2025-01-29",
      parameter: "biochemical_oxygen_demand",
      value: 2,
      qualifier: "<",
      unit: "mg/L",
    }));
    const missing = structuredClone(COMUN_SURFACE_WATER_SNAPSHOT);
    missing.rows[0][3] = null;
    expect(normalizeSurfaceWaterMeasurements(missing)[0]).toMatchObject({
      value: null,
      qualifier: null,
    });
    missing.rows[0][3] = "ND";
    expect(normalizeSurfaceWaterMeasurements(missing)[0]).toMatchObject({
      value: null,
      qualifier: "ND",
    });
  });

  it("keeps the source-reported IQA separate from raw parameter measurements", () => {
    const indices = normalizeOfficialSurfaceWaterIndexes();
    expect(indices).toHaveLength(24);
    expect(indices[0]).toMatchObject({ indexMethod: "IQA_NSF", value: 49.7 });
    expect(COMUN_SURFACE_WATER_PARAMETER_DEFINITIONS.map(({ canonicalId }) => canonicalId)).not.toContain("iqaNsf");
  });

  it("records 2024 as a reviewed schema-drift comparator, not as an active series", () => {
    expect(COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources.map((source) => source.reportedYear)).toEqual([2025, 2024]);
    expect(COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources.every((source) => source.rawSha256.match(/^[a-f0-9]{64}$/))).toBe(true);
    expect(isOfficialSurfaceWaterUrl(COMUN_SURFACE_WATER_SOURCE_MANIFEST.sources[0].officialUrl)).toBe(true);
    expect(COMUN_SURFACE_WATER_SOURCE_MANIFEST.drift2024To2025).toMatchObject({
      stationAdded: [],
      stationRemoved: [],
      parametersAdded: [],
      parametersRemoved: [],
      columnDrift: "page_width_only",
    });
  });

  it("fails closed for duplicate rows, unknown parameters, and invented coordinates", () => {
    const duplicate = structuredClone(COMUN_SURFACE_WATER_SNAPSHOT);
    duplicate.rows.push(structuredClone(duplicate.rows[0]));
    expect(validateSurfaceWaterSnapshot(duplicate).errors).toContain("duplicate_sample:PS0419:2025-01-29");
    const malformed = structuredClone(COMUN_SURFACE_WATER_SNAPSHOT);
    malformed.rowSchema[3] = "unknown_parameter";
    malformed.stations[0].geography.latitude = -22.5;
    expect(validateSurfaceWaterSnapshot(malformed).errors).toEqual(expect.arrayContaining([
      "unmappedOfficialParameter:unknown_parameter",
      "invented_coordinate:PS0419",
    ]));
  });

  it("has no runtime network or private imports", () => {
    const source = readFileSync(new URL("./comun-environment-surface-water-quality.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/comun_relata|wallet|attachment|forwarding|account|sisagua/i);
  });
});
