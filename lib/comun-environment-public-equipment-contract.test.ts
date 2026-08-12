import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES,
  COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT,
  diffPublicEquipmentCatalogs,
  isOfficialPublicEquipmentSourceUrl,
  isPublicCnesLegalNature,
  locateOfficialPointInTerritorialSector,
  normalizePublicEquipmentAddress,
  validatePublicEquipmentGeography,
  validatePublicEquipmentRecords,
  validatePublicEquipmentSourceAudit,
  type PublicEquipmentAddress,
  type PublicEquipmentGeography,
  type PublicHealthEquipment,
  type SectorLocatorInput,
} from "./comun-environment-public-equipment-contract";

const officialPoint: PublicEquipmentGeography = {
  level: "official_public_point",
  latitude: -22.52,
  longitude: -44.1,
  source: "official_source",
};

function healthEquipment(
  overrides: Partial<PublicHealthEquipment> = {},
): PublicHealthEquipment {
  return {
    equipmentId: "cnes:1234567",
    cnesCode: "1234567",
    officialName: "Unidade pública de teste",
    equipmentType: "2",
    managementSphere: "municipal",
    susRelation: "sim",
    municipalityCode: "3306305",
    municipalityName: "Volta Redonda",
    address: null,
    geography: officialPoint,
    sourceId: "ms-cnes-establishments-vr-20260811",
    ...overrides,
  };
}

const squareSector = (
  sectorCode: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): SectorLocatorInput => ({
  sectorCode,
  geography: {
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    },
  },
});

