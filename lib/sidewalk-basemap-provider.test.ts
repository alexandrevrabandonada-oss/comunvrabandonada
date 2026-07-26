import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRealVoltaRedondaProvider,
  localSynthetic,
  resolveSidewalkBasemapProvider,
  VOLTA_REDONDA_CANONICAL_PMTILES_URL,
} from "./sidewalk-basemap-provider";

afterEach(() => vi.unstubAllEnvs());

describe("sidewalk basemap provider", () => {
  it("usa o PMTiles canônico real sem configuração manual", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL", "");

    const provider = resolveSidewalkBasemapProvider();

    expect(provider.id).toBe("realVoltaRedonda");
    expect(provider.kind).toBe("pmtiles");
    expect(provider.enabled).toBe(true);
    expect(provider.style.pmtilesUrl).toBe(VOLTA_REDONDA_CANONICAL_PMTILES_URL);
    expect(provider.attribution).toContain("OpenStreetMap");
    expect(provider.attribution).toContain("IBGE");
  });

  it("aceita um override explícito do PMTiles", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL",
      "https://maps.example.test/volta-redonda.pmtiles",
    );

    expect(getRealVoltaRedondaProvider().style.pmtilesUrl).toBe(
      "https://maps.example.test/volta-redonda.pmtiles",
    );
  });

  it("mantém a cartografia sintética somente por pedido explícito", () => {
    expect(resolveSidewalkBasemapProvider("localSynthetic")).toEqual(
      localSynthetic,
    );
    expect(resolveSidewalkBasemapProvider("realVoltaRedonda").id).toBe(
      "realVoltaRedonda",
    );
    expect(resolveSidewalkBasemapProvider("unknown").id).toBe(
      "realVoltaRedonda",
    );
  });

  it("declara fallback neutro sem substituir o mapa real por uma demo", () => {
    expect(resolveSidewalkBasemapProvider().fallback).toBe(
      "neutral-grid-and-list",
    );
  });
});
