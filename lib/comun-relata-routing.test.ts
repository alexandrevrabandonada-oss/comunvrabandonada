import { describe, expect, it } from "vitest";
import { DARK_STREET_QUESTION, routeRelata } from "./comun-relata-routing";

describe("COMUN Relata deterministic routing", () => {
  it("does not guess when street darkness is underspecified", () => {
    const decision = routeRelata({ text: "A rua está toda escura" });
    expect(decision.category).toBe("public_lighting");
    expect(decision.missingInformation).toContain(DARK_STREET_QUESTION);
    expect(decision.confidence).toBe("low");
  });

  it("separates lighting from power distribution after the answer", () => {
    expect(routeRelata({ text: "A rua está toda escura", answers: { homes_power: "nao" } }).category).toBe("public_lighting");
    expect(routeRelata({ text: "A rua está toda escura", answers: { homes_power: "sim" } }).category).toBe("power_distribution");
  });

  it("keeps fire and electrical risk urgent", () => {
    expect(routeRelata({ text: "Há fio elétrico caído" }).urgency).toBe("emergency");
    expect(routeRelata({ text: "Há fogo ativo" }).agencyKind).toBe("emergency");
  });

  it("distinguishes smoke without active fire", () => {
    const decision = routeRelata({ text: "Há fumaça e vestígio, sem fogo ativo" });
    expect(decision.category).toBe("smoke_or_environmental_trace");
    expect(decision.agencyKind).toBe("environmental");
  });
});
