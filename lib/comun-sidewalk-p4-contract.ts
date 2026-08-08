export const SIDEWALK_CONDITIONS = ["good", "regular", "bad", "terrible"] as const;
export const SIDEWALK_PROBLEMS = [
  "hole",
  "irregular",
  "no_ramp",
  "obstacle",
  "narrow",
  "no_sidewalk",
] as const;
export const SIDEWALK_AFFECTED_GROUPS = [
  "wheelchair_users",
  "visual_impairment",
  "older_people",
  "children",
  "strollers",
  "temporary_mobility",
  "general_circulation",
] as const;

export type SidewalkCondition = (typeof SIDEWALK_CONDITIONS)[number];
export type SidewalkProblem = (typeof SIDEWALK_PROBLEMS)[number];
export type SidewalkAffectedGroup = (typeof SIDEWALK_AFFECTED_GROUPS)[number];

const CONDITION_LABELS: Record<SidewalkCondition, string> = {
  good: "boa",
  regular: "regular",
  bad: "ruim",
  terrible: "péssima",
};
const PROBLEM_LABELS: Record<SidewalkProblem, string> = {
  hole: "buraco",
  irregular: "piso irregular",
  no_ramp: "ausência de rampa",
  obstacle: "obstáculo",
  narrow: "calçada estreita",
  no_sidewalk: "ausência de calçada",
};

export function buildCanonicalSidewalkRelataText(input: {
  condition: SidewalkCondition;
  problems: SidewalkProblem[];
  description?: string;
}) {
  const parts = [
    "Problema de acessibilidade em calçada.",
    `Condição: ${CONDITION_LABELS[input.condition]}.`,
    `Problemas observados: ${input.problems.map((item) => PROBLEM_LABELS[item]).join(", ")}.`,
  ];
  const description = input.description?.trim();
  if (description) parts.push(`Descrição: ${description}`);
  return parts.join(" ").slice(0, 600);
}

export function isUniqueAllowlisted<T extends string>(
  value: unknown,
  allowed: readonly T[],
  maximum: number,
): value is T[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= maximum &&
    new Set(value).size === value.length &&
    value.every((item) => typeof item === "string" && allowed.includes(item as T))
  );
}
