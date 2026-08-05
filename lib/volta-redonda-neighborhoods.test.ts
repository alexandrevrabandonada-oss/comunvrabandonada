import { describe, expect, it } from "vitest";
import {
  VOLTA_REDONDA_NEIGHBORHOODS,
  VOLTA_REDONDA_NEIGHBORHOOD_SOURCE,
} from "./volta-redonda-neighborhoods";

describe("catálogo territorial de Volta Redonda", () => {
  it("mantém opções não vazias e sem duplicidade", () => {
    const values = VOLTA_REDONDA_NEIGHBORHOODS.map((option) => option.value);
    expect(values.length).toBeGreaterThan(50);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain("Aterrado");
  });

  it("mantém a atribuição oficial e a versão do snapshot", () => {
    expect(VOLTA_REDONDA_NEIGHBORHOOD_SOURCE.sourceUrl).toContain("voltaredonda.rj.gov.br");
    expect(VOLTA_REDONDA_NEIGHBORHOOD_SOURCE.snapshotVersion).toBe("2026-08-04-textual-preliminary");
    expect(VOLTA_REDONDA_NEIGHBORHOOD_SOURCE.status).toContain("pending_geometry_validation");
  });
});
