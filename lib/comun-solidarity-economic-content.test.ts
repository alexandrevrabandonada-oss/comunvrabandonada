import { describe, expect, it } from "vitest";
import {
  deriveSolidarityEconomicSlug,
  isComunSolidarityEconomicContentWritesEnabled,
  normalizeEconomicSummary,
  parseBRLAmountToCents,
  parseFutureDueAt,
  parseValidityDays,
  safeSolidarityEconomicContentError,
} from "./comun-solidarity-economic-content";

const parents = {
  COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
  COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
};

describe("COMUN 48.4-A3 economic content contract", () => {
  it("fails closed unless A1, A2 and A3 are all enabled", () => {
    expect(isComunSolidarityEconomicContentWritesEnabled({ ...parents, COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED: "enabled" })).toBe(true);
    expect(isComunSolidarityEconomicContentWritesEnabled({ ...parents })).toBe(false);
    expect(isComunSolidarityEconomicContentWritesEnabled({ ...parents, COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "disabled", COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED: "enabled" })).toBe(false);
    expect(isComunSolidarityEconomicContentWritesEnabled({ ...parents, COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "disabled", COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED: "enabled" })).toBe(false);
  });

  it("normalizes safe bounded publication values without inventing prices", () => {
    expect(deriveSolidarityEconomicSlug("Café & Costura", "oferta")).toBe("cafe-costura");
    expect(normalizeEconomicSummary("Uma oferta solidária real.")).toBe("Uma oferta solidária real.");
    expect(parseBRLAmountToCents("")).toBeNull();
    expect(parseBRLAmountToCents("25,90")).toBe(2590);
    expect(Number.isNaN(parseBRLAmountToCents("0"))).toBe(true);
    expect(Number.isNaN(parseBRLAmountToCents("vinte"))).toBe(true);
  });

  it("uses a 30-day default and enforces the 1..180 publication bound", () => {
    expect(parseValidityDays("")).toBe(30);
    expect(parseValidityDays("1")).toBe(1);
    expect(parseValidityDays("180")).toBe(180);
    expect(parseValidityDays("0")).toBeNull();
    expect(parseValidityDays("181")).toBeNull();
  });

  it("preserves missing due date and rejects dates in the past", () => {
    const now = new Date("2026-08-16T12:00:00Z");
    expect(parseFutureDueAt("", now)).toBeNull();
    expect(parseFutureDueAt("2026-08-15", now)).toBeUndefined();
    expect(parseFutureDueAt("2026-09-01", now)).toContain("2026-09-02T02:59:59.000Z");
  });

  it("maps database failures to public-safe messages", () => {
    expect(safeSolidarityEconomicContentError(new Error("COMUN_SOLIDARITY_ECONOMIC_CONTENT_BLOCKED"))).toContain("dados pessoais");
    expect(safeSolidarityEconomicContentError(new Error("secret internal detail"))).not.toContain("secret");
  });
});
