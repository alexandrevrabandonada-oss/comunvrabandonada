import { describe, expect, it } from "vitest";
import { getRealVoltaRedondaProvider } from "./sidewalk-basemap-provider";
import {
  createSidewalkMapLibreStyle,
  SIDEWALK_REAL_ROAD_LAYER_ID,
} from "./sidewalk-maplibre-style";

describe("sidewalk MapLibre style", () => {
  it("binds the canonical PMTiles source to a real road layer", () => {
    const style = createSidewalkMapLibreStyle(getRealVoltaRedondaProvider());
    expect(style.sources.comun).toMatchObject({
      type: "vector",
      url: "pmtiles:///maps/volta-redonda/volta-redonda.pmtiles",
    });
    expect(
      style.layers.some(
        (layer) =>
          layer.id === SIDEWALK_REAL_ROAD_LAYER_ID &&
          layer.type === "line" &&
          "source-layer" in layer &&
          layer["source-layer"] === "osm",
      ),
    ).toBe(true);
  });
});
