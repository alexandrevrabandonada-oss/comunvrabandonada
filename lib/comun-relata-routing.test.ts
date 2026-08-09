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
    expect(
      routeRelata({
        text: "A rua está toda escura",
        answers: { homes_power: "nao" },
      }).category,
    ).toBe("public_lighting");
    expect(
      routeRelata({
        text: "A rua está toda escura",
        answers: { homes_power: "sim" },
      }).category,
    ).toBe("power_distribution");
  });

  it("routes clear essential services without blocking questions", () => {
    const water = routeRelata({ text: "Estamos sem água desde ontem" });
    expect(water.category).toBe("water_supply");
    expect(water.missingInformation).toEqual([]);
    expect(
      routeRelata({ text: "O bairro inteiro está sem energia" }).category,
    ).toBe("power_distribution");
    expect(routeRelata({ text: "As casas aqui estão sem luz" }).category).toBe(
      "power_distribution",
    );
    expect(routeRelata({ text: "O poste está apagado" }).category).toBe(
      "public_lighting",
    );
    expect(
      routeRelata({ text: "A luminária da rua não acende" }).category,
    ).toBe("public_lighting");
  });

  it("keeps water quality and sewage environmental", () => {
    for (const text of [
      "A água está contaminada",
      "Há cheiro químico na água",
      "Há esgoto no rio",
      "O rio está poluído",
    ]) {
      expect(routeRelata({ text }).category).toBe("environmental_pollution");
    }
  });

  it("asks exactly one responsibility-changing question", () => {
    const decision = routeRelata({ text: "A rua inteira está sem luz" });
    expect(decision.missingInformation).toEqual([DARK_STREET_QUESTION]);
  });

  it("keeps fire and electrical risk urgent", () => {
    expect(routeRelata({ text: "Há fio elétrico caído" }).urgency).toBe(
      "emergency",
    );
    expect(routeRelata({ text: "Há fogo ativo" }).agencyKind).toBe("emergency");
  });

  it("distinguishes smoke without active fire", () => {
    const decision = routeRelata({
      text: "Há fumaça e vestígio, sem fogo ativo",
    });
    expect(decision.category).toBe("smoke_or_environmental_trace");
    expect(decision.agencyKind).toBe("environmental");
  });

  it("uses canonical categories for civic capture", () => {
    expect(
      routeRelata({ text: "A calçada está bloqueada por entulho" }).category,
    ).toBe("sidewalk_accessibility");
    expect(routeRelata({ text: "Há lixo e entulho na rua" }).category).toBe(
      "waste_or_debris",
    );
    expect(
      routeRelata({ text: "O problema é no ônibus da linha 10" }).category,
    ).toBe("public_transport");
    expect(
      routeRelata({ text: "Aconteceu na escola municipal" }).category,
    ).toBe("public_education");
  });
});
