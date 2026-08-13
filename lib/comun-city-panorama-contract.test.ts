import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const source = (file: string) => readFile(new URL(file, import.meta.url), "utf8");

describe("48.2-F city panorama public contract", () => {
  it("is feature-gated and exposes a GET/HEAD-only API", async () => {
    const [page, api, feature] = await Promise.all([
      source("../app/comun/observatorios/panorama/page.tsx"),
      source("../app/api/comun/observatorios/panorama/route.ts"),
      source("./comun-observatory-feature.ts"),
    ]);
    expect(page).toContain("isComunObservatoryCityPanoramaEnabled");
    expect(api).toContain("isComunObservatoryCityPanoramaEnabled");
    expect(api).toContain("allow: \"GET, HEAD\"");
    expect(feature).toContain("COMUN_OBSERVATORY_CITY_PANORAMA_ENABLED");
  });

  it("only imports public adapters and does not create cross-domain private data access", async () => {
    const adapter = await source("./comun-city-panorama.ts");
    ["comun_relata", "wallet", "forwarding", "private location", "attachment", "account"].forEach((forbidden) => expect(adapter.toLowerCase()).not.toContain(forbidden));
    expect(adapter).toContain("getTerritorialContextPublicDto");
    expect(adapter).toContain("getSurfaceWaterObservatoryPublicDto");
    expect(adapter).toContain("getPowerInterruptionSummaryDto");
    expect(adapter).toContain("getSidewalkReviewedProjectionForObservatory");
  });

  it("keeps the specialized public paths instead of a unified cross-domain map", async () => {
    const component = await source("../components/comun-city-panorama.tsx");
    expect(component).toContain("Ver observatório");
    expect(component.toLowerCase()).not.toContain("mapa unificado");
  });
});
