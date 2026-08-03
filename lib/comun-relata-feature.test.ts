import { describe, expect, it } from "vitest";
import { getRelataFeatureState, isComunRelataEnabled } from "./comun-relata-feature";

describe("COMUN Relata feature flag", () => {
  it("fails closed when absent or different from enabled", () => {
    expect(getRelataFeatureState({})).toBe("disabled");
    expect(isComunRelataEnabled({ COMUN_RELATA_PREVIEW: "true" })).toBe(false);
  });

  it("can be enabled explicitly for a local preview", () => {
    expect(isComunRelataEnabled({ COMUN_RELATA_PREVIEW: "enabled" })).toBe(true);
  });
});
