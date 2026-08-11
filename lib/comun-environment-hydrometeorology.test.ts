import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_HYDROMET_OFFICIAL_DOMAINS,
  COMUN_HYDROMET_OPERATIONAL_INVENTORY,
  COMUN_HYDROMET_SOURCE_MANIFEST,
  diffHydrometInventories,
  normalizeHydrometInventoryRow,
  normalizeHydrometMeasurement,
  validateHydrometInventorySnapshot,
  type HydrometMeasurement,
  type HydrometeorologicalStation,
} from "./comun-environment-hydrometeorology";

function cloneSnapshot() {
  return structuredClone(COMUN_HYDROMET_OPERATIONAL_INVENTORY);
}

describe("environment hydrometeorology D2A", () => {
  it("accepts the official inventory-only snapshot and its source hashes", () => {
    expect(validateHydrometInventorySnapshot()).toEqual({ ok: true, errors: [] });
    expect(COMUN_HYDROMET_SOURCE_MANIFEST.sources).toHaveLength(2);
    for (const source of COMUN_HYDROMET_SOURCE_MANIFEST.sources) {
      expect(COMUN_HYDROMET_OFFICIAL_DOMAINS).toContain(new URL(source.officialUrl).hostname);
      expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.originalPublisher).toBe("INEA");
    }
  });

  it("parses an official Plu/Flu row with an explicit station identity", () => {
    const station = normalizeHydrometInventoryRow(
      {
        rainfallStationCode: "2244167",
        riverLevelStationCode: "58288000",
        officialName: " Fazenda Escola UBM ",
        stationType: "Plu/Flu",
        riverOrBasin: "Rio Barra Mansa",
        hydrographicRegion: "Médio Paraíba do Sul",
        hydrographicRegionCode: "III",
        basin: "Bacia do curso Medio Superior do Paraiba do Sul",
        municipality: "Barra Mansa",
        latitude: -22.597167,
        longitude: -44.169806,
        officialAlertNetwork: true,
        basicNetwork: true,
        installedAt: "2012-04-24",
      },
      "inea-hydromet-operational-inventory-20260811",
    );

    expect(station).toMatchObject({
      stationId: "hydromet:plu:2244167",
      officialName: "Fazenda Escola UBM",
      municipality: "Barra Mansa",
      reportedStatus: "operational_reported",
      variables: ["rainfall", "river_level"],
    });
  });

  it("keeps the territorial result honest: no station in Volta Redonda", () => {
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.voltaRedondaStationCount).toBe(0);
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.stations).toHaveLength(5);
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.stations.every((station) => station.hydrographicRegionCode === "III")).toBe(true);
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.stations.some((station) => station.municipality === "Volta Redonda")).toBe(false);
  });

  it("does not convert missing rainfall or river level into zero", () => {
    const base: Omit<HydrometMeasurement, "variable" | "value"> = {
      stationId: "hydromet:plu:2244167",
      unit: null,
      measurementPeriod: null,
      observedAt: null,
      officialAlertState: null,
      dataState: "missing",
      sourceId: "inea-hydromet-operational-inventory-20260811",
    };
    expect(normalizeHydrometMeasurement({ ...base, variable: "rainfall", value: null }).value).toBeNull();
    expect(normalizeHydrometMeasurement({ ...base, variable: "river_level", value: null }).value).toBeNull();
    expect(normalizeHydrometMeasurement({ ...base, variable: "rainfall", value: 0 }).value).toBe(0);
  });

  it("keeps delayed data distinct from station status", () => {
    const measurement = normalizeHydrometMeasurement({
      stationId: "hydromet:plu:2244167",
      variable: "rainfall",
      value: null,
      unit: null,
      measurementPeriod: null,
      observedAt: null,
      officialAlertState: null,
      dataState: "delayed",
      sourceId: "inea-hydromet-operational-inventory-20260811",
    });
    expect(measurement.dataState).toBe("delayed");
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.stations[0].reportedStatus).toBe("operational_reported");
  });

  it("rejects duplicate stations, duplicate measurements, invalid coordinates and invalid status", () => {
    const duplicateStation = cloneSnapshot();
    duplicateStation.stations.push(structuredClone(duplicateStation.stations[0]));
    expect(validateHydrometInventorySnapshot(duplicateStation).errors).toContain("duplicate_station:hydromet:plu:2244167");

    const invalidCoordinate = cloneSnapshot();
    invalidCoordinate.stations[0].geography.latitude = -122;
    expect(validateHydrometInventorySnapshot(invalidCoordinate).errors).toContain("invalid_coordinate:hydromet:plu:2244167");

    const invalidStatus = cloneSnapshot();
    invalidStatus.stations[0].reportedStatus = "historical_only" as typeof invalidStatus.stations[0]["reportedStatus"];
    expect(validateHydrometInventorySnapshot(invalidStatus).errors).toContain("invalid_status:hydromet:plu:2244167");

    const duplicateMeasurement = cloneSnapshot();
    const measurement: HydrometMeasurement = {
      stationId: duplicateMeasurement.stations[0].stationId,
      variable: "rainfall",
      value: null,
      unit: null,
      measurementPeriod: null,
      observedAt: null,
      officialAlertState: null,
      dataState: "unknown",
      sourceId: duplicateMeasurement.sourceId,
    };
    duplicateMeasurement.measurements = [measurement, structuredClone(measurement)];
    expect(validateHydrometInventorySnapshot(duplicateMeasurement).errors).toContain(
      "duplicate_measurement:hydromet:plu:2244167:rainfall:unknown",
    );
  });

  it("separates current operational inventory from historical evidence", () => {
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.snapshotKind).toBe("operational_station_inventory");
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.sourceReportedAt).toBeNull();
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.measurements).toEqual([]);
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.readiness).toBe("PARTIAL_D2A");
  });

  it("produces semantic drift without treating ordering as a change", () => {
    const previous = COMUN_HYDROMET_OPERATIONAL_INVENTORY.stations;
    const reordered = [...previous].reverse();
    expect(diffHydrometInventories(previous, reordered)).toEqual({
      addedStations: [],
      removedStations: [],
      statusChanged: [],
      municipalityChanged: [],
      coordinatesChanged: [],
      variablesChanged: [],
    });

    const candidate = structuredClone(previous) as HydrometeorologicalStation[];
    candidate[0].reportedStatus = "maintenance_reported";
    candidate[1].municipality = "Outro município";
    candidate[2].geography.longitude = -44;
    candidate[3].variables = ["rainfall"];
    candidate.pop();
    candidate.push({ ...structuredClone(previous[0]), stationId: "hydromet:plu:9999999" });
    expect(diffHydrometInventories(previous, candidate)).toMatchObject({
      addedStations: ["hydromet:plu:9999999"],
      removedStations: ["hydromet:plu:2244169"],
      statusChanged: ["hydromet:plu:2244167"],
      municipalityChanged: ["hydromet:plu:2243511"],
      coordinatesChanged: ["hydromet:plu:2244168"],
      variablesChanged: ["hydromet:plu:2243292"],
    });
  });

  it("contains no runtime network or private-domain dependency", () => {
    const source = readFileSync(new URL("./comun-environment-hydrometeorology.ts", import.meta.url), "utf8").toLowerCase();
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("@/lib/supabase");
    expect(source).not.toContain("private.comun_relata_reports");
    expect(source).not.toContain("wallet");
    expect(source).not.toContain("attachments");
    expect(source).not.toContain("forwarding");
  });

  it("keeps external brands out of canonical dataset identity", () => {
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.snapshotId).toMatch(/^comun-hydrometeorology-/);
    expect(COMUN_HYDROMET_OPERATIONAL_INVENTORY.snapshotId.toLowerCase()).not.toContain("inea");
  });
});
