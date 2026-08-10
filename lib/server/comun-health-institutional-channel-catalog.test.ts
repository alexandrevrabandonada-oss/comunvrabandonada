import { describe, expect, it } from "vitest";
import { COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG } from "./comun-health-institutional-channel-catalog";

describe("COMUN health institutional evidence catalog", () => {
  it("contains only source-reviewed, operationally unchecked channels", () => {
    expect(COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG).toHaveLength(4);
    for (const channel of COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG) {
      expect(channel.categories).toEqual(["public_health"]);
      expect(channel.operationalStatus).toBe("operationally_unchecked");
      expect(channel.automationAllowed).toBe(false);
      expect(channel.reviewedAt).toBe("2026-08-10");
    }
  });

  it("records the municipal source conflict instead of choosing silently", () => {
    const municipal = COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG.find(
      (channel) => channel.sphere === "municipal",
    );
    expect(municipal).toMatchObject({
      sourceStatus: "conflicting_sources",
      identificationRequirement: "source_conflict",
      destination: null,
    });
  });

  it("keeps SAMU emergency-only and never automated", () => {
    const samu = COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG.find(
      (channel) => channel.sphere === "emergency",
    );
    expect(samu).toMatchObject({
      destination: "192",
      channelType: "phone",
      automationAllowed: false,
    });
  });
});
