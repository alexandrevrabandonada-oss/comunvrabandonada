import { describe, expect, it } from "vitest";
import { createComunEntityContext } from "@/lib/comun-entity-context";

const baseContext = {
  kind: "pauta" as const,
  id: "pauta-calcadas",
  slug: "calcadas-em-circulacao",
  title: "Calçadas em circulação",
};

describe("ComunEntityContext primary action", () => {
  it("accepts the canonical participation root as an action, not a relation", () => {
    const context = createComunEntityContext({
      ...baseContext,
      primaryAction: {
        href: "/comun/participar",
        label: "Abrir participação",
      },
    });

    expect(context.primaryAction?.href).toBe("/comun/participar");
  });

  it("keeps external and lookalike participation routes fail-closed", () => {
    for (const href of [
      "https://example.com/comun/participar",
      "/comun/participar-inseguro",
    ]) {
      expect(() =>
        createComunEntityContext({
          ...baseContext,
          primaryAction: { href, label: "Abrir participação" },
        }),
      ).toThrow(`COMUN_ENTITY_NON_CANONICAL_HREF:${href}`);
    }
  });
});
