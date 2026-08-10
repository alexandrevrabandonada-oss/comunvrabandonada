import { describe, expect, it } from "vitest";
import { listComunSensitiveInstitutionalChannels } from "./comun-sensitive-institutional-channel-catalog";

describe("COMUN sensitive institutional channel catalog", () => {
  it("fails closed for conflicting municipal health and Council sources", () => {
    expect(
      listComunSensitiveInstitutionalChannels("public_health").some(
        (channel) => channel.id === "vr-sus-ombudsman-source-v1",
      ),
    ).toBe(false);
    expect(
      listComunSensitiveInstitutionalChannels("child_protection").some(
        (channel) => channel.id === "vr-conselho-tutelar-source-conflict-v1",
      ),
    ).toBe(false);
  });

  it("returns only verified, non-automated bare destinations", () => {
    for (const category of ["public_health", "public_education", "child_protection"] as const) {
      for (const channel of listComunSensitiveInstitutionalChannels(category)) {
        expect(channel.sourceStatus).toBe("source_verified");
        expect(channel.operationalStatus).toBe("operationally_unchecked");
        expect(channel.automationAllowed).toBe(false);
        expect(channel.destination).not.toMatch(/[?&](?:text|message|body)=/i);
      }
    }
  });

  it("shows emergency channels only when immediate danger is proven", () => {
    expect(
      listComunSensitiveInstitutionalChannels("child_protection").some(
        (channel) => channel.emergencyOnly,
      ),
    ).toBe(false);
    expect(
      listComunSensitiveInstitutionalChannels("child_protection", true).some(
        (channel) => channel.emergencyOnly,
      ),
    ).toBe(true);
  });
});
