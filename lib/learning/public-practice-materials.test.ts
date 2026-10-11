import { describe, expect, it } from "vitest";
import { catalog } from "./core";
import {
  getPublicPracticeMaterial,
  materialsForGuidance,
  practiceMaterialIds,
  publicPracticeMaterialHref,
} from "./public-practice-materials";

describe("public practice excerpts", () => {
  it.each(
    Object.keys(practiceMaterialIds) as (keyof typeof practiceMaterialIds)[],
  )(
    "links two existing catalog excerpts for %s without individual context",
    (stage) => {
      const materials = materialsForGuidance(stage);
      expect(materials).toHaveLength(2);
      for (const material of materials) {
        const source = catalog.missions.find(
          (mission) => mission.id === material.id,
        )!;
        expect(material.concept).toBe(source.concept);
        expect(material.application).toBe(source.application);
        expect(Object.keys(material).sort()).toEqual([
          "application",
          "concept",
          "editor",
          "id",
          "programTitle",
          "reviewedAt",
          "title",
          "version",
        ]);
        expect(publicPracticeMaterialHref(material.id, stage, false)).toBe(
          `/comun/ajuda/praticas/${material.id}?etapa=${stage}&experiencia=legacy`,
        );
      }
    },
  );
  it.each([
    "__proto__",
    "constructor",
    "unknown",
    "minha-primeira-pauta",
    "evidencia-ou-suposicao?user=private",
    null,
    ["evidencia-ou-suposicao"],
  ])("does not expose unselected or untrusted material %s", (value) => {
    expect(getPublicPracticeMaterial(value)).toBeNull();
  });
  it("does not attach an unrelated phase to material", () => {
    expect(
      publicPracticeMaterialHref("o-que-e-um-problema", "resultado"),
    ).toBeNull();
  });
});
