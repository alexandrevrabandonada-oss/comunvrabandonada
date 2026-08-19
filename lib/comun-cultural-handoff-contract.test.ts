import { describe, expect, it } from "vitest";
import {
  COMUN_CULTURAL_SPECIALIZED_HANDOFF_FLAG,
  isComunCulturalSpecializedHandoffEnabled,
  specializedHandoffPath,
} from "./comun-cultural-handoff-feature";

describe("48.5-A3 specialized cultural handoff contract", () => {
  it("is fail-closed when the dedicated flag is absent or off", () => {
    expect(COMUN_CULTURAL_SPECIALIZED_HANDOFF_FLAG).toBe("COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED");
    expect(isComunCulturalSpecializedHandoffEnabled({})).toBe(false);
    expect(isComunCulturalSpecializedHandoffEnabled({ COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED: "disabled" })).toBe(false);
    expect(isComunCulturalSpecializedHandoffEnabled({ COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED: "enabled" })).toBe(true);
  });

  it.each([
    ["photo_or_document", "/comun/acervo/contribuir"],
    ["art", "/comun/acervo/arte/contribuir"],
    ["oral_history", "/comun/acervo/historias-orais/contribuir"],
    ["radio", "/comun/radio/contribuir"],
  ])("maps %s to the existing specialized pipeline", (route, base) => {
    const suffix = route === "photo_or_document" ? "?specialized=photo&intake=ACERVO-A3FIXTURE" : "?intake=ACERVO-A3FIXTURE";
    expect(specializedHandoffPath(route, "ACERVO-A3FIXTURE")).toBe(`${base}${suffix}`);
  });

  it("does not manufacture a path for unknown or music", () => {
    expect(specializedHandoffPath("unknown", "ACERVO-A3FIXTURE")).toBeNull();
    expect(specializedHandoffPath("music", "ACERVO-A3FIXTURE")).toBeNull();
  });
});
