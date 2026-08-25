import { describe, expect, it } from "vitest";
import {
  DENUNCIAS_GUIDE_CATEGORIES,
  guideForDenuncia,
} from "./comun-denuncias-routing-guide";
import { routeRelata } from "../comun-relata-routing";

describe("denúncias routing guide", () => {
  it("covers every Relata category without enabling automation", () => {
    expect(DENUNCIAS_GUIDE_CATEGORIES).toHaveLength(18);
    for (const category of DENUNCIAS_GUIDE_CATEGORIES) {
      const guide = guideForDenuncia({ ...routeRelata({ text: "outro problema" }), category });
      expect(guide.automationAllowed).toBe(false);
      expect(guide.primaryChannels.length > 0 || guide.requiresHumanReview).toBe(true);
      expect(guide.primaryChannels.every((channel) => Boolean(channel.sourceUrl))).toBe(true);
    }
  });
  it("keeps energy escalation after the first channel", () => {
    const guide = guideForDenuncia(routeRelata({ text: "bairro sem energia" }));
    expect(guide.primaryChannels.length).toBeGreaterThan(0);
    expect(guide.escalationSteps.every((channel) => channel.escalationOnly)).toBe(true);
  });
  it("keeps emergencies outside normal forwarding", () => {
    const guide = guideForDenuncia(routeRelata({ text: "fio caído com faísca" }));
    expect(guide.immediateAction).toBeTruthy();
    expect(guide.automationAllowed).toBe(false);
  });

  it("keeps the first route legible across the established Relata domains", () => {
    const cases = [
      ["poste apagado", "public_lighting", {}],
      ["bairro sem energia", "power_distribution", {}],
      ["estamos sem água", "water_supply", {}],
      ["fio caído com faísca", "electrical_hazard", {}],
      ["incendio acontecendo agora", "active_fire", {}],
      ["lixo acumulado", "waste_or_debris", { environmentalIncidentsEnabled: true }],
      ["A rua está alagada e a água está subindo.", "urban_flooding", { urbanIncidentsEnabled: true }],
      ["A árvore está inclinada e parece que vai cair.", "tree_hazard", { urbanIncidentsEnabled: true }],
      ["calçada inacessível", "sidewalk_accessibility", {}],
      ["problema no trabalho", "workplace", {}],
      ["outro problema", "other", {}],
    ] as const;

    for (const [text, category, options] of cases) {
      const guide = guideForDenuncia(routeRelata({ text }, options));
      expect(guide.category).toBe(category);
      expect(guide.automationAllowed).toBe(false);
    }
  });

  it("never treats COMUN storage or prepared forwarding as an official send", () => {
    const guide = guideForDenuncia(routeRelata({ text: "estamos sem água" }));
    expect(guide.protocolGuidance).toContain("não é o protocolo do órgão");
    expect(guide.canUseAssistedForwarding).toBe(true);
    expect(guide.automationAllowed).toBe(false);
  });
});
