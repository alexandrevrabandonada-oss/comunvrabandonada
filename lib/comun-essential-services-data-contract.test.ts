import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT,
  canUsePowerContinuityAsOutageEvents,
  isOfficialEssentialServicesSourceUrl,
  isWaterSupplyNoticeReadyForConfirmedResumption,
  validateEssentialServicesDataContract,
  type PublicLightingServiceDescriptor,
  type WaterSupplyOfficialNotice,
} from "./comun-essential-services-data-contract";

describe("essential services public data contract E0", () => {
  it("keeps the three essential-service domains separate with honest readiness", () => {
    expect(Object.keys(COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.domains)).toEqual([
      "power_distribution_continuity",
      "water_supply_service",
      "public_lighting_service",
    ]);
    expect(COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.decisions).toEqual({
      power_distribution_continuity: "READY_E1_POWER",
      water_supply_service: "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY",
      public_lighting_service: "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY",
    });
    expect(validateEssentialServicesDataContract()).toEqual({ ok: true, errors: [] });
  });

  it("uses only official HTTPS sources and preserves the source hashes", () => {
    for (const domain of Object.values(COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.domains)) {
      for (const source of domain.sources) {
        expect(isOfficialEssentialServicesSourceUrl(source.officialUrl)).toBe(true);
        expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source.runtimeSuitable).toBe(false);
      }
    }
    expect(isOfficialEssentialServicesSourceUrl("https://example.test/source")).toBe(false);
  });

  it("requires ANEEL official set identity and utility identity without event inference", () => {
    const power = COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.domains.power_distribution_continuity as unknown as {
      stableIdentity: { utilityId: string; utilityName: string; verifiedElectricalSets: Array<{ electricalSetId: string; electricalSetName: string }> };
      semantics: { eventInferenceAllowed: boolean; municipalityAggregateAllowed: boolean };
    };
    expect(power.stableIdentity.utilityId).toBe("CNPJ:60444437000146");
    expect(power.stableIdentity.utilityName).toBe("LIGHT SESA");
    expect(power.stableIdentity.verifiedElectricalSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ electricalSetId: "8570", electricalSetName: "VOLTA REDONDA" }),
        expect.objectContaining({ electricalSetId: "8571", electricalSetName: "VOLTA REDONDA NAO URBANO" }),
        expect.objectContaining({ electricalSetId: "14995", electricalSetName: "RETIRO" }),
      ]),
    );
    expect(power.semantics.eventInferenceAllowed).toBe(false);
    expect(power.semantics.municipalityAggregateAllowed).toBe(false);
    expect(canUsePowerContinuityAsOutageEvents()).toBe(false);
  });

  it("fails closed for incomplete water notices and preserves forecast versus actual resumption", () => {
    const notice: WaterSupplyOfficialNotice = {
      noticeId: "official-notice",
      publishedAt: "2026-08-12T00:00:00Z",
      reportedStartAt: null,
      expectedResumeAt: "2026-08-12T12:00:00Z",
      actualResumeAt: null,
      gradualResumption: true,
      eventKind: "treatment_interruption",
      affectedAreaLabels: ["label published by source"],
      dependency: null,
      sourceId: "saae-vr-treatment-interruption-notice-29604-20260812",
    };
    expect(isWaterSupplyNoticeReadyForConfirmedResumption(notice)).toBe(false);
    expect(COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.domains.water_supply_service.decision).toBe(
      "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY",
    );
  });

  it("keeps a lighting administrative estimate distinct from an SLA and projects distinct from incidents", () => {
    const descriptor: PublicLightingServiceDescriptor = {
      administrativeServiceEstimateDays: 30,
      estimateIsSla: false,
      incidentDatasetEstablished: false,
    };
    expect(descriptor.estimateIsSla).toBe(false);
    expect(descriptor.incidentDatasetEstablished).toBe(false);
    expect(COMUN_ESSENTIAL_SERVICES_DATA_CONTRACT.domains.public_lighting_service.decision).toBe(
      "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY",
    );
  });

  it("has no runtime fetch or private-source import", () => {
    const source = readFileSync(
      new URL("./comun-essential-services-data-contract.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/comun_relata|wallet|attachment|forwarding|account|private\.comun/i);
  });
});
