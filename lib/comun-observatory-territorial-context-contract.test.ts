import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = (path: string) => readFile(resolve(root, path), "utf8");

describe("territorial context public surface contract", () => {
  it("keeps the API read-only and behind the isolated feature flag", async () => {
    const api = await source("app/api/comun/observatorios/territorio/route.ts");
    expect(api).toContain("isComunObservatoryTerritorialContextEnabled");
    expect(api).toContain("export const POST = methodNotAllowed");
    expect(api).toContain("export const DELETE = methodNotAllowed");
    expect(api).toContain("allow: \"GET, HEAD\"");
  });

  it("uses only active snapshots and never imports private domains or runtime fetch", async () => {
    const adapter = await source("lib/comun-observatory-territorial-context.ts");
    expect(adapter).toContain("COMUN_TERRITORIAL_ACTIVE_SNAPSHOT");
    expect(adapter).toContain("COMUN_PUBLIC_HEALTH_EQUIPMENT_ACTIVE_SNAPSHOT");
    expect(adapter).toContain("COMUN_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_ACTIVE_SNAPSHOT");
    ["private.comun_relata_reports", "wallet", "forwarding", "fetch("].forEach((forbidden) =>
      expect(adapter).not.toContain(forbidden),
    );
  });

  it("does not draw assistance markers or claim environmental exposure", async () => {
    const component = await source("components/comun-territorial-context.tsx");
    expect(component).toContain("sem ponto no mapa");
    expect(component).toContain("sem vínculo censitário seguro");
    expect(component).not.toContain("cobertura de saúde");
    expect(component).not.toContain("risco ambiental");
  });
});
