import { describe, expect, it } from "vitest";
import {
  isComunSolidarityOrganizationProfileSelfEditEnabled,
  normalizeSolidarityOrganizationPresentation,
  normalizeSolidarityOrganizationPublicContact,
  normalizeSolidarityOrganizationServices,
  normalizeSolidarityOrganizationServiceTerritory,
  safeSolidarityOrganizationProfileError,
  solidarityOrganizationPublicContactNeedsConfirmation,
} from "./comun-solidarity-organization-profile";

const parents = {
  COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
  COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
};

describe("COMUN 48.4-A6 organization profile contract", () => {
  it("is fail-closed and depends only on A1, A2 and A6", () => {
    expect(isComunSolidarityOrganizationProfileSelfEditEnabled(parents)).toBe(false);
    expect(
      isComunSolidarityOrganizationProfileSelfEditEnabled({
        ...parents,
        COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(
      isComunSolidarityOrganizationProfileSelfEditEnabled({
        ...parents,
        COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "disabled",
        COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED: "enabled",
      }),
    ).toBe(false);
    expect(
      isComunSolidarityOrganizationProfileSelfEditEnabled({
        ...parents,
        COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "disabled",
        COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED: "enabled",
      }),
    ).toBe(false);
    expect(
      isComunSolidarityOrganizationProfileSelfEditEnabled({
        ...parents,
        COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED: "enabled",
        COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED: "disabled",
        COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED: "disabled",
        COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "disabled",
      }),
    ).toBe(true);
  });

  it("normalizes optional presentation and territory with bounded values", () => {
    expect(normalizeSolidarityOrganizationPresentation("  ")).toBeNull();
    expect(normalizeSolidarityOrganizationPresentation("Texto público válido."))
      .toBe("Texto público válido.");
    expect(normalizeSolidarityOrganizationPresentation("curto")).toBeUndefined();
    expect(normalizeSolidarityOrganizationServiceTerritory("  Volta   Redonda  "))
      .toBe("Volta Redonda");
    expect(normalizeSolidarityOrganizationServiceTerritory(" ")).toBeNull();
  });

  it("deduplicates services case-insensitively and preserves first spelling", () => {
    expect(
      normalizeSolidarityOrganizationServices(
        " Costura \n\n costura\nFormação popular\nReciclagem ",
      ),
    ).toEqual(["Costura", "Formação popular", "Reciclagem"]);
    expect(
      normalizeSolidarityOrganizationServices(
        Array.from({ length: 13 }, (_, index) => `Item ${index}`).join("\n"),
      ),
    ).toBeUndefined();
    expect(normalizeSolidarityOrganizationServices("x")).toBeUndefined();
  });

  it("allows public phone/email while rejecting protected secrets and addresses", () => {
    expect(normalizeSolidarityOrganizationPublicContact("(24) 99999-0000"))
      .toBe("(24) 99999-0000");
    expect(normalizeSolidarityOrganizationPublicContact("rede@example.org"))
      .toBe("rede@example.org");
    expect(normalizeSolidarityOrganizationPublicContact(" ")).toBeNull();
    expect(normalizeSolidarityOrganizationPublicContact("CPF 123.456.789-00"))
      .toBeUndefined();
    expect(normalizeSolidarityOrganizationPublicContact("senha: segredo"))
      .toBeUndefined();
    expect(normalizeSolidarityOrganizationPublicContact("Rua A, casa 12"))
      .toBeUndefined();
  });

  it("requires confirmation only for a new non-empty public contact", () => {
    expect(
      solidarityOrganizationPublicContactNeedsConfirmation(
        "rede@example.org",
        "rede@example.org",
      ),
    ).toBe(false);
    expect(
      solidarityOrganizationPublicContactNeedsConfirmation(
        "rede@example.org",
        null,
      ),
    ).toBe(false);
    expect(
      solidarityOrganizationPublicContactNeedsConfirmation(
        null,
        "rede@example.org",
      ),
    ).toBe(true);
  });

  it("maps concurrency and rate limits to public-safe copy", () => {
    expect(
      safeSolidarityOrganizationProfileError(
        new Error("COMUN_SOLIDARITY_PROFILE_CONFLICT"),
      ),
    ).toContain("atualizado por outra pessoa");
    expect(
      safeSolidarityOrganizationProfileError(
        new Error("COMUN_SOLIDARITY_PROFILE_RATE_LIMIT"),
      ),
    ).toContain("Muitas alterações");
  });
});
