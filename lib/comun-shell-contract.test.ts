import { describe, expect, it } from "vitest";
import {
  COMUN_ROOT_TABS,
  COMUN_SHELL_CONTRACTS,
  isComunAppV2,
  resolveComunShellRoute,
  sanitizeComunBadge,
  withComunAppV2,
} from "./comun-shell-contract";

describe("canonical COMUN shell contract", () => {
  it.each([
    ["/", "public_web"],
    ["/comun", "member_root"],
    ["/comun/explorar", "member_root"],
    ["/comun/participar", "member_root"],
    ["/comun/caixa-de-entrada", "member_root"],
    ["/comun/minha-participacao", "member_root"],
    ["/comun/pautas/calcadas-em-circulacao", "member_nested"],
    ["/comun/c/centro", "member_nested"],
    ["/comun/admin/operacao", "admin"],
    ["/comun/admin/login", "auth"],
    ["/comun/calcadas", "immersive"],
    ["/comun/mapa/contribuir", "immersive"],
    ["/comun/entrar", "auth"],
    ["/comun/ajuda", "institutional"],
  ])("classifies %s as %s", (route, mode) => {
    expect(resolveComunShellRoute(route).mode).toBe(mode);
  });

  it("allows the bottom navigation only on the five member roots", () => {
    expect(Object.keys(COMUN_ROOT_TABS)).toHaveLength(5);
    expect(COMUN_SHELL_CONTRACTS.member_root.bottomNavigation).toBe("full");
    for (const [mode, contract] of Object.entries(COMUN_SHELL_CONTRACTS))
      if (mode !== "member_root")
        expect(contract.bottomNavigation).toBe("none");
  });

  it("never combines member or immersive chrome with an institutional footer", () => {
    for (const mode of [
      "member_root",
      "member_nested",
      "admin",
      "immersive",
      "auth",
    ] as const)
      expect(COMUN_SHELL_CONTRACTS[mode].footer).toBe("none");
  });

  it("keeps the feature flag reversible and preserves query/hash", () => {
    expect(isComunAppV2("app-v2")).toBe(true);
    expect(isComunAppV2("coerencia")).toBe(false);
    expect(withComunAppV2("/comun/explorar?categoria=pautas#lista")).toBe(
      "/comun/explorar?categoria=pautas&experiencia=app-v2#lista",
    );
    expect(withComunAppV2("/comun/explorar", false)).toBe("/comun/explorar");
  });

  it("sanitizes the inbox badge", () => {
    expect(sanitizeComunBadge(-3)).toBeNull();
    expect(sanitizeComunBadge("texto")).toBeNull();
    expect(sanitizeComunBadge(7)).toBe("7");
    expect(sanitizeComunBadge(1234)).toBe("99+");
  });
});
