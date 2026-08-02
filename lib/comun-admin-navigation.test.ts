import { describe, expect, it } from "vitest";
import {
  adminFilterSnapshot,
  adminV2NavigationHref,
  safeComunAdminReturn,
  withComunAdminReturn,
} from "./comun-admin-navigation";
import { resolveComunSurfaceMigration } from "./comun-surface-migration";

describe("navegação administrativa", () => {
  it("aceita apenas retornos internos administrativos", () => {
    expect(
      safeComunAdminReturn(
        "/comun/admin/pautas?status=triage&page=2&experiencia=app-v2",
      ),
    ).toBe("/comun/admin/pautas?status=triage&page=2&experiencia=app-v2");
    expect(
      safeComunAdminReturn(
        "/comun/admin/pautas?status=triage&experiencia=legacy",
      ),
    ).toBe("/comun/admin/pautas?status=triage&experiencia=legacy");
    expect(safeComunAdminReturn("/comun/pautas?status=privado")).toBe(
      "/comun/admin",
    );
    expect(safeComunAdminReturn("https://example.com/comun/admin")).toBe(
      "/comun/admin",
    );
  });

  it("remove contato e identificadores não allowlisted do retorno", () => {
    expect(
      adminFilterSnapshot(
        "/comun/admin/comunidades",
        new URLSearchParams(
          "fila=rights&q=centro&email=pessoa%40example.com&member_id=secret",
        ),
      ),
    ).toBe("/comun/admin/comunidades?fila=rights&q=centro");
  });

  it("carrega retorno canônico sem perder filtros", () => {
    expect(
      withComunAdminReturn(
        "/comun/admin/pautas/123",
        "/comun/admin/pautas?fila=editorial&page=3",
      ),
    ).not.toContain("experiencia=");
    expect(
      withComunAdminReturn(
        "/comun/admin/pautas/123",
        "/comun/admin/pautas?fila=editorial&page=3",
      ),
    ).toContain(
      "returnTo=%2Fcomun%2Fadmin%2Fpautas%3Ffila%3Deditorial%26page%3D3",
    );
    expect(
      withComunAdminReturn(
        "/comun/admin/pautas/123",
        "/comun/admin/pautas?fila=editorial&page=3",
        false,
      ),
    ).toContain("experiencia=legacy");
  });

  it("preserva os filtros canônicos cívicos e editoriais", () => {
    const snapshot = adminFilterSnapshot(
      "/comun/admin/pautas/contribuicoes",
      new URLSearchParams(
        "status=pending&page=3&q=ponte&risco=high&pauta=p-1&data_de=2026-08-01&experiencia=app-v2",
      ),
    );
    const parsed = new URL(snapshot, "http://comun.local");
    expect(parsed.searchParams.get("risco")).toBe("high");
    expect(parsed.searchParams.get("pauta")).toBe("p-1");
    expect(parsed.searchParams.get("data_de")).toBe("2026-08-01");
    expect(parsed.searchParams.get("experiencia")).toBeNull();
  });

  it("retorna detalhes para a fila administrativa imediatamente anterior", () => {
    expect(
      resolveComunSurfaceMigration("/comun/admin/acervo/item-123").parentHref,
    ).toBe("/comun/admin/acervo");
    expect(resolveComunSurfaceMigration("/comun/admin/acervo").parentHref).toBe(
      "/comun/admin",
    );
  });

  it("constrói a navegação V2 com retorno filtrado no momento da ação", () => {
    const href = adminV2NavigationHref({
      targetHref: "/comun/admin/acervo/novo",
      currentPathname: "/comun/admin/acervo",
      currentSearch: new URLSearchParams(
        "q=memoria&status=review&page=2&email=privado%40example.com",
      ),
      preserveReturn: true,
    });
    const parsed = new URL(href, "http://comun.local");
    expect(parsed.searchParams.get("experiencia")).toBeNull();
    expect(parsed.searchParams.get("returnTo")).toBe(
      "/comun/admin/acervo?q=memoria&status=review&page=2",
    );
    expect(href).not.toContain("privado");
  });
});
