import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createMetadataCleanSidewalkDerivative } from "./sidewalk-photos";

describe("derivada pública de calçada", () => {
  it("remove EXIF, GPS e orientação do original", async () => {
    const original = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#777777" },
    })
      .withMetadata({
        orientation: 6,
        exif: {
          IFD0: { Artist: "Pessoa privada" },
          IFD3: { GPSLatitudeRef: "S", GPSLongitudeRef: "W" },
        },
      })
      .jpeg()
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const derivative = await createMetadataCleanSidewalkDerivative(original);
    const metadata = await sharp(derivative).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });
});
