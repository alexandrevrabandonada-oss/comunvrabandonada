import { describe, expect, it } from "vitest";
import { createComunRelataPhotoOnlyDecision } from "./comun-relata-photo-first";
import { routeRelata } from "./comun-relata-routing";

const route = (
  text: string,
  answers: Record<string, string> = {},
) =>
  routeRelata(
    { text, answers },
    { environmentalIncidentsEnabled: true, urbanIncidentsEnabled: true },
  );

describe("COMUN P6B-B urban incident routing v3", () => {
  it.each([
    ["A rua está alagada e a água está subindo.", "urgent"],
    ["A água está entrando nas casas.", "emergency"],
    ["Tem correnteza na rua.", "emergency"],
  ])("recognizes active flooding: %s", (text, urgency) => {
    expect(route(text)).toMatchObject({
      category: "urban_flooding",
      urgency,
      routingVersion: "relata-routing-v3-urban-incidents",
    });
  });

  it("asks a typed optional flood-risk question without blocking capture", () => {
    const decision = route("A rua está começando a alagar.");
    expect(decision).toMatchObject({
      category: "urban_flooding",
      confidence: "medium",
      requiresHumanReview: true,
      missingInformation: [],
    });
    expect(decision.adaptiveQuestions).toEqual([
      expect.objectContaining({
        id: "flood_active_risk",
        answerKey: "flood_active_risk",
        blocking: false,
      }),
    ]);
    expect(route("A rua está começando a alagar.", { flood_active_risk: "sim" }).urgency).toBe(
      "emergency",
    );
  });

  it.each([
    "O bueiro está entupido.",
    "A tampa de bueiro está ausente.",
    "A canaleta está obstruída.",
  ])("recognizes drainage maintenance: %s", (text) => {
    expect(route(text)).toMatchObject({
      category: "stormwater_drainage",
      urgency: "attention",
    });
  });

  it("lets active flooding dominate drainage and keeps one candidate", () => {
    expect(route("O bueiro está entupido e a rua alagou.")).toMatchObject({
      category: "urban_flooding",
      categoryCandidates: [
        { category: "urban_flooding", confidence: "medium" },
        { category: "stormwater_drainage", confidence: "high" },
      ],
    });
  });

  it("honors flooding and drainage negations", () => {
    expect(route("Choveu forte, mas não alagou.").category).not.toBe(
      "urban_flooding",
    );
    expect(route("O bueiro não está entupido.").category).not.toBe(
      "stormwater_drainage",
    );
  });

  it.each([
    "Uma árvore caiu no meio da rua.",
    "A árvore está inclinada e parece que vai cair.",
    "Um galho caiu bloqueando a passagem.",
  ])("recognizes a tree hazard: %s", (text) => {
    expect(route(text).category).toBe("tree_hazard");
  });

  it("asks an optional typed tree-state question only when useful", () => {
    const decision = route("Há um galho quebrado sobre a passagem.");
    expect(decision.category).toBe("tree_hazard");
    expect(decision.missingInformation).toEqual([]);
    expect(decision.adaptiveQuestions).toEqual([
      expect.objectContaining({
        id: "tree_fall_state",
        answerKey: "tree_state",
        blocking: false,
      }),
    ]);
  });

  it("does not turn routine pruning without risk into a tree hazard", () => {
    expect(route("Precisa podar uma árvore, mas não há risco.").category).not.toBe(
      "tree_hazard",
    );
  });

  it("keeps electrical hazard dominant with a sanitized tree candidate", () => {
    expect(route("Um galho caiu na fiação e tem faísca.")).toMatchObject({
      category: "electrical_hazard",
      urgency: "emergency",
      categoryCandidates: [
        { category: "electrical_hazard", confidence: "high" },
        { category: "tree_hazard", confidence: "high" },
      ],
    });
  });

  it("preserves photo-only as unclassified", () => {
    expect(createComunRelataPhotoOnlyDecision()).toMatchObject({
      category: "other",
      requiresHumanReview: true,
    });
  });
});
