import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_TERRITORIAL_ACTIVE_SNAPSHOT,
  COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS,
  COMUN_TERRITORIAL_BASE_OFFICIAL_DOMAINS,
  COMUN_TERRITORIAL_PUBLIC_BASE,
  COMUN_TERRITORIAL_SOURCE_MANIFEST,
  diffTerritorialPublicBases,
  diffTerritorialSources,
  normalizeTerritorialAggregate,
  territorialGeometryBounds,
  validateTerritorialGeometry,
  validateTerritorialPublicBase,
  type TerritorialPublicSector,
  type TerritorialSource,
} from "./comun-environment-territorial-base";

function cloneSnapshot() {
  return structuredClone(COMUN_TERRITORIAL_PUBLIC_BASE);
}

describe("environment territorial public base D3A", () => {
  it("accepts the official aggregated-only snapshot and source hashes", () => {
    expect(validateTerritorialPublicBase()).toEqual({ ok: true, errors: [] });
    expect(COMUN_TERRITORIAL_ACTIVE_SNAPSHOT.activeSnapshotId).toBe(
      COMUN_TERRITORIAL_PUBLIC_BASE.snapshotId,
    );
    expect(COMUN_TERRITORIAL_SOURCE_MANIFEST.sources).toHaveLength(3);
    for (const source of COMUN_TERRITORIAL_SOURCE_MANIFEST.sources) {
      expect(COMUN_TERRITORIAL_BASE_OFFICIAL_DOMAINS).toContain(
        new URL(source.officialUrl).hostname,
      );
      expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.originalPublisher).toBe("IBGE");
      expect(source.sourceKind).toBe("official_public_data");
      expect(source.automaticPublicationAllowed).toBe(false);
    }
  });

  it("contains 739 unique official sectors from Volta Redonda", () => {
    const sectors = COMUN_TERRITORIAL_PUBLIC_BASE.sectors;
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.sectorCount).toBe(739);
    expect(new Set(sectors.map((sector) => sector.sectorCode)).size).toBe(739);
    expect(
      sectors.every(
        (sector) =>
          sector.municipalityCode === "3306305" &&
          sector.municipalityName === "Volta Redonda" &&
          sector.sectorCode.startsWith("3306305"),
      ),
    ).toBe(true);
  });

  it("keeps only polygonal, finite and closed official public areas", () => {
    for (const sector of COMUN_TERRITORIAL_PUBLIC_BASE.sectors) {
      expect(["Polygon", "MultiPolygon"]).toContain(
        sector.geography.geometry.type,
      );
      expect(validateTerritorialGeometry(sector.geography.geometry)).toEqual({
        ok: true,
        errors: [],
      });
      const bounds = territorialGeometryBounds(sector.geography.geometry);
      expect(bounds.minLongitude).toBeGreaterThanOrEqual(-180);
      expect(bounds.maxLongitude).toBeLessThanOrEqual(180);
      expect(bounds.minLatitude).toBeGreaterThanOrEqual(-90);
      expect(bounds.maxLatitude).toBeLessThanOrEqual(90);
    }
  });

  it("rejects empty, open and non-finite geometry", () => {
    expect(
      validateTerritorialGeometry({ type: "Polygon", coordinates: [] }),
    ).toEqual({ ok: false, errors: ["empty_geometry"] });

    const open = validateTerritorialGeometry({
      type: "Polygon",
      coordinates: [
        [
          [-44, -22],
          [-43, -22],
          [-43, -21],
          [-44, -21],
        ],
      ],
    });
    expect(open.errors).toContain("open_ring:0");

    const invalid = validateTerritorialGeometry({
      type: "Polygon",
      coordinates: [
        [
          [-44, -22],
          [Number.NaN, -22],
          [-43, -21],
          [-44, -22],
        ],
      ],
    });
    expect(invalid.errors).toContain("invalid_coordinate:0:1");
  });

  it("rejects duplicate, missing and outside-municipality sectors", () => {
    const duplicate = cloneSnapshot();
    duplicate.sectors.push(structuredClone(duplicate.sectors[0]));
    duplicate.sectorCount += 1;
    expect(validateTerritorialPublicBase(duplicate).errors).toContain(
      `duplicate_sector:${duplicate.sectors[0].sectorCode}`,
    );

    const outside = cloneSnapshot();
    outside.sectors[0].municipalityCode = "3300000" as "3306305";
    expect(validateTerritorialPublicBase(outside).errors).toContain(
      `sector_outside_municipality:${outside.sectors[0].sectorCode}`,
    );

    const missingCode = cloneSnapshot();
    missingCode.sectors[0].sectorCode = "";
    expect(validateTerritorialPublicBase(missingCode).errors).toContain(
      "invalid_sector_code:",
    );
  });

  it("preserves missing and suppressed aggregates instead of inventing zero", () => {
    expect(normalizeTerritorialAggregate(null)).toBeNull();
    expect(normalizeTerritorialAggregate(undefined)).toBeNull();
    expect(normalizeTerritorialAggregate(".")).toBeNull();
    expect(normalizeTerritorialAggregate(0)).toBe(0);
    expect(normalizeTerritorialAggregate("0")).toBe(0);

    const missing = cloneSnapshot();
    const previous = missing.sectors[0].aggregates.populationTotal;
    missing.sectors[0].aggregates.populationTotal = null;
    missing.diagnostics.populationTotalFromSectors -= previous ?? 0;
    missing.diagnostics.sectorsWithMissingPopulation += 1;
    missing.diagnostics.populationMatchesMunicipalReference = false;
    expect(validateTerritorialPublicBase(missing)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("documents only V0001 people and V0002 total dwellings", () => {
    expect(COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS).toEqual([
      expect.objectContaining({
        variableId: "populationTotal",
        sourceVariableCode: "V0001",
        unit: "people",
      }),
      expect.objectContaining({
        variableId: "householdsTotal",
        sourceVariableCode: "V0002",
        unit: "households",
      }),
    ]);
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.aggregateDefinitionIds).toEqual([
      "populationTotal",
      "householdsTotal",
    ]);
  });

  it("reconciles sector totals with the compatible municipal universe", () => {
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.diagnostics).toMatchObject({
      populationTotalFromSectors: 261_563,
      populationTotalMunicipalReference: 261_563,
      populationMatchesMunicipalReference: true,
      householdsTotalFromSectors: 115_652,
      householdsTotalMunicipalReference: 115_652,
      householdsMatchMunicipalReference: true,
      sectorsWithMissingPopulation: 0,
      sectorsWithMissingHouseholds: 0,
    });
  });

  it("detects source, geometry, aggregate and definition drift", () => {
    const previousSources = COMUN_TERRITORIAL_SOURCE_MANIFEST.sources;
    const candidateSources = structuredClone(previousSources) as TerritorialSource[];
    candidateSources[0].rawSha256 = "a".repeat(64);
    expect(diffTerritorialSources(previousSources, candidateSources)).toEqual({
      sourceAdded: [],
      sourceRemoved: [],
      rawHashChanged: [previousSources[0].sourceId],
    });

    const previousSectors = COMUN_TERRITORIAL_PUBLIC_BASE.sectors.slice(0, 3);
    const candidateSectors = structuredClone(
      previousSectors,
    ) as TerritorialPublicSector[];
    candidateSectors[0].geography.normalizedGeometryHash = "b".repeat(64);
    candidateSectors[1].aggregates.populationTotal = 1;
    candidateSectors[2].sectorCode = "330630505009999";
    const candidateDefinitions = structuredClone(
      COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS,
    );
    candidateDefinitions[0].label = "Outro rótulo";

    expect(
      diffTerritorialPublicBases(
        previousSectors,
        candidateSectors,
        COMUN_TERRITORIAL_AGGREGATE_DEFINITIONS,
        candidateDefinitions,
      ),
    ).toMatchObject({
      sectorAdded: [],
      sectorRemoved: [],
      sectorCodeChanged: [previousSectors[2].canonicalId],
      geometryChanged: [previousSectors[0].canonicalId],
      aggregateChanged: [previousSectors[1].canonicalId],
      definitionChanged: ["populationTotal"],
    });
  });

  it("has no runtime fetch or private-domain dependency", () => {
    const source = readFileSync(
      new URL("./comun-environment-territorial-base.ts", import.meta.url),
      "utf8",
    ).toLowerCase();
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("@/lib/supabase");
    expect(source).not.toContain("private.comun");
    expect(source).not.toContain("relata_reports");
    expect(source).not.toContain("account");
  });

  it("keeps Base Territorial Pública as the product identity", () => {
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.snapshotId).toMatch(
      /^comun-territorial-public-base-/,
    );
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.snapshotId.toLowerCase()).not.toContain(
      "ibge",
    );
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.readiness).toBe("READY_D3B");
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.limitations).toContain(
      "COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER",
    );
  });
});
