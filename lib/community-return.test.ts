import { describe, expect, it } from "vitest";
import { communityLoginHref, safeCommunityReturn } from "./community-return";

describe("safeCommunityReturn", () => {
  it("preserva rota interna, query e hash", () => {
    expect(safeCommunityReturn("/comun/pautas/calcadas?acao=registrar#formulario")).toBe("/comun/pautas/calcadas?acao=registrar#formulario");
  });

  it.each([
    "https://evil.example/comun",
    "//evil.example/comun",
    "/comun/admin",
    "/comun/admin/operacao",
    "/comun/entrar?returnTo=/comun",
    "/api/private",
    "/comun\\admin",
  ])("rejeita retorno inseguro %s", (value) => {
    expect(safeCommunityReturn(value)).toBe("/comun/minha-participacao");
  });

  it("codifica o destino uma única vez no href de login", () => {
    expect(communityLoginHref("/comun/mapa/contribuir?pauta=calcadas")).toBe("/comun/entrar?returnTo=%2Fcomun%2Fmapa%2Fcontribuir%3Fpauta%3Dcalcadas");
  });
});
