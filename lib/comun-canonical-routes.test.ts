import { describe, expect, it } from "vitest";
import {
  comunCanonicalRoutes,
  isLegacyComunRoute,
} from "./comun-canonical-routes";

describe("rotas canônicas do portal", () => {
  it("mantém entidade e contexto numa única URL pública", () => {
    expect(comunCanonicalRoutes.territory("volta-redonda")).toBe(
      "/comun/territorios/volta-redonda",
    );
    expect(comunCanonicalRoutes.community("cidade")).toBe("/comun/c/cidade");
    expect(comunCanonicalRoutes.sidewalkRecord("travessia")).toBe(
      "/comun/calcadas/registros/travessia",
    );
    expect(comunCanonicalRoutes.sidewalkMemory("calcadas", "ciclo-1")).toBe(
      "/comun/pautas/calcadas/memoria/ciclo-1",
    );
  });

  it("identifica superfícies históricas sem afetar as canônicas", () => {
    expect(isLegacyComunRoute("/comun/busca")).toBe(true);
    expect(isLegacyComunRoute("/comun/arte/obra-antiga")).toBe(true);
    expect(isLegacyComunRoute("/comun/pautas/calcadas/registros/trecho")).toBe(
      true,
    );
    expect(isLegacyComunRoute("/comun/calcadas/registros/trecho")).toBe(false);
  });
});
