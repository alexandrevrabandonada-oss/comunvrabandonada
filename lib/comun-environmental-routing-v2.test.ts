import { describe, expect, it } from "vitest";
import { createComunRelataPhotoOnlyDecision } from "./comun-relata-photo-first";
import { routeRelata } from "./comun-relata-routing";

const route = (text: string, smokeActive?: "sim" | "nao" | "nao_sei") =>
  routeRelata(
    {
      text,
      answers: smokeActive ? { smoke_active: smokeActive } : {},
    },
    { environmentalIncidentsEnabled: true },
  );

describe("COMUN P6B-A environmental routing v2", () => {
  it("recognizes active fire and keeps emergency guidance local", () => {
    const decision = route("Está pegando fogo no mato.");
    expect(decision).toMatchObject({
      category: "active_fire",
      selectedCategory: "active_fire",
      urgency: "emergency",
      confidence: "high",
      routingVersion: "relata-routing-v2-environmental",
    });
    expect(decision.explanation).not.toMatch(/acionad|informad|a caminho/i);
    expect(decision.adaptiveQuestions).toEqual([]);
  });

  it("distinguishes an extinguished fire from active flames", () => {
    expect(route("O fogo já apagou, só ficou fumaça.")).toMatchObject({
      category: "smoke_or_environmental_trace",
      confidence: "high",
      adaptiveQuestions: [],
    });
    expect(route("Não tem fumaça nem fogo agora.")).toMatchObject({
      category: "other",
      confidence: "low",
      adaptiveQuestions: [],
    });
  });

  it("asks one optional typed question when smoke is ambiguous", () => {
    const decision = route("Tem muita fumaça no morro.");
    expect(decision.category).toBe("smoke_or_environmental_trace");
    expect(decision.missingInformation).toEqual([]);
    expect(decision.adaptiveQuestions).toEqual([
      expect.objectContaining({
        id: "smoke_active_state",
        answerKey: "smoke_active",
        blocking: false,
        options: [
          { value: "sim", label: "Sim, há chamas" },
          { value: "nao", label: "Não vejo chamas" },
          { value: "nao_sei", label: "Não sei" },
        ],
      }),
    ]);
    expect(route("Tem muita fumaça no morro.", "sim").category).toBe(
      "active_fire",
    );
    expect(route("Tem muita fumaça no morro.", "nao").category).toBe(
      "smoke_or_environmental_trace",
    );
    expect(route("Tem muita fumaça no morro.", "nao_sei")).toMatchObject({
      category: "smoke_or_environmental_trace",
      confidence: "low",
      requiresHumanReview: true,
    });
  });

  it.each([
    "Está caindo pó preto.",
    "Tem cheiro químico forte.",
    "Está saindo muita poeira da área industrial.",
  ])("recognizes pollution without accusing a company: %s", (text) => {
    const decision = route(text);
    expect(decision.category).toBe("environmental_pollution");
    expect(decision.explanation).not.toMatch(/empresa|culpad|responsável/i);
  });

  it.each([
    "Jogaram entulho na rua.",
    "Tem lixo acumulado na rua.",
    "Deixaram móveis abandonados aqui.",
  ])("recognizes waste or debris: %s", (text) => {
    expect(route(text).category).toBe("waste_or_debris");
  });

  it("lets risk dominate while retaining one sanitized secondary candidate", () => {
    const decision = route("Tem lixo pegando fogo.");
    expect(decision.category).toBe("active_fire");
    expect(decision.categoryCandidates).toEqual([
      { category: "active_fire", confidence: "high" },
      { category: "waste_or_debris", confidence: "medium" },
    ]);
    expect(decision).not.toHaveProperty("matchedSignals");
  });

  it("preserves the sidewalk P1 and unknown fallback", () => {
    expect(route("A calçada está bloqueada por entulho.").category).toBe(
      "sidewalk_accessibility",
    );
    expect(route("Tem uma coisa estranha acontecendo aqui.")).toMatchObject({
      category: "other",
      confidence: "low",
      adaptiveQuestions: [],
    });
  });

  it("does not infer an environmental category from photo-only capture", () => {
    expect(createComunRelataPhotoOnlyDecision()).toMatchObject({
      category: "other",
      requiresHumanReview: true,
    });
  });
});
