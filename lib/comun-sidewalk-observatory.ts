import {
  SIDEWALK_CONDITIONS,
  SIDEWALK_PROBLEMS,
  type SidewalkCondition,
  type SidewalkProblem,
} from "./comun-sidewalk-p4-contract";
import type { PublicObservation } from "./comun-observatory";

export type SidewalkCoverageState =
  | "complete_for_public_projection"
  | "partial_due_to_safety_cap";

export const SIDEWALK_CONDITION_LABELS: Record<
  SidewalkCondition | "unknown",
  string
> = {
  good: "Boa",
  regular: "Regular",
  bad: "Ruim",
  terrible: "Muito ruim",
  unknown: "Sem classificação",
};

export const SIDEWALK_PROBLEM_LABELS: Record<SidewalkProblem, string> = {
  hole: "Buraco",
  irregular: "Irregular",
  no_ramp: "Sem rampa",
  obstacle: "Obstáculo",
  narrow: "Estreita",
  no_sidewalk: "Sem calçada",
};

export type SidewalkObservatoryIndicators = {
  reviewedPointCount: number;
  conditionCounts: Record<SidewalkCondition | "unknown", number>;
  problemCounts: Record<SidewalkProblem, number>;
  recent30d: number;
  recent90d: number;
  coverageState: SidewalkCoverageState;
};

export type SidewalkObservatoryFilters = {
  condition: SidewalkCondition | "unknown" | null;
  problem: SidewalkProblem | null;
  period: "30d" | "90d" | null;
};

const conditionQueryValues: Record<
  Exclude<SidewalkObservatoryFilters["condition"], null>,
  string
> = {
  good: "boa",
  regular: "regular",
  bad: "ruim",
  terrible: "muito-ruim",
  unknown: "sem-classificacao",
};
const problemQueryValues: Record<SidewalkProblem, string> = {
  hole: "buraco",
  irregular: "irregular",
  no_ramp: "sem-rampa",
  obstacle: "obstaculo",
  narrow: "estreita",
  no_sidewalk: "sem-calcada",
};

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function parseSidewalkObservatoryFilters(
  values: Record<string, string | string[] | undefined>,
): SidewalkObservatoryFilters {
  const conditionValue = single(values.condicao);
  const problemValue = single(values.problema);
  const periodValue = single(values.periodo);
  const condition =
    (Object.entries(conditionQueryValues).find(
      ([, queryValue]) => queryValue === conditionValue,
    )?.[0] as SidewalkObservatoryFilters["condition"]) ?? null;
  const problem =
    (Object.entries(problemQueryValues).find(
      ([, queryValue]) => queryValue === problemValue,
    )?.[0] as SidewalkProblem | undefined) ?? null;
  const period = periodValue === "30d" || periodValue === "90d" ? periodValue : null;
  return { condition, problem, period };
}

export function sidewalkObservatoryFiltersToQuery(
  filters: SidewalkObservatoryFilters,
) {
  const query = new URLSearchParams();
  if (filters.condition) {
    query.set("condicao", conditionQueryValues[filters.condition]);
  }
  if (filters.problem) query.set("problema", problemQueryValues[filters.problem]);
  if (filters.period) query.set("periodo", filters.period);
  return query;
}

export function isValidPublicObservationDate(value: string | null) {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

export function deriveSidewalkObservatoryIndicators(
  observations: readonly PublicObservation[],
  coverageState: SidewalkCoverageState = "complete_for_public_projection",
  now = Date.now(),
): SidewalkObservatoryIndicators {
  const conditionCounts: SidewalkObservatoryIndicators["conditionCounts"] = {
    good: 0,
    regular: 0,
    bad: 0,
    terrible: 0,
    unknown: 0,
  };
  const problemCounts = Object.fromEntries(
    SIDEWALK_PROBLEMS.map((problem) => [problem, 0]),
  ) as SidewalkObservatoryIndicators["problemCounts"];
  let recent30d = 0;
  let recent90d = 0;

  for (const observation of observations) {
    conditionCounts[observation.attributes.condition] += 1;
    for (const problem of observation.attributes.problems) {
      problemCounts[problem] += 1;
    }
    const observedAt = observation.period.observedAt;
    if (!isValidPublicObservationDate(observedAt)) continue;
    const observedTime = Date.parse(observedAt!);
    const age = now - observedTime;
    if (age < 0) continue;
    if (age <= 30 * 24 * 60 * 60 * 1000) recent30d += 1;
    if (age <= 90 * 24 * 60 * 60 * 1000) recent90d += 1;
  }

  return {
    reviewedPointCount: observations.length,
    conditionCounts,
    problemCounts,
    recent30d,
    recent90d,
    coverageState,
  };
}

export function filterSidewalkObservatoryObservations(
  observations: readonly PublicObservation[],
  filters: SidewalkObservatoryFilters,
  now = Date.now(),
) {
  return observations.filter((observation) => {
    if (
      filters.condition &&
      observation.attributes.condition !== filters.condition
    ) {
      return false;
    }
    if (
      filters.problem &&
      !observation.attributes.problems.includes(filters.problem)
    ) {
      return false;
    }
    if (filters.period) {
      const observedAt = observation.period.observedAt;
      if (!isValidPublicObservationDate(observedAt)) return false;
      const observedTime = Date.parse(observedAt!);
      const age = now - observedTime;
      const maximumDays = filters.period === "30d" ? 30 : 90;
      if (age < 0 || age > maximumDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });
}

export function presentSidewalkProblemFacets(
  indicators: SidewalkObservatoryIndicators,
) {
  return SIDEWALK_PROBLEMS.filter((problem) => indicators.problemCounts[problem] > 0).map(
    (problem) => ({
      value: problem,
      label: SIDEWALK_PROBLEM_LABELS[problem],
      count: indicators.problemCounts[problem],
    }),
  );
}

export function presentSidewalkConditionFacets(
  indicators: SidewalkObservatoryIndicators,
) {
  return [...SIDEWALK_CONDITIONS, "unknown" as const].map((condition) => ({
    value: condition,
    label: SIDEWALK_CONDITION_LABELS[condition],
    count: indicators.conditionCounts[condition],
  }));
}
