import { describe, expect, it } from "vitest";
import { COMUN_ENVIRONMENTAL_CHANNEL_CATALOG } from "./comun-environmental-channel-catalog";

describe("COMUN environmental institutional evidence catalog", () => {
  it("contains only reviewed public sources and no active automation", () => {
    expect(COMUN_ENVIRONMENTAL_CHANNEL_CATALOG.length).toBeGreaterThanOrEqual(4);
    for (const channel of COMUN_ENVIRONMENTAL_CHANNEL_CATALOG) {
      expect(channel.sourceUrl).toMatch(/^https:\/\//);
      expect(channel.sourceStatus).toBe("source_verified");
      expect(channel.reviewedAt).toBe("2026-08-10");
      expect(channel.operationalStatus).toBe("operationally_unchecked");
      expect(channel.automationAllowed).toBe(false);
    }
  });

  it("has evidence for fire, pollution and waste without a generic fallback", () => {
    const categories = COMUN_ENVIRONMENTAL_CHANNEL_CATALOG.flatMap(
      (channel) => channel.categories,
    );
    expect(categories).toContain("active_fire");
    expect(categories).toContain("environmental_pollution");
    expect(categories).toContain("waste_or_debris");
    expect(COMUN_ENVIRONMENTAL_CHANNEL_CATALOG).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categories: ["other"] }),
      ]),
    );
  });
});
