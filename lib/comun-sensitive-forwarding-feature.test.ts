import { describe, expect, it } from "vitest";
import {
  canUseSensitiveForwarding,
  isComunChildProtectionChannelOnlyEnabled,
  isComunSensitiveForwardingAssistedEnabled,
  sensitiveDisclosurePolicyFor,
  sensitiveDisclosureWarnings,
  validateSensitiveDisclosureInput,
} from "./comun-sensitive-forwarding-feature";

const production = {
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_PARTICIPATION_WALLET_ENABLED: "enabled",
  COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED: "enabled",
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "configured",
};

const empty = {
  includeIssueType: false,
  includeUnitLabel: false,
  unitLabel: "",
  includeNetworkLabel: false,
  networkLabel: "",
  includeApproximatePeriod: false,
  approximatePeriod: "",
  includePersonAuthoredSummary: false,
  personAuthoredSummary: "",
};

describe("COMUN sensitive assisted forwarding feature", () => {
  it("enables health and education separately from child channel-only", () => {
    expect(isComunSensitiveForwardingAssistedEnabled(production)).toBe(true);
    expect(canUseSensitiveForwarding("public_health", production)).toBe(true);
    expect(canUseSensitiveForwarding("public_education", production)).toBe(true);
    expect(canUseSensitiveForwarding("child_protection", production)).toBe(false);
    const wave2 = {
      ...production,
      COMUN_CHILD_PROTECTION_CHANNEL_ONLY_ENABLED: "enabled",
    };
    expect(isComunChildProtectionChannelOnlyEnabled(wave2)).toBe(true);
    expect(canUseSensitiveForwarding("child_protection", wave2)).toBe(true);
  });

  it("maps each category to a distinct policy", () => {
    expect(sensitiveDisclosurePolicyFor("public_health")).toBe("health_minimal_v1");
    expect(sensitiveDisclosurePolicyFor("public_education")).toBe("education_minimal_v1");
    expect(sensitiveDisclosurePolicyFor("child_protection")).toBe(
      "child_protection_channel_only_v1",
    );
  });

  it("rejects obvious identifiers for explicit review", () => {
    expect(sensitiveDisclosureWarnings("meu CPF 123.456.789-00")).toContain("document");
    expect(sensitiveDisclosureWarnings("pessoa@example.com")).toContain("email");
    expect(sensitiveDisclosureWarnings("(24) 99999-1234")).toContain("phone");
  });

  it("forbids every content field in child-protection channel-only mode", () => {
    expect(
      validateSensitiveDisclosureInput("child_protection", {
        ...empty,
        includePersonAuthoredSummary: true,
        personAuthoredSummary: "texto",
      }),
    ).toMatchObject({ ok: false, code: "channel_only" });
    expect(validateSensitiveDisclosureInput("child_protection", empty)).toMatchObject({
      ok: true,
    });
  });
});
