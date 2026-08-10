import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMUN_RELATA_CATEGORY_LABELS,
  resolveWalletRelataAction,
} from "./comun-wallet-relata-action";

const flags = {
  stmuAssistedEnabled: true,
  stmuMultichannelEnabled: false,
  essentialServicesEnabled: true,
  essentialForwardingEnabled: true,
};

function resolve(
  category: string | null,
  overrides: Partial<Parameters<typeof resolveWalletRelataAction>[0]> = {},
) {
  return resolveWalletRelataAction({
    category,
    presentationState: "Guardado",
    actionRequired: "Precisa de informação",
    metadata: {},
    featureFlags: flags,
    ...overrides,
  });
}

describe("category-aware Participation Wallet", () => {
  it("removes the legacy Fiscaliza fallback and the duplicated attention list", () => {
    const wallet = readFileSync(
      "app/comun/minha-participacao/participation-wallet-panel.tsx",
      "utf8",
    );
    const legacy = readFileSync(
      "app/comun/minha-participacao/comun-forwarding-panel.tsx",
      "utf8",
    );

    expect(wallet).not.toContain("ComunForwardingPanel");
    expect(wallet).not.toContain("attention.map");
    expect(wallet).not.toContain("Precisa de você</p>");
    expect(legacy).toContain("LEGACY_VR_FISCALIZA_LIGHTING_ADAPTER");
  });

  it("routes the exact sidewalk finding without any institutional adapter", () => {
    expect(resolve("sidewalk_accessibility")).toMatchObject({
      route: "sidewalk",
      categoryLabel: "Calçada e acessibilidade",
      stateMessage:
        "Guardado. Este relato ainda não entrou na fila do Mapa das Calçadas.",
      nextStep: "Faltam informações para entrar no mapa",
      showStmuAssisted: false,
      showStmuMultichannel: false,
      showEssentialServices: false,
    });
  });

  it("uses only explicit category adapters", () => {
    expect(
      resolve("public_transport", {
        presentationState: "Pronto para encaminhar",
      }),
    ).toMatchObject({
      route: "bus",
      nextStep: "Você pode preparar o encaminhamento à STMU",
      showStmuAssisted: true,
    });

    for (const category of [
      "water_supply",
      "power_distribution",
      "public_lighting",
    ]) {
      expect(
        resolve(category, { presentationState: "Pronto para encaminhar" }),
      ).toMatchObject({
        route: "essential_service",
        showEssentialServices: true,
      });
    }
  });

  it("keeps essential forwarding closed when its flag is off", () => {
    expect(
      resolve("public_lighting", {
        featureFlags: { ...flags, essentialForwardingEnabled: false },
      }),
    ).toMatchObject({
      route: "essential_service",
      showEssentialServices: false,
      availabilityMessage:
        "Relato guardado. O encaminhamento assistido não está disponível agora.",
    });
  });

  it("presents only sidewalk states proven by metadata", () => {
    expect(
      resolve("sidewalk_accessibility", {
        metadata: { sidewalkReviewState: "pending_review" },
      }).stateMessage,
    ).toBe("Em revisão para o Mapa das Calçadas.");
    expect(
      resolve("sidewalk_accessibility", {
        metadata: { sidewalkReviewState: "published" },
      }).stateMessage,
    ).toBe("Publicado no mapa após revisão.");
    expect(
      resolve("sidewalk_accessibility", {
        metadata: { sidewalkReviewState: "withdrawn" },
      }).stateMessage,
    ).toBe("Retirado.");
  });

  it.each([
    "other",
    "public_health",
    "public_education",
    "workplace",
    "environmental_pollution",
    "smoke_or_environmental_trace",
    "active_fire",
    "electrical_hazard",
    "waste_or_debris",
  ])("fails closed for %s", (category) => {
    expect(resolve(category)).toMatchObject({
      route: "no_verified_forwarding",
      showStmuAssisted: false,
      showStmuMultichannel: false,
      showEssentialServices: false,
      availabilityMessage:
        "Encaminhamento assistido ainda não disponível para esta categoria.",
    });
  });

  it("fails closed for an unknown category and never exposes its enum", () => {
    expect(resolve("future_unknown_category")).toMatchObject({
      route: "no_verified_forwarding",
      categoryLabel: "Categoria em revisão",
    });
  });

  it.each([
    ["urban_flooding", "Alagamento ou enchente"],
    ["stormwater_drainage", "Drenagem, bueiro ou canal"],
    ["tree_hazard", "Árvore, galho ou risco de queda"],
  ])("keeps urban category %s fail-closed", (category, label) => {
    expect(resolve(category)).toMatchObject({
      route: "no_verified_forwarding",
      categoryLabel: label,
      stateMessage: "Guardado no COMUN.",
      showStmuAssisted: false,
      showStmuMultichannel: false,
      showEssentialServices: false,
    });
  });

  it("shows an immediate-attention message only when urgency metadata proves it", () => {
    expect(
      resolve("urban_flooding", { metadata: { urgency: "emergency" } }),
    ).toMatchObject({
      nextStep: "Situação que pode exigir atendimento imediato.",
    });
  });

  it("uses the complete canonical human label map", () => {
    expect(COMUN_RELATA_CATEGORY_LABELS).toEqual({
      sidewalk_accessibility: "Calçada e acessibilidade",
      public_transport: "Ônibus e transporte coletivo",
      water_supply: "Abastecimento de água",
      power_distribution: "Falta de energia",
      public_lighting: "Iluminação pública",
      electrical_hazard: "Risco elétrico",
      active_fire: "Fogo ou incêndio ativo",
      smoke_or_environmental_trace: "Fumaça ou vestígio ambiental",
      waste_or_debris: "Lixo ou entulho",
      public_health: "Saúde pública",
      public_education: "Educação pública",
      workplace: "Trabalho",
      environmental_pollution: "Poluição ambiental",
      urban_flooding: "Alagamento ou enchente",
      stormwater_drainage: "Drenagem, bueiro ou canal",
      tree_hazard: "Árvore, galho ou risco de queda",
      other: "A classificar",
    });
  });
});
