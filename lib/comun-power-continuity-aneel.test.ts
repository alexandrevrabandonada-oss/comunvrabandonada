import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE,
  COMUN_POWER_CONTINUITY_ANEEL_SOURCE_MANIFEST,
  hasDuplicatePowerContinuityKeys,
  isOfficialAneelPowerSourceUrl,
  isPowerContinuitySnapshotPromotionAllowed,
  parseAneelReferencePeriod,
  validatePowerContinuityAneelCandidate,
} from "./comun-power-continuity-aneel";

describe("ANEEL power continuity E1 candidate", () => {
  it("preserves DEC and FEC as separate collective indicators", () => {
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.indicators).toMatchObject({
      firstObservedPeriod: "2020-01",
      latestObservedPeriod: "2026-06",
      periodCount: 78,
      decRecordCount: 390,
      fecRecordCount: 390,
      recordCount: 780,
    });
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.indicators.decRecordCount + COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.indicators.fecRecordCount).toBe(780);
    expect(hasDuplicatePowerContinuityKeys([
      { electricalSetId: "14995", indicator: "DEC", period: "2026-06" },
      { electricalSetId: "14995", indicator: "FEC", period: "2026-06" },
    ])).toBe(false);
    expect(hasDuplicatePowerContinuityKeys([
      { electricalSetId: "14995", indicator: "DEC", period: "2026-06" },
      { electricalSetId: "14995", indicator: "DEC", period: "2026-06" },
    ])).toBe(true);
  });

  it("fails closed because the official municipality relation is not historical", () => {
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.decision).toBe("PARTIAL_E1_POWER");
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.activeSnapshot).toBe(false);
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.coreLatestComparablePeriod).toBeNull();
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.currentMunicipalityRelation).toMatchObject({
      reportedAt: "2026-08-05",
      temporalCoverage: "single_current_materialization",
      electricalSetIdsWithoutObservedDecFec: ["554", "1856", "8570", "8571"],
    });
    expect(isPowerContinuitySnapshotPromotionAllowed()).toBe(false);
    expect(validatePowerContinuityAneelCandidate()).toEqual({ ok: true, errors: [] });
  });

  it("keeps only official ANEEL provenance and allows an unmaterialized compensation source", () => {
    for (const source of COMUN_POWER_CONTINUITY_ANEEL_SOURCE_MANIFEST.sources) {
      expect(isOfficialAneelPowerSourceUrl(source.officialUrl)).toBe(true);
      if (source.materialized) expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(isOfficialAneelPowerSourceUrl("https://example.test/aneel")).toBe(false);
  });

  it("does not turn collective indicators into outage, municipal, territorial, or normative claims", () => {
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.semantics).toEqual({
      municipalityAggregateAllowed: false,
      outageEventInferenceAllowed: false,
      neighborhoodInferenceAllowed: false,
      geographicProjectionAllowed: false,
      privateDataAllowed: false,
    });
    expect(COMUN_POWER_CONTINUITY_ANEEL_CANDIDATE.limits.normativeClassificationAllowed).toBe(false);
    expect(parseAneelReferencePeriod(2026, 6)).toBe("2026-06");
    expect(parseAneelReferencePeriod(2026, 13)).toBeNull();
  });

  it("has no runtime fetch, private import, UI route, API, or feature flag", () => {
    const source = readFileSync(new URL("./comun-power-continuity-aneel.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/comun_relata|wallet|attachment|forwarding|account|private\.comun/i);
  });
});
