import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT,
  COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT,
  COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST,
  canSumAffectedConsumersAsUniquePeople,
  canUsePowerInterruptionDataForDecFec,
  deriveOfficialInterruptionDurationSeconds,
  isOfficialAneelPowerInterruptionUrl,
  validatePowerInterruptionAneelSnapshot,
} from "./comun-power-interruptions-aneel";

describe("ANEEL power interruption snapshot E1-R2", () => {
  it("uses the direct official municipality field and validates the distributor in each record", () => {
    expect(COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT).toMatchObject({
      snapshotId: "comun-power-interruptions-aneel-v1-2026-06",
      recordCount: 5676,
      latestPublishedCompetence: "2026-06",
      municipality: { ibgeCode: "3306305", name: "Volta Redonda" },
      distributor: { cnpj: "60444437000146", officialAbbreviation: "LIGHT SESA" },
    });
    expect(COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.records.every((record) => String(record.CodMunicipioIBGE) === "3306305")).toBe(true);
    expect(COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.records.every((record) => record.NumCNPJDistribuidora === "60444437000146")).toBe(true);
    expect(validatePowerInterruptionAneelSnapshot()).toEqual({ ok: true, errors: [] });
  });

  it("preserves published event fields, nulls, expurgos, causes and deterministic identity", () => {
    const records = COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.records;
    expect(new Set(records.map((record) => record.interruptionKey)).size).toBe(records.length);
    expect(records.some((record) => record.CodEvento === null)).toBe(true);
    expect(records.some((record) => record.CodOcorrencia !== null)).toBe(true);
    expect(records.some((record) => "DscMotivoExpurgo" in record)).toBe(true);
    expect(records.some((record) => "DscFatoGeradorCausa" in record)).toBe(true);
  });

  it("derives duration only from valid official timestamps and never changes the original values", () => {
    const sample = COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.records[0];
    expect(deriveOfficialInterruptionDurationSeconds(sample.DatInicioInterrupcao, sample.DatFimInterrupcao)).toBe(sample.durationSeconds);
    expect(deriveOfficialInterruptionDurationSeconds("not-a-date", sample.DatFimInterrupcao)).toBeNull();
    expect(deriveOfficialInterruptionDurationSeconds(sample.DatFimInterrupcao, sample.DatInicioInterrupcao)).toBeNull();
  });

  it("keeps interruption events separate from collective DEC/FEC, unique people, neighborhoods and geography", () => {
    expect(COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.semantics).toEqual({
      collectiveDecFecIncluded: false,
      municipalityAggregateAllowed: false,
      outageEventInferenceAllowed: false,
      consumerAffectedMeansUniquePeople: false,
      electricalSetMeansNeighborhood: false,
      geographicProjectionAllowed: false,
      privateDataAllowed: false,
    });
    expect(canUsePowerInterruptionDataForDecFec()).toBe(false);
    expect(canSumAffectedConsumersAsUniquePeople()).toBe(false);
  });

  it("uses a promoted offline snapshot with official hashes and no runtime private source", () => {
    expect(COMUN_POWER_INTERRUPTION_ANEEL_ACTIVE_SNAPSHOT).toMatchObject({
      activeSnapshotId: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.snapshotId,
      automaticPublicationAllowed: false,
      runtimeExternalFetchAllowed: false,
    });
    const sources = COMUN_POWER_INTERRUPTION_ANEEL_SOURCE_MANIFEST.sources;
    expect(sources).toHaveLength(11);
    expect(sources.filter((source) => source.materialized)).toHaveLength(2);
    expect(sources.find((source) => source.sourceId === "aneel-power-interruptions-2026-parquet")).toMatchObject({
      materialized: true,
      rawSha256: COMUN_POWER_INTERRUPTION_ANEEL_SNAPSHOT.sourceRawSha256,
    });
    for (const source of sources) {
      expect(isOfficialAneelPowerInterruptionUrl(source.officialUrl)).toBe(true);
      if (source.materialized) expect(source.rawSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const source = readFileSync(new URL("./comun-power-interruptions-aneel.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/comun_relata|wallet|attachment|forwarding|account|private\.comun/i);
  });
});
