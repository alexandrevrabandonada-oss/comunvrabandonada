import { describe, expect, it } from "vitest";
import { isSafeComunRoute, migrateSidewalkDraft, parseSafeDrafts } from "./comun-pwa";

describe("COMUN PWA safety", () => {
  it("aceita somente retornos públicos seguros", () => {
    expect(isSafeComunRoute("/comun/pautas/calcadas")).toBe(true);
    expect(isSafeComunRoute("/comun/admin")).toBe(false);
    expect(isSafeComunRoute("https://example.com/comun")).toBe(false);
  });
  it("rejeita rascunhos inválidos", () => expect(parseSafeDrafts('[{"description":"sensível"}]')).toEqual([]));
  it("migra o rascunho legado sem conteúdo sensível", () => {
    const [draft] = migrateSidewalkDraft('{"step":3,"category":"buraco","manualMap":true}');
    expect(draft).toMatchObject({ schemaVersion: 2, step: 3, category: "buraco" });
    expect(draft).not.toHaveProperty("description");
  });
});
