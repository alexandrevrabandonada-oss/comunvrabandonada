import { describe, expect, it } from "vitest";
import {
  isCivicEmergencyContext,
  validateCivicForwardingInput,
} from "./comun-civic-forwarding-feature";

describe("COMUN civic assisted forwarding safeguards", () => {
  it("requires a new public reference and person-authored summary", () => {
    expect(
      validateCivicForwardingInput({ publicReference: "bairro", personAuthoredSummary: "curto" }).ok,
    ).toBe(false);
    expect(
      validateCivicForwardingInput({
        publicReference: "praça do bairro",
        personAuthoredSummary: "Há lixo acumulado próximo ao ponto público.",
      }).ok,
    ).toBe(true);
  });

  it("rejects contact-like values", () => {
    expect(
      validateCivicForwardingInput({
        publicReference: "praça do bairro",
        personAuthoredSummary: "Ligue para 24999999999 para combinar.",
      }),
    ).toMatchObject({ ok: false, code: "private_data_not_allowed" });
  });

  it("keeps emergency context outside the normal package", () => {
    expect(
      isCivicEmergencyContext({ category: "urban_flooding", urgency: "emergency" }),
    ).toBe(true);
    expect(
      isCivicEmergencyContext({ category: "waste_or_debris", urgency: "routine" }),
    ).toBe(false);
  });
});
