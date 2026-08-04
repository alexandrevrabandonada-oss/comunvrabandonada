import { describe, expect, it } from "vitest";
import {
  FISCALIZA_SOURCE_RECONCILIATION,
  validateFiscalizaDestination,
} from "./comun-fiscaliza-operational";

describe("Fiscaliza VR operational contract", () => {
  it("keeps current and historical deadline claims separate", () => {
    expect(FISCALIZA_SOURCE_RECONCILIATION.general.deadline).toBeNull();
    expect(FISCALIZA_SOURCE_RECONCILIATION.lighting.deadline).toEqual({
      value: 30,
      unit: "days",
    });
    expect(FISCALIZA_SOURCE_RECONCILIATION.historical2019.deadline).toEqual({
      value: 48,
      unit: "hours",
    });
    expect(FISCALIZA_SOURCE_RECONCILIATION.historical2019.includedInDueCalculation).toBe(false);
  });

  it("accepts only the exact HTTPS destination", () => {
    expect(validateFiscalizaDestination("https://www.voltaredonda.rj.gov.br/fiscalizavr").valid).toBe(true);
    expect(validateFiscalizaDestination("https://fiscalizavr.citysystems.com.br/").valid).toBe(false);
    expect(validateFiscalizaDestination("https://www.voltaredonda.rj.gov.br/fiscalizavr?case=1").valid).toBe(false);
    expect(validateFiscalizaDestination("http://www.voltaredonda.rj.gov.br/fiscalizavr").valid).toBe(false);
  });
});
