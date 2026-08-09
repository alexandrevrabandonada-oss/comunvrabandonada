import { describe, expect, it } from "vitest";
import {
  communityLoginHref,
  communityOnboardingHref,
  safeCommunityReturn,
} from "./community-return";

describe("safeCommunityReturn", () => {
  it("preserva rota interna, query e hash", () => {
    expect(
      safeCommunityReturn("/comun/pautas/calcadas?acao=registrar#formulario"),
    ).toBe("/comun/pautas/calcadas?acao=registrar#formulario");
  });

  it.each([
    "https://evil.example/comun",
    "javascript:alert(1)",
    "//evil.example/comun",
    "%2F%2Fevil.example%2Fcomun",
    "/%2F%2Fevil.example/comun",
    "/comun%2F..%2F..%2Fadmin",
    "/comun/admin",
    "/comun/admin/operacao",
    "/comun/entrar?returnTo=/comun",
    "/api/private",
    "/comun\\admin",
  ])("rejeita retorno inseguro %s", (value) => {
    expect(safeCommunityReturn(value)).toBe("/comun/minha-participacao");
  });

  it("codifica o destino uma única vez no href de login", () => {
    expect(communityLoginHref("/comun/mapa/contribuir?pauta=calcadas")).toBe(
      "/comun/entrar?returnTo=%2Fcomun%2Fmapa%2Fcontribuir%3Fpauta%3Dcalcadas",
    );
  });

  it("normaliza V2 e preserva rollback legado em auth e onboarding", () => {
    expect(
      communityLoginHref(
        "/comun/mapa/contribuir?experiencia=app-v2&pauta=calcadas",
      ),
    ).toBe(
      "/comun/entrar?returnTo=%2Fcomun%2Fmapa%2Fcontribuir%3Fpauta%3Dcalcadas",
    );
    expect(
      communityOnboardingHref(
        "/comun/mapa/contribuir?pauta=calcadas&experiencia=legacy",
      ),
    ).toContain("experiencia=legacy");
  });
});
