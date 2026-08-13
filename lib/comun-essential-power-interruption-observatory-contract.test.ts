import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach } from "vitest";
import * as summaryRoute from "@/app/api/comun/observatorios/servicos-essenciais/energia/route";
import * as recordsRoute from "@/app/api/comun/observatorios/servicos-essenciais/energia/interrupcoes/route";
const root = process.cwd();
const source = (file: string) => readFile(join(root, file), "utf8");
const flag = "COMUN_OBSERVATORY_ESSENTIAL_POWER_INTERRUPTION_ENABLED";
const foundation = "COMUN_OBSERVATORIES_FOUNDATION_ENABLED";
const originalFlag = process.env[flag];
const originalFoundation = process.env[foundation];
afterEach(() => { if (originalFlag === undefined) delete process.env[flag]; else process.env[flag] = originalFlag; if (originalFoundation === undefined) delete process.env[foundation]; else process.env[foundation] = originalFoundation; });
describe("essential power interruption public contract", () => {
  it("cloaks until enabled and allows only read-only methods", async () => {
    delete process.env[flag]; process.env[foundation] = "enabled";
    expect((await summaryRoute.GET()).status).toBe(404);
    expect((await recordsRoute.GET(new Request("https://example.test"))).status).toBe(404);
    process.env[flag] = "enabled";
    expect((await summaryRoute.GET()).status).toBe(200);
    expect((await summaryRoute.HEAD()).status).toBe(200);
    expect((await recordsRoute.GET(new Request("https://example.test?limit=25"))).status).toBe(200);
    expect((await recordsRoute.GET(new Request("https://example.test?limit=101"))).status).toBe(400);
    expect((await summaryRoute.POST()).status).toBe(405);
    expect((await recordsRoute.DELETE()).status).toBe(405);
  });
  it("has read-only summary and records APIs with a flag cloak", async () => {
    for (const file of ["app/api/comun/observatorios/servicos-essenciais/energia/route.ts", "app/api/comun/observatorios/servicos-essenciais/energia/interrupcoes/route.ts"]) {
      const api = await source(file);
      expect(api).toContain("isComunObservatoryEssentialPowerInterruptionEnabled");
      expect(api).toContain("export function GET");
      expect(api).toContain("export function HEAD");
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect(api).toContain(`export const ${method} = methodNotAllowed`);
    }
  });
  it("keeps UI and runtime offline from ANEEL and private domains", async () => {
    const files = ["app/comun/observatorios/servicos-essenciais/energia/page.tsx", "components/comun-essential-power-interruption-observatory.tsx", "lib/comun-essential-power-interruption-observatory.ts"];
    const text = await Promise.all(files.map(source)).then((parts) => parts.join("\n"));
    expect(text).not.toContain("fetch(");
    expect(text).not.toMatch(/supabase|wallet|private\.comun|comun_relata_reports|attachment/i);
    expect(text).not.toContain("CodConjUnidadeConsumidora");
  });
});
