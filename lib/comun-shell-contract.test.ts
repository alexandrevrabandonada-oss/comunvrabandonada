import { describe, expect, it } from "vitest";
import {
  COMUN_ROOT_TABS,
  resolveComunShellContract,
  resolveComunShellRoute,
} from "./comun-shell-contract";

describe("navegação pública integrada", () => {
  it("mantém as quatro intenções públicas sem criar outra camada de navegação", () => {
    expect(COMUN_ROOT_TABS.inicio).toEqual({ href: "/comun", label: "Início" });
    expect(COMUN_ROOT_TABS.explorar).toEqual({
      href: "/comun/observatorios/panorama",
      label: "Entender",
    });
    expect(COMUN_ROOT_TABS.participar).toEqual({
      href: "/comun/pautas",
      label: "Participar",
    });
    expect(COMUN_ROOT_TABS.minha_area).toEqual({
      href: "/comun/minha-participacao",
      label: "Minha participação",
    });
  });

  it("devolve cada detalhe ao contexto canônico", () => {
    expect(
      resolveComunShellRoute(
        "/comun/pautas/calcadas-em-circulacao/rodas/roda-1",
      ).parentHref,
    ).toBe("/comun/pautas/calcadas-em-circulacao");
    expect(resolveComunShellRoute("/comun/acoes/mutirao-1").parentHref).toBe(
      "/comun/pautas",
    );
    expect(
      resolveComunShellRoute("/comun/observatorios/transporte").parentHref,
    ).toBe("/comun/observatorios/panorama");
  });
});

describe("shells de autenticação, institucionais e imersivos", () => {
  it.each([
    "/comun/entrar",
    "/comun/criar-conta",
    "/comun/onboarding",
    "/comun/recuperar-acesso",
    "/comun/redefinir-acesso",
  ])("mantém %s focada e sem navegação concorrente", (route) => {
    const { contract } = resolveComunShellContract(route);
    expect(contract.mode).toBe("auth");
    expect(contract.footer).toBe("none");
    expect(contract.bottomNavigation).toBe("none");
  });

  it.each(["/comun/ajuda", "/comun/seguranca", "/comun/territorio-tomado"])(
    "mantém %s como leitura institucional imprimível",
    (route) => {
      const { contract } = resolveComunShellContract(route);
      expect(contract.mode).toBe("institutional");
      expect(contract.footer).toBe("institutional");
      expect(contract.width).toBe("reading");
    },
  );

  it.each(["/comun/calcadas", "/comun/mapa/contribuir", "/comun/campo/turno"])(
    "mantém %s contida e sem footer",
    (route) => {
      const { contract } = resolveComunShellContract(route);
      expect(contract.mode).toBe("immersive");
      expect(contract.scroll).toBe("immersive");
      expect(contract.footer).toBe("none");
      expect(contract.bottomNavigation).toBe("none");
      expect(resolveComunShellRoute(route).parentHref).not.toBe(route);
    },
  );
});
