import { describe, expect, it } from "vitest";
import {
  COMUN_MY_AREA_LEGACY_SECTIONS,
  COMUN_MY_AREA_PRIMARY_SECTIONS,
  COMUN_MY_AREA_SECONDARY_SECTIONS,
  COMUN_MY_AREA_V2_SECTIONS,
  comunMyAreaSectionHref,
  resolveComunMyAreaSection,
} from "./comun-my-area-navigation";

describe("SOC-D10.L/P2 — navegação de Minha participação", () => {
  it("expõe todas as nove seções renderizadas uma vez, sem inferir vínculo", () => {
    expect(COMUN_MY_AREA_V2_SECTIONS).toHaveLength(9);
    expect(new Set(COMUN_MY_AREA_V2_SECTIONS).size).toBe(9);
    expect(COMUN_MY_AREA_PRIMARY_SECTIONS).toHaveLength(5);
    expect(COMUN_MY_AREA_SECONDARY_SECTIONS).toHaveLength(4);
    expect([...COMUN_MY_AREA_V2_SECTIONS].sort()).toEqual(
      [
        "contribuicoes",
        "acompanhando",
        "conversas",
        "acoes",
        "tarefas",
        "comunidades",
        "resultados",
        "cultura",
        "configuracoes",
      ].sort(),
    );
    expect(COMUN_MY_AREA_V2_SECTIONS).not.toContain("caixa-de-entrada");
  });

  it("preserva seleção explícita sem aceitar entradas arbitrárias", () => {
    for (const section of COMUN_MY_AREA_V2_SECTIONS) {
      expect(resolveComunMyAreaSection(section, true)).toBe(section);
    }
    for (const input of ["", "admin", "../conta", "cultura/../../admin", null]) {
      expect(resolveComunMyAreaSection(input, true)).toBe("contribuicoes");
    }
  });

  it("mantém o contrato de seções legacy sem ampliar a exposição", () => {
    expect(COMUN_MY_AREA_LEGACY_SECTIONS).toEqual([
      "contribuicoes",
      "acompanhando",
      "tarefas",
      "resultados",
    ]);
    expect(resolveComunMyAreaSection("cultura", false)).toBe("contribuicoes");
    expect(resolveComunMyAreaSection("tarefas", false)).toBe("tarefas");
  });

  it("gera somente rotas internas canônicas e sem query privada", () => {
    for (const section of COMUN_MY_AREA_V2_SECTIONS) {
      expect(comunMyAreaSectionHref(section)).toBe(
        `/comun/minha-participacao?secao=${section}`,
      );
    }
    for (const input of [
      "../admin",
      "conta?token=secret",
      "https://elsewhere.test",
    ]) {
      expect(comunMyAreaSectionHref(input)).toBe("/comun/minha-participacao");
    }
  });
});
