import type {
  ComunFactoryDisposition,
  ComunFactoryRiskClass,
} from "./comun-factory-pilot-contract";

export const COMUN_FACTORY_PILOT_EVALUATION_VERSION =
  "comun-factory-pilot-evaluation-v0" as const;

export type ComunFactoryPilotEvaluationCase = {
  readonly code: string;
  readonly started: boolean;
  readonly resolved: boolean;
  readonly disposition: ComunFactoryDisposition;
  readonly riskClass: ComunFactoryRiskClass;
  readonly hadRevision: boolean;
  readonly hasCostRecord: boolean;
  readonly hasVersionRecord: boolean;
  readonly hasOpenProject: boolean;
  readonly reusedByAnotherCase: boolean;
  readonly tags: readonly (
    | "internal"
    | "repair"
    | "environment"
    | "accessibility"
    | "school"
    | "territory"
    | "community"
    | "open_project"
  )[];
};

export type ComunFactoryPilotEvaluationInput = {
  readonly cases: readonly ComunFactoryPilotEvaluationCase[];
  readonly autonomousOperators: number;
  readonly peopleInTraining: number;
  readonly institutionsServed: number;
};

export type ComunFactoryPilotGate =
  | "D1_MINIMUM"
  | "FC_MVP_25";

export type ComunFactoryPilotFinding =
  | "cases_started_below_10"
  | "cases_resolved_below_5"
  | "no_do_not_fabricate_case"
  | "no_revision_case"
  | "cost_records_incomplete"
  | "version_records_incomplete"
  | "cases_started_below_25"
  | "cases_resolved_below_15"
  | "open_projects_below_5"
  | "operators_below_3"
  | "people_in_training_below_5"
  | "no_school_case"
  | "no_accessibility_case"
  | "no_environment_case"
  | "no_reused_solution";

export type ComunFactoryPilotEvaluation = {
  readonly gate: ComunFactoryPilotGate;
  readonly passed: boolean;
  readonly findings: readonly ComunFactoryPilotFinding[];
  readonly metrics: {
    readonly started: number;
    readonly resolved: number;
    readonly openProjects: number;
    readonly reusedSolutions: number;
    readonly autonomousOperators: number;
    readonly peopleInTraining: number;
    readonly institutionsServed: number;
  };
};

function hasTag(
  cases: readonly ComunFactoryPilotEvaluationCase[],
  tag: ComunFactoryPilotEvaluationCase["tags"][number],
) {
  return cases.some((item) => item.tags.includes(tag));
}

export function evaluateComunFactoryPilot(
  input: ComunFactoryPilotEvaluationInput,
  gate: ComunFactoryPilotGate,
): ComunFactoryPilotEvaluation {
  const cases = input.cases;
  const startedCases = cases.filter((item) => item.started);
  const resolvedCases = cases.filter((item) => item.resolved);
  const metrics = {
    started: startedCases.length,
    resolved: resolvedCases.length,
    openProjects: cases.filter((item) => item.hasOpenProject).length,
    reusedSolutions: cases.filter((item) => item.reusedByAnotherCase).length,
    autonomousOperators: Math.max(0, input.autonomousOperators),
    peopleInTraining: Math.max(0, input.peopleInTraining),
    institutionsServed: Math.max(0, input.institutionsServed),
  };

  const findings: ComunFactoryPilotFinding[] = [];

  if (metrics.started < 10) findings.push("cases_started_below_10");
  if (metrics.resolved < 5) findings.push("cases_resolved_below_5");
  if (!cases.some((item) => item.disposition === "do_not_fabricate"))
    findings.push("no_do_not_fabricate_case");
  if (!cases.some((item) => item.hadRevision))
    findings.push("no_revision_case");
  if (
    startedCases.some((item) => !item.hasCostRecord)
  )
    findings.push("cost_records_incomplete");
  if (
    startedCases.some((item) => !item.hasVersionRecord)
  )
    findings.push("version_records_incomplete");

  if (gate === "FC_MVP_25") {
    if (metrics.started < 25) findings.push("cases_started_below_25");
    if (metrics.resolved < 15) findings.push("cases_resolved_below_15");
    if (metrics.openProjects < 5) findings.push("open_projects_below_5");
    if (metrics.autonomousOperators < 3) findings.push("operators_below_3");
    if (metrics.peopleInTraining < 5)
      findings.push("people_in_training_below_5");
    if (!hasTag(cases, "school")) findings.push("no_school_case");
    if (!hasTag(cases, "accessibility"))
      findings.push("no_accessibility_case");
    if (!hasTag(cases, "environment")) findings.push("no_environment_case");
    if (metrics.reusedSolutions < 1) findings.push("no_reused_solution");
  }

  return {
    gate,
    passed: findings.length === 0,
    findings,
    metrics,
  };
}
