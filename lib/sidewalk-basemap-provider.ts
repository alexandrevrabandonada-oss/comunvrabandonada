import { VOLTA_REDONDA_MAP } from "@/lib/sidewalk-map-config";

export const VOLTA_REDONDA_CANONICAL_PMTILES_URL =
  "/maps/volta-redonda/volta-redonda.pmtiles";

export type SidewalkBasemapProvider = {
  id: "localSynthetic" | "realVoltaRedonda";
  kind: "synthetic" | "pmtiles";
  attribution: string;
  cachePolicy: string;
  style: {
    background: string;
    water?: string;
    styleUrl?: string;
    pmtilesUrl?: string;
  };
  fallback: "neutral-grid-and-list";
  enabled: boolean;
  center: [number, number];
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
};

export const localSynthetic: SidewalkBasemapProvider = {
  id: "localSynthetic",
  kind: "synthetic",
  enabled: true,
  attribution:
    "Cartografia sintética local · não representa levantamento viário real",
  cachePolicy:
    "Somente arquivos locais versionados; nenhuma requisição de tiles.",
  style: { background: "#e8ece5", water: "#9fcbd3" },
  fallback: "neutral-grid-and-list",
  center: VOLTA_REDONDA_MAP.center,
  bounds: VOLTA_REDONDA_MAP.bounds,
  minZoom: 10,
  maxZoom: 18,
};

export function getRealVoltaRedondaProvider(): SidewalkBasemapProvider {
  const pmtilesUrl =
    process.env.NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL?.trim() ||
    VOLTA_REDONDA_CANONICAL_PMTILES_URL;
  const styleUrl =
    process.env.NEXT_PUBLIC_VOLTA_REDONDA_MAP_STYLE_URL?.trim() ||
    "/maps/volta-redonda/style.json";
  return {
    id: "realVoltaRedonda",
    kind: "pmtiles",
    enabled: true,
    attribution: "© OpenStreetMap contributors · limite municipal: IBGE",
    cachePolicy:
      "PMTiles público com HTTP Range; artefato versionado por hash e cache imutável.",
    style: { background: "#ecebe5", styleUrl, pmtilesUrl },
    fallback: "neutral-grid-and-list",
    center: VOLTA_REDONDA_MAP.center,
    bounds: VOLTA_REDONDA_MAP.bounds,
    minZoom: 10,
    maxZoom: 18,
  };
}

/** Compatibilidade temporária para consumidores da Sprint 38. */
export const realBasemapProvider = getRealVoltaRedondaProvider();

export function resolveSidewalkBasemapProvider(
  requested = process.env.NEXT_PUBLIC_SIDEWALK_BASEMAP_PROVIDER,
) {
  if (requested === "localSynthetic") return localSynthetic;
  return getRealVoltaRedondaProvider();
}
