import { describe, expect, it } from "vitest";
import {
  isComunSolidarityOrganizationGovernanceEnabled,
  safeSolidarityOrganizationAccessError,
  solidarityOrganizationAccessRoleLabel,
  solidarityOrganizationAccessStateLabel,
  validateSolidarityOrganizationAccessNote,
} from "./comun-solidarity-organization-governance";

describe("48.4-A2 organization governance contract", () => {
  it("fails closed unless the exact governance flag is enabled", () => {
    expect(isComunSolidarityOrganizationGovernanceEnabled({})).toBe(false);
    expect(isComunSolidarityOrganizationGovernanceEnabled({
      COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "true",
    })).toBe(false);
    expect(isComunSolidarityOrganizationGovernanceEnabled({
      COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
    })).toBe(true);
  });

  it("accepts only a bounded description of the person's participation", () => {
    expect(validateSolidarityOrganizationAccessNote("curto")).toBeNull();
    expect(validateSolidarityOrganizationAccessNote(" x ".repeat(301))).toBeNull();
    expect(validateSolidarityOrganizationAccessNote("  Participo das atividades locais.  ")).toBe(
      "Participo das atividades locais.",
    );
  });

  it("uses human labels without owner or seller language", () => {
    expect(solidarityOrganizationAccessRoleLabel("facilitator")).toBe("Facilitação");
    expect(solidarityOrganizationAccessRoleLabel("editor")).toBe("Edição");
    expect(solidarityOrganizationAccessStateLabel("pending")).toBe("Aguardando análise");
    const labels = [
      solidarityOrganizationAccessRoleLabel("facilitator"),
      solidarityOrganizationAccessRoleLabel("editor"),
    ].join(" ");
    expect(labels).not.toMatch(/dono|seller|proprietário/i);
  });

  it("maps database failures to bounded public-safe messages", () => {
    expect(safeSolidarityOrganizationAccessError(new Error("COMUN_SOLIDARITY_ACCESS_COOLDOWN"))).toContain("Aguarde");
    expect(safeSolidarityOrganizationAccessError(new Error("COMUN_SOLIDARITY_ACCESS_PENDING_LIMIT"))).toContain("limite");
    expect(safeSolidarityOrganizationAccessError(new Error("sensitive database detail"))).not.toContain("sensitive");
  });
});