describe("environment public equipment source contract D3B0", () => {
  it("accepts the official source audit, hashes and explicit decisions", () => {
    expect(validatePublicEquipmentSourceAudit()).toEqual({
      ok: true,
      errors: [],
    });
    expect(
      COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.automaticPublicationAllowed,
    ).toBe(false);
    expect(COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.health.decision).toBe(
      "READY_D3B1",
    );
    expect(COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.education.decision).toBe(
      "PARTIAL_D3B",
    );
    expect(
      COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.social_assistance.decision,
    ).toBe("PARTIAL_D3B");
    for (const source of COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.sources) {
      expect(isOfficialPublicEquipmentSourceUrl(source.officialUrl)).toBe(true);
      expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("keeps CNES public selection fail-closed on explicit legal nature codes", () => {
    expect(COMUN_PUBLIC_CNES_LEGAL_NATURE_CODES).toEqual([
      "1023",
      "1031",
      "1120",
    ]);
    expect(isPublicCnesLegalNature("1023")).toBe(true);
    expect(isPublicCnesLegalNature(1031)).toBe(true);
    expect(isPublicCnesLegalNature("1120")).toBe(true);
    expect(isPublicCnesLegalNature("2062")).toBe(false);
    expect(isPublicCnesLegalNature(null)).toBe(false);
  });

  it("does not infer public ownership from administrative sphere or SUS relation", () => {
    const privateMunicipal = {
      descricao_esfera_administrativa: "MUNICIPAL",
      estabelecimento_faz_atendimento_ambulatorial_sus: "SIM",
      codigo_natureza_juridica: "2062",
    };
    expect(
      isPublicCnesLegalNature(privateMunicipal.codigo_natureza_juridica),
    ).toBe(false);
  });

  it("normalizes public addresses without inventing missing values", () => {
    expect(normalizePublicEquipmentAddress(null)).toBeNull();
    expect(normalizePublicEquipmentAddress({ street: "  Rua  A  " })).toEqual({
      street: "Rua A",
      number: null,
      complement: null,
      neighborhoodLabel: null,
      postalCode: null,
    });
    expect(
      normalizePublicEquipmentAddress({ street: " ", number: "" }),
    ).toBeNull();
  });

  it("accepts official points and address-only records, but rejects geocoding", () => {
    expect(validatePublicEquipmentGeography(officialPoint)).toEqual({
      ok: true,
      errors: [],
    });
    expect(
      validatePublicEquipmentGeography({
        level: "address_only",
        latitude: null,
        longitude: null,
        source: "official_source",
      }),
    ).toEqual({ ok: true, errors: [] });
    expect(
      validatePublicEquipmentGeography({
        level: "derived_geocoded_point",
        latitude: -22.52,
        longitude: -44.1,
        source: "derived",
        geocoder: "forbidden-in-d3b0",
        confidence: "unknown",
      }).errors,
    ).toContain("derived_geocoding_forbidden");
  });

  it("rejects invalid coordinates, duplicate IDs and another municipality", () => {
    expect(
      validatePublicEquipmentGeography({
        level: "official_public_point",
        latitude: 91,
        longitude: -44,
        source: "official_source",
      }).errors,
    ).toContain("invalid_public_coordinate");

    const duplicate = healthEquipment();
    const wrongMunicipality = healthEquipment({
      equipmentId: "cnes:7654321",
      municipalityCode: "3300000" as "3306305",
    });
    const validation = validatePublicEquipmentRecords([
      duplicate,
      structuredClone(duplicate),
      wrongMunicipality,
    ]);
    expect(validation.errors).toContain("duplicate_equipment_id:cnes:1234567");
    expect(validation.errors).toContain("wrong_municipality:cnes:7654321");
  });

  it("binds only an official point that is strictly inside exactly one sector", () => {
    const sectors = [
      squareSector("A", 0, 0, 10, 10),
      squareSector("B", 10, 0, 20, 10),
    ];
    expect(
      locateOfficialPointInTerritorialSector(
        { latitude: 5, longitude: 5 },
        sectors,
      ),
    ).toEqual({
      state: "matched",
      sectorCode: "A",
    });
    expect(
      locateOfficialPointInTerritorialSector(
        { latitude: 5, longitude: 30 },
        sectors,
      ),
    ).toEqual({
      state: "outside_or_geometry_gap",
    });
    expect(
      locateOfficialPointInTerritorialSector(
        { latitude: 5, longitude: 10 },
        sectors,
      ),
    ).toEqual({
      state: "boundary_ambiguous",
    });
    expect(
      locateOfficialPointInTerritorialSector({ latitude: 5, longitude: 5 }, [
        squareSector("A", 0, 0, 10, 10),
        squareSector("C", 0, 0, 10, 10),
      ]),
    ).toEqual({ state: "boundary_ambiguous" });
  });

  it("detects semantic equipment drift without deleting history", () => {
    const address: PublicEquipmentAddress = {
      street: "Rua A",
      number: "1",
      complement: null,
      neighborhoodLabel: null,
      postalCode: null,
    };
    const previous = [
      {
        equipmentId: "A",
        officialName: "Nome A",
        equipmentType: "cras",
        address,
        geography: officialPoint,
        status: "active",
      },
      {
        equipmentId: "REMOVED",
        officialName: "Removido",
        equipmentType: "other",
        address: null,
        geography: officialPoint,
        status: "active",
      },
    ];
    const next = [
      {
        equipmentId: "A",
        officialName: "Nome B",
        equipmentType: "creas",
        address: { ...address, number: "2" },
        geography: { ...officialPoint, latitude: -22.51 },
        status: "inactive",
      },
      {
        equipmentId: "ADDED",
        officialName: "Adicionado",
        equipmentType: "cras",
        address: null,
        geography: officialPoint,
        status: "active",
      },
    ];
    expect(diffPublicEquipmentCatalogs(previous, next)).toEqual({
      equipmentAdded: ["ADDED"],
      equipmentRemoved: ["REMOVED"],
      nameChanged: ["A"],
      typeChanged: ["A"],
      addressChanged: ["A"],
      coordinatesChanged: ["A"],
      statusChanged: ["A"],
    });
  });

  it("records source conflicts instead of silently choosing a catalog", () => {
    const education = COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.education;
    expect(education.conflicts.join(" ")).toMatch(/105/);
    expect(education.conflicts.join(" ")).toMatch(/101/);
    expect(education.conflicts.join(" ")).toMatch(/conveniadas/);
    expect(
      COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.social_assistance.conflicts,
    ).not.toHaveLength(0);
  });

  it("preserves audited counts without upgrading partial domains", () => {
    const health = COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.health;
    const education = COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.education;
    const assistance =
      COMUN_PUBLIC_EQUIPMENT_SOURCE_AUDIT.domains.social_assistance;
    expect(health.recordCount).toBe(1103);
    expect(health.candidatePublicRecordCount).toBe(102);
    expect(health.recordsWithOfficialCoordinates).toBe(102);
    expect(education.recordCount).toBe(196);
    expect(education.publicOperatingRecordCount).toBe(130);
    expect(education.recordsWithOfficialCoordinates).toBe(0);
    expect(assistance.recordCount).toBe(89);
    expect(assistance.recordsWithPublishedUnitCode).toBe(69);
    expect(assistance.recordsWithOfficialCoordinates).toBe(0);
  });

  it("contains no unnecessary contacts, geocoder or private COMUN source", () => {
    const dataText = readFileSync(
      "data/comun/environment/public-equipment/source-audit-v1.json",
      "utf8",
    );
    const sourceText = readFileSync(
      "lib/comun-environment-public-equipment-contract.ts",
      "utf8",
    );
    expect(dataText).not.toMatch(
      /\b(?:email|whatsapp|telefonePessoal|cpf|beneficiario|prontuario)\b/i,
    );
    expect(dataText).not.toMatch(
      /google geocoding|mapbox|nominatim|here maps|bing maps/i,
    );
    expect(sourceText).not.toMatch(
      /private\.comun|wallet|forwarding|attachment|account/i,
    );
    expect(sourceText).not.toMatch(/\bfetch\s*\(/);
    expect(sourceText).not.toMatch(
      /Google Maps|Observatório INEA|Observatório IBGE/i,
    );
  });
});
