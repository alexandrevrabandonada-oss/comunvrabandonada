import { describe, expect, it } from "vitest";
import { adminGoogleCallbackUrl, safeAdminReturn } from "./admin-google-auth";

describe("Google Auth administrativo", () => {
  it("aceita somente destinos administrativos internos", () => {
    expect(safeAdminReturn("/comun/admin/curadoria?filtro=photo")).toBe(
      "/comun/admin/curadoria?filtro=photo",
    );
  });

  it.each([
    "https://evil.example/comun/admin",
    "//evil.example/comun/admin",
    "/comun/minha-participacao",
    "/comun/admin/login",
    "/comun/admin/auth/callback",
    "/comun/admin/auth/callback?code=secret-code&returnTo=/comun/admin",
  ])("bloqueia retorno impróprio %s", (value) => {
    expect(safeAdminReturn(value)).toBe("/comun/admin");
  });

  it("fixa o callback Production no host canônico", () => {
    expect(
      adminGoogleCallbackUrl("/comun/admin/curadoria", {
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe(
      "https://comunsocial.online/comun/admin/auth/callback?returnTo=%2Fcomun%2Fadmin%2Fcuradoria",
    );
  });
});
