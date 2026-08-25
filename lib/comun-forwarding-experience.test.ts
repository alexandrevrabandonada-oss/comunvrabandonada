import { describe, expect, it } from "vitest";
import { resolveComunForwardingExperience } from "./comun-forwarding-experience";

const base = {
  metadata: {},
  essentialForwardingEnabled: true,
  sensitiveForwardingEnabled: true,
  civicForwardingEnabled: true,
};

describe("COMUN multidomain forwarding experience", () => {
  it.each([
    ["water_supply", "essential_assisted"],
    ["power_distribution", "essential_assisted"],
    ["public_lighting", "essential_assisted"],
    ["public_health", "sensitive_assisted"],
    ["public_education", "sensitive_assisted"],
    ["child_protection", "sensitive_assisted"],
    ["sidewalk_accessibility", "specialized"],
    ["active_fire", "emergency"],
    ["electrical_hazard", "human_review"],
    ["waste_or_debris", "civic_assisted"],
    ["smoke_or_environmental_trace", "civic_assisted"],
    ["environmental_pollution", "civic_assisted"],
    ["stormwater_drainage", "civic_assisted"],
    ["urban_flooding", "civic_assisted"],
    ["tree_hazard", "civic_assisted"],
    ["workplace", "human_review"],
    ["other", "human_review"],
    ["public_transport", "human_review"],
  ] as const)("maps %s to %s", (category, mode) => {
    expect(resolveComunForwardingExperience({ ...base, category }).mode).toBe(mode);
  });

  it("prioritizes emergency over civic forwarding", () => {
    expect(
      resolveComunForwardingExperience({
        ...base,
        category: "urban_flooding",
        urgency: "emergency",
      }).mode,
    ).toBe("emergency");
  });

  it("prioritizes immediate electrical risk", () => {
    expect(
      resolveComunForwardingExperience({
        ...base,
        category: "electrical_hazard",
        metadata: { immediateDanger: true },
      }).mode,
    ).toBe("emergency");
  });

  it("keeps civic forwarding closed when its capability is off", () => {
    expect(
      resolveComunForwardingExperience({
        ...base,
        category: "waste_or_debris",
        civicForwardingEnabled: false,
      }).mode,
    ).toBe("human_review");
  });

  it("never enables automatic official sending", () => {
    const experience = resolveComunForwardingExperience({
      ...base,
      category: "waste_or_debris",
    });
    expect(experience.automationAllowed).toBe(false);
  });
});
