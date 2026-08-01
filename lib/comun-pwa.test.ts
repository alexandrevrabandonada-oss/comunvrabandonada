import { describe, expect, it } from "vitest";
import { isSafeComunRoute } from "./comun-pwa";

describe("PWA public offline boundary", () => {
  it("accepts only allowlisted public paths without query or fragment", () => {
    expect(isSafeComunRoute("/comun/pautas/calcadas-em-circulacao")).toBe(true);
    expect(isSafeComunRoute("/comun/seguranca")).toBe(true);
    expect(isSafeComunRoute("/comun/buscar?q=contato-privado")).toBe(false);
    expect(isSafeComunRoute("/comun/minha-participacao")).toBe(false);
    expect(isSafeComunRoute("/comun/admin/operacao")).toBe(false);
    expect(isSafeComunRoute("https://example.org/comun/pautas/x")).toBe(false);
  });
});
