import { describe, expect, it } from "vitest";
import {
  SIDEWALK_OBSERVATORY_PAGE_SIZE,
  SIDEWALK_OBSERVATORY_SAFETY_CAP,
  adaptSidewalkReviewedProjection,
  loadSidewalkReviewedProjectionPages,
} from "./comun-observatory-sidewalk-adapter";

const privateSentinels = {
  originalText: "PRIVATE_SIDEWALK_TEXT_SENTINEL",
  location: "PRIVATE_EXACT_LOCATION_SENTINEL",
  attachment: "PRIVATE_ATTACHMENT_SENTINEL",
  wallet: "PRIVATE_WALLET_SENTINEL",
};

function row(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    public_geometry_geojson: { type: "Point", coordinates: [-44.1, -22.5] },
    categories: ["hole", "obstacle"],
    condition: "bad",
    last_observed_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("sidewalk reviewed projection adapter", () => {
  it("only emits reviewed public geometry and allowlisted structured fields", () => {
    const result = adaptSidewalkReviewedProjection([
      {
        ...row("trecho-revisado"),
        ...privateSentinels,
      } as never,
      row("sem-geometria-publica", {
        public_geometry_geojson: { type: "Point", coordinates: [999, 0] },
      }),
    ]);
    expect(result.observations).toHaveLength(1);
    expect(result.available).toBe(true);
    expect(result.observations[0]).toMatchObject({
      id: "sidewalk:trecho-revisado",
      observatoryId: "sidewalks",
      kind: "sidewalk_condition",
      attributes: { condition: "bad", problems: ["hole", "obstacle"] },
      geography: { level: "reviewed_public_point" },
    });
    const payload = JSON.stringify(result);
    Object.values(privateSentinels).forEach((sentinel) =>
      expect(payload).not.toContain(sentinel),
    );
  });

  it("defensively rejects explicit fixtures outside the P4 reviewed-public gate", () => {
    const invalid = [
      row("private", { visibility: "private" }),
      row("pending", { status: "pending_review" }),
      row("verified-not-published", { status: "draft" }),
      row("published-not-public", { visibility: "internal" }),
      row("exact", { public_location_level: "exact" }),
      row("exact-precision", { location_precision: "exact" }),
      row("non-editorial", { location_source: "user" }),
      row("not-verified", { verification_status: "pending" }),
    ];
    expect(adaptSidewalkReviewedProjection(invalid).observations).toHaveLength(0);

    const eligible = row("eligible", {
      visibility: "public",
      status: "published",
      verification_status: "verified",
      public_location_level: "approximate",
      location_precision: "approximate",
      location_source: "editorial",
    });
    expect(adaptSidewalkReviewedProjection([eligible]).observations).toHaveLength(1);
  });

  it("ignores unknown enums without reflecting arbitrary database strings", () => {
    const unknownCondition = "PRIVATE_UNKNOWN_CONDITION_SENTINEL";
    const unknownProblem = "PRIVATE_UNKNOWN_PROBLEM_SENTINEL";
    const result = adaptSidewalkReviewedProjection([
      row("unknown-enums", {
        condition: unknownCondition,
        categories: ["hole", unknownProblem],
      }),
    ]);
    expect(result.observations[0].attributes).toEqual({
      condition: "unknown",
      problems: ["hole"],
    });
    expect(result.qualityDiagnostics).toEqual(
      expect.arrayContaining([
        { code: "unknown_condition_ignored", count: 1 },
        { code: "unknown_problem_ignored", count: 1 },
      ]),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(unknownCondition);
    expect(serialized).not.toContain(unknownProblem);
  });

  it("sanitizes invalid observation dates and keeps undated points after dated ones", () => {
    const result = adaptSidewalkReviewedProjection([
      row("undated", { last_observed_at: "not-a-date" }),
      row("recent", { last_observed_at: "2026-08-10T00:00:00.000Z" }),
      row("older", { last_observed_at: "2026-07-01T00:00:00.000Z" }),
    ]);
    expect(result.observations.map((item) => item.id)).toEqual([
      "sidewalk:recent",
      "sidewalk:older",
      "sidewalk:undated",
    ]);
    expect(result.observations[2].period.observedAt).toBeNull();
    expect(result.qualityDiagnostics).toContainEqual({
      code: "invalid_observed_at_ignored",
      count: 1,
    });
  });

  it("loads sequential bounded pages until the public projection is complete", async () => {
    const calls: Array<[number, number]> = [];
    const rows = Array.from({ length: SIDEWALK_OBSERVATORY_PAGE_SIZE + 3 }, (_, index) =>
      row(`point-${index}`),
    );
    const result = await loadSidewalkReviewedProjectionPages(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(result.available).toBe(true);
    expect(result.coverageState).toBe("complete_for_public_projection");
    expect(result.observations).toHaveLength(SIDEWALK_OBSERVATORY_PAGE_SIZE + 3);
    expect(calls).toEqual([
      [0, 249],
      [250, 499],
    ]);
  });

  it("marks coverage partial when the defensive safety cap is reached", async () => {
    const result = await loadSidewalkReviewedProjectionPages(async (from, to) => ({
      data: Array.from({ length: to - from + 1 }, (_, index) =>
        row(`point-${from + index}`),
      ),
      error: null,
    }));
    expect(result.available).toBe(true);
    expect(result.coverageState).toBe("partial_due_to_safety_cap");
    expect(result.observations).toHaveLength(SIDEWALK_OBSERVATORY_SAFETY_CAP);
    expect(result.source.qualityState).toBe("partial");
  });

  it("distinguishes source unavailable from an available empty projection", async () => {
    const unavailable = await loadSidewalkReviewedProjectionPages(async () => ({
      data: null,
      error: new Error("synthetic source failure"),
    }));
    expect(unavailable.available).toBe(false);
    expect(unavailable.observations).toEqual([]);

    const empty = await loadSidewalkReviewedProjectionPages(async () => ({
      data: [],
      error: null,
    }));
    expect(empty.available).toBe(true);
    expect(empty.observations).toEqual([]);
    expect(empty.coverageState).toBe("complete_for_public_projection");
  });

  it("keeps the database query on the exact P4 public gate and bounded pagination", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./comun-observatory-sidewalk-adapter.ts", import.meta.url),
        "utf8",
      ),
    );
    expect(source).not.toMatch(
      /comun_relata_|participation_wallet|forwarding_packages|private_geometry_geojson|original_text|attachments/i,
    );
    expect(source).toContain('.eq("visibility", "public")');
    expect(source).toContain('.eq("status", "published")');
    expect(source).toContain('.eq("verification_status", "verified")');
    expect(source).toContain('.eq("public_location_level", "approximate")');
    expect(source).toContain('.eq("location_precision", "approximate")');
    expect(source).toContain('.eq("location_source", "editorial")');
    expect(source).toContain('.not("public_geometry_geojson", "is", null)');
    expect(source).toContain(".range(from, to)");
    expect(source).toContain("SIDEWALK_OBSERVATORY_SAFETY_CAP = 5000");
  });
});
