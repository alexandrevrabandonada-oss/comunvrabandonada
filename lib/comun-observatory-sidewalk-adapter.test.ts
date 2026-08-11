import { describe, expect, it } from "vitest";
import { adaptSidewalkReviewedProjection } from "./comun-observatory-sidewalk-adapter";

const privateSentinels = {
  originalText: "PRIVATE_OBSERVATORY_SENTINEL_TEXT",
  location: "PRIVATE_OBSERVATORY_SENTINEL_LOCATION",
  attachment: "PRIVATE_OBSERVATORY_SENTINEL_ATTACHMENT",
  wallet: "PRIVATE_OBSERVATORY_SENTINEL_WALLET",
};

describe("sidewalk reviewed projection adapter", () => {
  it("only emits reviewed public geometry and structured fields", () => {
    const result = adaptSidewalkReviewedProjection([
      {
        slug: "trecho-revisado",
        public_geometry_geojson: { type: "Point", coordinates: [-44.1, -22.5] },
        categories: ["hole", "obstacle"],
        condition: "bad",
        last_observed_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-02T00:00:00.000Z",
        ...privateSentinels,
      } as never,
      {
        slug: "sem-geometria-publica",
        public_geometry_geojson: { type: "Point", coordinates: [999, 0] },
        categories: ["hole"],
        condition: "bad",
        last_observed_at: null,
        updated_at: null,
      },
    ]);
    expect(result.observations).toHaveLength(1);
    expect(result.available).toBe(true);
    expect(result.observations[0]).toMatchObject({
      id: "sidewalk:trecho-revisado",
      observatoryId: "sidewalks",
      geography: { level: "reviewed_public_point" },
    });
    const payload = JSON.stringify(result);
    Object.values(privateSentinels).forEach((sentinel) =>
      expect(payload).not.toContain(sentinel),
    );
  });

  it("does not admit private, pending, withdrawn, or exact geometry fields into its query contract", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./comun-observatory-sidewalk-adapter.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toMatch(/comun_relata_|participation_wallet|forwarding_packages|private_geometry_geojson|original_text/i);
    expect(source).toContain('.eq("status", "published")');
    expect(source).toContain('.eq("verification_status", "verified")');
    expect(source).toContain('.eq("visibility", "public")');
  });
});
