import { describe, expect, it } from "vitest";
import { requiresAdminSession } from "./middleware";

describe("fronteira de sessão administrativa", () => {
  it.each([
    "/comun/admin",
    "/comun/admin/curadoria",
    "/comun/admin/acervo/contribuicoes",
  ])("protege %s antes da renderização", (pathname) => {
    expect(requiresAdminSession(pathname)).toBe(true);
  });

  it.each([
    "/comun/admin/login",
    "/comun/admin/auth/callback",
    "/comun/minha-participacao",
  ])("não intercepta a fronteira de autenticação %s", (pathname) => {
    expect(requiresAdminSession(pathname)).toBe(false);
  });
});
