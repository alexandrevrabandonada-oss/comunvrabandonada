import { describe, expect, it } from "vitest";
import type { PublicObservation } from "./comun-observatory";
import {
  deriveSidewalkObservatoryIndicators,
  filterSidewalkObservatoryObservations,
  parseSidewalkObservatoryFilters,
  presentSidewalkProblemFacets,
  sidewalkObservatoryFiltersToQuery,
} from "./comun-sidewalk-observatory";

function observation(
  id: string,
  input: Partial<{
    condition: PublicObservation["attributes"]["condition"];
    problems: PublicObservation["attributes"]["problems"];
    observedAt: string | null;
  }> = {},
): PublicObservation {
  return {
    id: `sidewalk:${id}`,
    observatoryId: "sidewalks",
    kind: "sidewalk_condition",
    label: "Condição revisada",
    value: input.problems?.length ?? 0,
    unit: "problemas estruturados",
    attributes: {
      condition: input.condition ?? "regular",
      problems: input.problems ?? [],
    },
    period: {
      observedAt: input.observedAt ?? "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
    geography: {
      level: "reviewed_public_point",
      geometry: { type: "Point", coordinates: [-44.1, -22.5] },
    },
    source: {
      id: "sidewalk-reviewed-projection-v1",
      sourceKind: "reviewed_community_projection",
      sourceReference: "P4 reviewed-public-projection",
      sourceUrl: "/comun/calcadas",
      publisher: "COMUN",
    },
    quality: "reviewed_community",
    freshness: "current",
    methodologyVersion: "test",
  };
}

describe("sidewalk observatory indicators", () => {
  it("derives reviewed count and condition distribution with unknown explicit", () => {
    const indicators = deriveSidewalkObservatoryIndicators([
      observation("a", { condition: "good" }),
      observation("b", { condition: "bad" }),
      observation("c", { condition: "bad" }),
      observation("d", { condition: "unknown" }),
    ]);
    expect(indicators.reviewedPointCount).toBe(4);
    expect(indicators.conditionCounts).toEqual({
      good: 1,
      regular: 0,
      bad: 2,
      terrible: 0,
      unknown: 1,
    });
  });

  it("counts structured problems independently because one point can contain several", () => {
    const indicators = deriveSidewalkObservatoryIndicators([
      observation("a", { problems: ["hole", "obstacle"] }),
      observation("b", { problems: ["hole"] }),
    ]);
    expect(indicators.reviewedPointCount).toBe(2);
    expect(indicators.problemCounts.hole).toBe(2);
    expect(indicators.problemCounts.obstacle).toBe(1);
    expect(
      Object.values(indicators.problemCounts).reduce((total, count) => total + count, 0),
    ).toBe(3);
  });

  it("only exposes problem facets that are present", () => {
    const indicators = deriveSidewalkObservatoryIndicators([
      observation("a", { problems: ["no_ramp"] }),
    ]);
    expect(presentSidewalkProblemFacets(indicators)).toEqual([
      { value: "no_ramp", label: "Sem rampa", count: 1 },
    ]);
  });

  it("uses last_observed_at semantics for 30d and 90d and ignores invalid dates", () => {
    const now = Date.UTC(2026, 7, 11);
    const indicators = deriveSidewalkObservatoryIndicators(
      [
        observation("10d", { observedAt: "2026-08-01T00:00:00.000Z" }),
        observation("45d", { observedAt: "2026-06-27T00:00:00.000Z" }),
        observation("old", { observedAt: "2026-04-01T00:00:00.000Z" }),
        observation("invalid", { observedAt: "invalid" }),
        observation("future", { observedAt: "2026-08-20T00:00:00.000Z" }),
      ],
      "complete_for_public_projection",
      now,
    );
    expect(indicators.recent30d).toBe(1);
    expect(indicators.recent90d).toBe(2);
  });

  it("carries the defensive coverage state without inventing a full total", () => {
    const indicators = deriveSidewalkObservatoryIndicators(
      [observation("a")],
      "partial_due_to_safety_cap",
    );
    expect(indicators.coverageState).toBe("partial_due_to_safety_cap");
  });
});

describe("sidewalk observatory URL filters", () => {
  it("accepts only public allowlisted query values", () => {
    expect(
      parseSidewalkObservatoryFilters({
        condicao: "ruim",
        problema: "buraco",
        periodo: "90d",
      }),
    ).toEqual({ condition: "bad", problem: "hole", period: "90d" });

    expect(
      parseSidewalkObservatoryFilters({
        condicao: "private_condition",
        problema: "PRIVATE_PROBLEM_SENTINEL",
        periodo: "365d",
        bairro: "Centro",
      }),
    ).toEqual({ condition: null, problem: null, period: null });
  });

  it("serializes only the canonical public query vocabulary", () => {
    expect(
      sidewalkObservatoryFiltersToQuery({
        condition: "terrible",
        problem: "no_sidewalk",
        period: "30d",
      }).toString(),
    ).toBe("condicao=muito-ruim&problema=sem-calcada&periodo=30d");
  });

  it("keeps map/list/counter filtering on one shared selection function", () => {
    const now = Date.UTC(2026, 7, 11);
    const observations = [
      observation("match", {
        condition: "bad",
        problems: ["hole"],
        observedAt: "2026-08-05T00:00:00.000Z",
      }),
      observation("condition-only", {
        condition: "bad",
        problems: ["obstacle"],
        observedAt: "2026-08-05T00:00:00.000Z",
      }),
      observation("too-old", {
        condition: "bad",
        problems: ["hole"],
        observedAt: "2026-01-01T00:00:00.000Z",
      }),
    ];
    const visible = filterSidewalkObservatoryObservations(
      observations,
      { condition: "bad", problem: "hole", period: "30d" },
      now,
    );
    expect(visible.map((item) => item.id)).toEqual(["sidewalk:match"]);
    expect(deriveSidewalkObservatoryIndicators(visible).reviewedPointCount).toBe(1);
  });
});
