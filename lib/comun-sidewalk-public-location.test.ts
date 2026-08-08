import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sanitizeSidewalkPointForPublic } from "./comun-sidewalk-public-location";

describe("sanitizeSidewalkPointForPublic", () => {
  it("is deterministic, approximate and never returns the exact input", () => {
    const exact = { longitude: -44.1042, latitude: -22.5202 };
    const first = sanitizeSidewalkPointForPublic(exact);
    const second = sanitizeSidewalkPointForPublic(exact);
    expect(first).toEqual(second);
    expect(first.coordinates).not.toEqual([exact.longitude, exact.latitude]);
    expect(first).toEqual({
      type: "Point",
      coordinates: expect.arrayContaining([expect.any(Number), expect.any(Number)]),
    });
  });

  it("does not attach properties or private metadata", () => {
    expect(Object.keys(sanitizeSidewalkPointForPublic({ longitude: -44.1, latitude: -22.52 }))).toEqual([
      "type",
      "coordinates",
    ]);
  });
});
