import type { StyleSpecification } from "maplibre-gl";
import type { SidewalkBasemapProvider } from "./sidewalk-basemap-provider";

export const SIDEWALK_REAL_ROAD_LAYER_ID = "roads";

export function createSidewalkMapLibreStyle(
  provider: SidewalkBasemapProvider,
): StyleSpecification {
  if (!provider.style.pmtilesUrl)
    throw new Error("SIDEWALK_PMTILES_URL_REQUIRED");
  return {
    version: 8,
    sources: {
      comun: {
        type: "vector",
        url: `pmtiles://${provider.style.pmtilesUrl}`,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#ecebe5" },
      },
      {
        id: "water",
        type: "fill",
        source: "comun",
        "source-layer": "osm",
        filter: ["any", ["has", "water"], ["==", ["get", "natural"], "water"]],
        paint: { "fill-color": "#9fcbd3" },
      },
      {
        id: "buildings",
        type: "fill",
        source: "comun",
        "source-layer": "osm",
        filter: ["has", "building"],
        minzoom: 14,
        paint: {
          "fill-color": "#d4d0c5",
          "fill-outline-color": "#aaa59a",
        },
      },
      {
        id: SIDEWALK_REAL_ROAD_LAYER_ID,
        type: "line",
        source: "comun",
        "source-layer": "osm",
        filter: ["any", ["has", "highway"], ["has", "railway"]],
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 17, 7],
        },
      },
      {
        id: "road-labels",
        type: "symbol",
        source: "comun",
        "source-layer": "osm",
        filter: [
          "all",
          ["has", "name"],
          ["any", ["has", "highway"], ["has", "railway"]],
        ],
        layout: {
          "text-field": ["coalesce", ["get", "name"], ""],
          "text-size": 12,
        },
      },
      {
        id: "municipal-boundary",
        type: "line",
        source: "comun",
        "source-layer": "boundary",
        paint: {
          "line-color": "#26352a",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      },
    ],
  };
}
