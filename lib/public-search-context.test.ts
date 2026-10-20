import { describe, it, expect } from "vitest";
import {
  normalizeSearchState,
  searchHref,
  searchReturnHref,
  contextualSearchHref,
  safeSearchDestination,
  searchAnchor,
  publicQuery,
} from "./public-search-context";
describe("public search navigation", () => {
  it("serializes only public supported state deterministically", () => {
    const s = normalizeSearchState({
      q: " cultura ",
      tipo: "memória",
      pauta: "praca-local",
      territorio: "bairro-local",
      semantic: "0",
      experiencia: "legacy",
      token: "never",
    })!;
    expect(searchHref(s)).toBe(
      "/comun/buscar?q=cultura&tipo=mem%C3%B3ria&pauta=praca-local&territorio=bairro-local&experiencia=legacy&semantic=0",
    );
    expect(
      normalizeSearchState(
        Object.fromEntries(
          new URL(searchHref(s), "https://local.invalid").searchParams,
        ),
      ),
    ).toEqual(s);
  });
  it.each([
    "https://evil.invalid/comun/buscar?q=livro",
    "//evil.invalid/comun/buscar?q=livro",
    "javascript:alert(1)",
    "/comun/admin?q=livro",
    "/comun/buscar?q=livro&token=private",
    "/comun/buscar?q=livro&q=other",
    "/comun/buscar?q=livro#private",
    "/comun/buscar?q=livro&returnTo=https://evil.invalid",
  ])("refuses untrusted return %s", (value) =>
    expect(searchReturnHref(value)).toBeNull(),
  );
  it("valid context opens separately without depending on storage or session", () => {
    const href = contextualSearchHref(
      "/comun/acervo/foto-local?access_token=discard",
      { q: "cultura", tipo: "memória" },
    )!;
    expect(href).not.toContain("access_token");
    const u = new URL(href, "https://local.invalid");
    expect(searchReturnHref(u.searchParams.get("busca"))).toBe(
      `/comun/buscar?q=cultura&tipo=mem%C3%B3ria#${searchAnchor("/comun/acervo/foto-local")}`,
    );
    expect(searchReturnHref(null)).toBeNull();
  });
  it.each([
    "pessoa@example.invalid",
    "senha=nao-publica",
    "eyJxx.xx.zz",
    "12345678901",
    "49200000-0000-4000-8000-000000000001",
  ])("refuses sensitive query before public navigation %s", (q) =>
    expect(publicQuery(q)).toBeNull(),
  );
  it("local destination is an allowlist, not a prefix check", () => {
    for (const path of [
      "/comun/admin/x",
      "/comunevil/x",
      "https://evil.invalid/comun/acervo/a",
      "/comun/acervo/a/../../admin/x",
    ])
      expect(safeSearchDestination(path)).toBeNull();
    expect(
      safeSearchDestination("/comun/resultados?resultado=praca-local"),
    ).toBe("/comun/resultados?resultado=praca-local");
    expect(
      safeSearchDestination("/comun/calcadas/registros/trecho-local"),
    ).toBeTruthy();
  });
  it("preserves the actual query-based result route and appends context safely", () => {
    const link = contextualSearchHref(
      "/comun/resultados?resultado=praca-local&token=discard",
      { q: "cultura" },
    )!;
    const url = new URL(link, "https://local.invalid");
    expect(url.pathname).toBe("/comun/resultados");
    expect(url.searchParams.get("resultado")).toBe("praca-local");
    expect(url.searchParams.has("token")).toBe(false);
    expect(searchReturnHref(url.searchParams.get("busca"))).toContain(
      "/comun/buscar?q=cultura#resultado-",
    );
    expect(safeSearchDestination("/comun/resultados/praca-local")).toBeNull();
  });
  it("clearing filters keeps only the public intent", () => {
    expect(searchHref({ q: "livros" })).toBe("/comun/buscar?q=livros");
    expect(
      normalizeSearchState({
        q: "livros",
        pauta: "private-49200000-0000-4000-8000-000000000001",
      }),
    ).toBeNull();
  });
});
