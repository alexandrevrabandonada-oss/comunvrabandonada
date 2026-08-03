import { describe, expect, it } from "vitest";
import {
  canRelataAutoRoute,
  canRelataConsiderForMap,
  classifyRelataPrivacy,
  sanitizeRelataSummary,
} from "./comun-relata-privacy";

describe("COMUN Relata privacy", () => {
  it("keeps a plain civic description safe and sanitizable", () => {
    const privacy = classifyRelataPrivacy({ text: "A luminária da praça está apagada" });
    expect(privacy).toBe("public_after_sanitization");
    expect(canRelataAutoRoute(privacy)).toBe(true);
    expect(canRelataConsiderForMap(privacy)).toBe(false);
  });

  it("blocks people, exact locations and high-risk disclosures", () => {
    expect(classifyRelataPrivacy({ text: "A casa de uma pessoa está em risco", includesPersonData: true })).toBe("sensitive");
    expect(classifyRelataPrivacy({ text: "Criança ameaçada", includesChildData: true })).toBe("high_risk");
  });

  it("removes contact and document-like values from a summary", () => {
    expect(sanitizeRelataSummary("Falar com pessoa@example.com, CPF 123.456.789-00")).not.toMatch(/example|123/);
  });
});
