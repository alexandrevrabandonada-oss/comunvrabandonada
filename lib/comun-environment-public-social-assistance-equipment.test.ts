import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT,
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT,
  COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST,
  diffPublicSocialAssistanceEquipmentSnapshots,
  validatePublicSocialAssistanceEquipmentSnapshot,
  type PublicSocialAssistanceEquipmentSnapshot,
  type PublicSocialAssistanceEquipmentSnapshotRecord,
} from "./comun-environment-public-social-assistance-equipment";

function cloneSnapshot() {
  return structuredClone(
    COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT,
  ) as PublicSocialAssistanceEquipmentSnapshot;
}

describe("public social assistance equipment snapshot D3B2", () => {
  it("promotes a validated, official-only address snapshot", () => {
    expect(validatePublicSocialAssistanceEquipmentSnapshot()).toEqual({
      ok: true,
      errors: [],
    });
    expect(COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT.activeSnapshotId).toBe(
      COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.snapshotId,
    );
    expect(COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.equipmentCount).toBe(16);
    expect(COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.readiness).toBe(
      "READY_D3C_SOCIAL_ASSISTANCE",
    );
  });

  it("keeps only stable CadSUAS identities corroborated by current municipal sources", () => {
    const snapshot = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT;
    expect(snapshot.diagnostics).toMatchObject({
      cadsuasRows: 89,
      recordsMatchedMunicipalDirectory: 16,
      recordsActiveReported: 16,
      recordsPublicManagement: 16,
      excludedNoMunicipalCorroboration: 73,
      sourceConflicts: 1,
    });
    expect(new Set(snapshot.records.map((record) => record.cadsuasCode)).size).toBe(
      snapshot.equipmentCount,
    );
    for (const record of snapshot.records) {
      expect(record.equipmentId).toBe(`social-assistance:cadsuas:${record.cadsuasCode}`);
      expect(record.management).toBe("public_municipal");
      expect(record.status).toBe("active_reported");
      expect(["cras", "creas"]).toContain(record.equipmentType);
    }
  });

  it("keeps restricted or unknown addresses absent and rejects an address leak", () => {
    const candidate = cloneSnapshot();
    const record = candidate.records[0];
    record.addressPublication = "restricted_by_source";
    record.address = null;
    candidate.diagnostics.recordsAddressPublic -= 1;
    candidate.diagnostics.recordsAddressRestricted += 1;
    expect(validatePublicSocialAssistanceEquipmentSnapshot(candidate)).toEqual({
      ok: true,
      errors: [],
    });

    record.address = {
      street: "Rua não autorizada",
      number: "1",
      complement: null,
      neighborhoodLabel: null,
      postalCode: null,
    };
    expect(validatePublicSocialAssistanceEquipmentSnapshot(candidate).errors).toContain(
      `restricted_address_leak:${record.cadsuasCode}`,
    );
  });

  it("is address-only, never geocodes, and never assigns a census sector", () => {
    const snapshot = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT;
    expect(snapshot.officialPointCount).toBe(0);
    expect(snapshot.addressOnlyCount).toBe(snapshot.equipmentCount);
    expect(snapshot.sectorMatchedCount).toBe(0);
    for (const record of snapshot.records) {
      expect(record.geography).toEqual({
        level: "address_only",
        latitude: null,
        longitude: null,
        source: "official_source",
      });
      expect(record.territorialBinding).toEqual({
        state: "not_applicable_address_only",
        sectorCode: null,
      });
    }
    expect(JSON.stringify(snapshot)).not.toContain("derived_geocoded_point");
  });

  it("fails closed for unknown status, non-public management, and duplicate CadSUAS codes", () => {
    const candidate = cloneSnapshot();
    const record = candidate.records[0];
    record.status = "unknown" as never;
    record.management = "private" as never;
    candidate.records.push(structuredClone(candidate.records[1]));
    candidate.equipmentCount += 1;
    candidate.addressOnlyCount += 1;
    candidate.diagnostics.recordsAddressOnly += 1;
    candidate.diagnostics.recordsWithoutSectorBinding += 1;
    candidate.diagnostics.recordsActiveReported += 1;
    candidate.diagnostics.recordsPublicManagement += 1;
    candidate.diagnostics.recordsAddressPublic += 1;
    const errors = validatePublicSocialAssistanceEquipmentSnapshot(candidate).errors;
    expect(errors).toContain(`invalid_public_active_record:${record.cadsuasCode}`);
    expect(errors).toContain(`duplicate_cadsuas:${candidate.records[1].cadsuasCode}`);
  });

  it("records source drift without overwriting the prior identity", () => {
    const first = COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.records[0];
    const changed = structuredClone(first) as PublicSocialAssistanceEquipmentSnapshotRecord;
    changed.officialName = `${changed.officialName} atualizada`;
    changed.equipmentType = "other";
    changed.management = "public_state";
    changed.address = { ...changed.address!, number: "999" };
    changed.addressPublication = "unknown";
    changed.address = null;
    const added = structuredClone(first) as PublicSocialAssistanceEquipmentSnapshotRecord;
    added.cadsuasCode = "999999";
    added.equipmentId = "social-assistance:cadsuas:999999";
    const diff = diffPublicSocialAssistanceEquipmentSnapshots(
      [first, COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.records[1]],
      [changed, added],
    );
    expect(diff.nameChanged).toEqual([first.equipmentId]);
    expect(diff.typeChanged).toEqual([first.equipmentId]);
    expect(diff.managementChanged).toEqual([first.equipmentId]);
    expect(diff.addressChanged).toEqual([first.equipmentId]);
    expect(diff.addressPublicationChanged).toEqual([first.equipmentId]);
    expect(diff.equipmentAdded).toEqual([added.equipmentId]);
    expect(diff.equipmentRemoved).toEqual([
      COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.records[1].equipmentId,
    ]);
  });

  it("minimizes public data and contains no contacts, people, COMUN private data, or source coordinates", () => {
    const serialized = JSON.stringify(COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT).toLowerCase();
    for (const forbidden of [
      "telefone",
      "email",
      "cpf",
      "cnpj",
      "responsavel",
      "usuário",
      "wallet",
      "attachment",
      "forwarding",
      "private.comun",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    for (const record of COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT.records) {
      expect(record.geography.latitude).toBeNull();
      expect(record.geography.longitude).toBeNull();
    }
  });

  it("keeps external access in the controlled capture script, never runtime/UI/API", () => {
    const runtime = readFileSync(
      "lib/comun-environment-public-social-assistance-equipment.ts",
      "utf8",
    );
    const capture = readFileSync(
      "scripts/environment/capture-comun-public-social-assistance-equipment.mjs",
      "utf8",
    );
    expect(runtime).not.toMatch(/\bfetch\s*\(/);
    expect(capture).toMatch(/\bfetch\s*\(/);
    expect(capture).not.toMatch(/google|mapbox|nominatim|bing maps|here api/i);
  });

  it("versions the approved official source set and hashes every source", () => {
    expect(COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST.sources).toHaveLength(4);
    for (const source of COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SOURCE_MANIFEST.sources) {
      expect(source.officialUrl).toMatch(/^https:\/\//);
      expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.semanticSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.status).toBe("verified");
    }
  });
});
