import { describe, expect, it } from "vitest";
import {
  resolveComunShellContract,
  resolveComunShellRoute,
} from "./comun-shell-contract";

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
