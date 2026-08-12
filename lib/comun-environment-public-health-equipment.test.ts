import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES } from "./comun-environment-public-equipment-contract";
import {
  COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT,
  COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT,
  COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST,
  diffPublicHealthEquipmentSnapshots,
  validatePublicHealthEquipmentSnapshot,
  type PublicHealthEquipmentSnapshot,
  type PublicHealthEquipmentSnapshotRecord,
} from "./comun-environment-public-health-equipment";
import { COMUN_TERRITORIAL_PUBLIC_BASE } from "./comun-environment-territorial-base";
import { locateOfficialPointInTerritorialSector } from "./comun-public-equipment-sector-locator.mjs";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cloneSnapshot() {
  return structuredClone(
    COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT,
  ) as PublicHealthEquipmentSnapshot;
}

describe("public health equipment snapshot D3B1", () => {
  it("validates the promoted CNES snapshot and active pointer", () => {
    expect(validatePublicHealthEquipmentSnapshot()).toEqual({
      ok: true,
      errors: [],
    });
    expect(COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId).toBe(
      COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.snapshotId,
    );
    expect(COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.readiness).toBe(
      "READY_D3C_HEALTH",
    );
  });

  it("keeps the active municipal/public filter exact and fail-closed", () => {
    const snapshot = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT;
    expect(snapshot.equipmentCount).toBe(102);
    expect(snapshot.diagnostics).toMatchObject({
      recordsFetched: 1103,
      recordsMunicipality: 1103,
      recordsActive: 1103,
      recordsPublicLegalNature: 102,
      recordsRejectedPrivateNature: 1001,
    });
    expect(
      new Set(snapshot.records.map((record) => record.cnesCode)).size,
    ).toBe(snapshot.equipmentCount);
    for (const record of snapshot.records) {
      expect(record.equipmentId).toBe(`health:cnes:${record.cnesCode}`);
      expect(record.municipalityCode).toBe("3306305");
      expect(record.municipalityName).toBe("Volta Redonda");
      expect(record.status).toBe("active_reported");
      expect(COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES).toContain(
        record.legalNatureCode,
      );
    }
  });

  it("versions the official legal-nature definitions instead of inferring public ownership", () => {
    expect(
      COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST.legalNatureDefinitions.map(
        ({ code, label }) => ({ code, label }),
      ),
    ).toEqual([
      {
        code: "1023",
        label:
          "Órgão Público do Poder Executivo Estadual ou do Distrito Federal",
      },
      {
        code: "1031",
        label: "Órgão Público do Poder Executivo Municipal",
      },
      { code: "1120", label: "Autarquia Municipal" },
    ]);
  });

  it("versions the CNES unit type dictionary and resolves every record label", () => {
    const definitions = new Map(
      COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST.unitTypeDefinitions.map(
        (definition) => [definition.code, definition.label],
      ),
    );
    expect(definitions.size).toBe(39);
    for (const record of COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records) {
      if (record.cnesUnitTypeCode === null) {
        expect(record.cnesUnitTypeLabel).toBeNull();
      } else {
        expect(record.cnesUnitTypeLabel).toBe(
          definitions.get(record.cnesUnitTypeCode),
        );
      }
    }
  });

  it("matches the semantic source hash to the minimized normalized records", () => {
    const semanticRows = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records.map(
      (record) => ({
        cnesCode: record.cnesCode,
        officialName: record.officialName,
        cnesUnitTypeCode: record.cnesUnitTypeCode,
        cnesUnitTypeLabel: record.cnesUnitTypeLabel,
        legalNatureCode: record.legalNatureCode,
        status: record.status,
        address: record.address,
        latitude:
          record.geography.level === "official_public_point"
            ? record.geography.latitude
            : null,
        longitude:
          record.geography.level === "official_public_point"
            ? record.geography.longitude
            : null,
      }),
    );
    const source = COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST.sources.find(
      (candidate) => candidate.sourceType === "cnes_active_establishments",
    );
    expect(source?.semanticSha256).toBe(sha256(JSON.stringify(semanticRows)));
    for (const item of COMUN_PUBLIC_HEALTH_EQUIPMENT_SOURCE_MANIFEST.sources) {
      expect(item.rawSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.semanticSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("preserves only official points or address-only records and never geocodes", () => {
    const snapshot = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT;
    expect(snapshot.officialPointCount).toBe(102);
    expect(snapshot.addressOnlyCount).toBe(0);
    expect(snapshot.equipmentCount).toBe(
      snapshot.officialPointCount + snapshot.addressOnlyCount,
    );
    for (const record of snapshot.records) {
      expect(["official_public_point", "address_only"]).toContain(
        record.geography.level,
      );
      expect(record.geography.source).toBe("official_source");
      expect(JSON.stringify(record)).not.toContain("derived_geocoded_point");
    }
  });

  it("recomputes all territorial bindings against the 739 D3A sectors", () => {
    const snapshot = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT;
    expect(COMUN_TERRITORIAL_PUBLIC_BASE.sectorCount).toBe(739);
    expect(snapshot.sectorMatchedCount).toBe(97);
    expect(snapshot.boundaryAmbiguousCount).toBe(1);
    expect(snapshot.outsideOrGeometryGapCount).toBe(4);
    expect(snapshot.officialPointCount).toBe(
      snapshot.sectorMatchedCount +
        snapshot.boundaryAmbiguousCount +
        snapshot.outsideOrGeometryGapCount,
    );

    const sectorCodes = new Set(
      COMUN_TERRITORIAL_PUBLIC_BASE.sectors.map((sector) => sector.sectorCode),
    );
    for (const record of snapshot.records) {
      if (record.geography.level !== "official_public_point") continue;
      const result = locateOfficialPointInTerritorialSector(
        record.geography,
        COMUN_TERRITORIAL_PUBLIC_BASE.sectors,
      );
      expect(result.state).toBe(record.territorialBinding.state);
      if (result.state === "matched") {
        expect(record.territorialBinding.sectorCode).toBe(result.sectorCode);
        expect(sectorCodes.has(result.sectorCode)).toBe(true);
      } else {
        expect(record.territorialBinding.sectorCode).toBeNull();
      }
    }
  });

  it("keeps a missing official coordinate as address-only without assigning a sector", () => {
    const candidate = cloneSnapshot();
    const record = candidate.records[0];
    record.geography = {
      level: "address_only",
      latitude: null,
      longitude: null,
      source: "official_source",
    };
    record.territorialBinding = {
      state: "not_applicable_address_only",
      sectorCode: null,
    };
    candidate.officialPointCount -= 1;
    candidate.addressOnlyCount += 1;
    if (COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records[0].territorialBinding.state === "matched") {
      candidate.sectorMatchedCount -= 1;
    } else if (
      COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records[0].territorialBinding.state ===
      "boundary_ambiguous"
    ) {
      candidate.boundaryAmbiguousCount -= 1;
    } else {
      candidate.outsideOrGeometryGapCount -= 1;
    }
    expect(validatePublicHealthEquipmentSnapshot(candidate).errors).not.toContain(
      `invalid_address_only:${record.cnesCode}`,
    );
  });

  it("detects source drift including the critical legal-nature change", () => {
    const base = COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records[0];
    const changed = structuredClone(base) as PublicHealthEquipmentSnapshotRecord;
    changed.officialName = `${changed.officialName} ATUALIZADO`;
    changed.cnesUnitTypeCode = "99";
    changed.legalNatureCode = "2062";
    changed.address = { ...changed.address!, number: "999" };
    if (changed.geography.level === "official_public_point") {
      changed.geography.latitude += 0.001;
    }
    const added = structuredClone(base) as PublicHealthEquipmentSnapshotRecord;
    added.equipmentId = "health:cnes:9999999";
    added.cnesCode = "9999999";
    const diff = diffPublicHealthEquipmentSnapshots(
      [base, COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records[1]],
      [changed, added],
    );
    expect(diff.nameChanged).toEqual([base.equipmentId]);
    expect(diff.typeChanged).toEqual([base.equipmentId]);
    expect(diff.legalNatureChanged).toEqual([base.equipmentId]);
    expect(diff.addressChanged).toEqual([base.equipmentId]);
    expect(diff.coordinatesChanged).toEqual([base.equipmentId]);
    expect(diff.equipmentAdded).toEqual([added.equipmentId]);
    expect(diff.equipmentRemoved).toEqual([
      COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT.records[1].equipmentId,
    ]);
  });

  it("minimizes the snapshot and excludes contacts, people and private COMUN fields", () => {
    const serialized = JSON.stringify(COMUN_PUBLIC_HEALTH_EQUIPMENT_SNAPSHOT);
    for (const forbidden of [
      "email",
      "telefone",
      "cpf",
      "cnpj",
      "responsavel",
      "profissional",
      "private.comun_relata_reports",
      "wallet",
      "attachment",
      "forwarding",
      "account_id",
    ]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("keeps external network access in the controlled capture script only", () => {
    const runtime = readFileSync(
      "lib/comun-environment-public-health-equipment.ts",
      "utf8",
    );
    const capture = readFileSync(
      "scripts/environment/capture-comun-public-health-equipment.mjs",
      "utf8",
    );
    expect(runtime).not.toMatch(/\bfetch\s*\(/);
    expect(capture).toMatch(/\bfetch\s*\(/);
    expect(capture).not.toMatch(/google|mapbox|nominatim|bing maps|here api/i);
  });
});
