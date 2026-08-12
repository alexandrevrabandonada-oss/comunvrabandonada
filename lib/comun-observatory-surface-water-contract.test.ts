import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const source = (path: string) => readFile(resolve(process.cwd(), path), "utf8");
describe("48.2-D4B surface-water public contract", () => {
  it("keeps API read-only and routes fail closed", async () => {
    const api = await source("app/api/comun/observatorios/ambiente/qualidade-dos-rios/route.ts");
    expect(api).toContain("isComunObservatoryEnvironmentSurfaceWaterEnabled");
    expect(api).toContain("export const POST = methodNotAllowed");
    expect(api).toContain('allow: "GET, HEAD"');
  });
  it("uses only local official snapshot data and does not invent a map or private source", async () => {
    const adapter = await source("lib/comun-observatory-surface-water.ts");
    const component = await source("components/comun-surface-water-observatory.tsx");
    ["private.comun_relata_reports", "wallet", "forwarding", "fetch(", "Sisagua"].forEach((forbidden) => expect(adapter).not.toContain(forbidden));
    expect(component).not.toContain("Map");
    expect(component).toContain("não são dados em tempo real");
    expect(component).toContain("não indicam, por si só, se a água é potável");
  });
});
