import {
  isComunCompetencyEligibleForMatching,
  type ComunCompetencyClaim,
  type ComunCompetencyEvidence,
} from "./comun-competency-evidence";

export const COMUN_COMPETENCY_TASK_SUGGESTIONS_VERSION =
  "comun-competency-task-suggestions-v0" as const;

export type ComunTaskSuggestionState =
  | "draft"
  | "open"
  | "in_progress"
  | "done"
  | "cancelled"
  | "archived";

export type ComunTaskSuggestionEffort =
  | "small"
  | "medium"
  | "collective";

export type ComunTaskSuggestionMode =
  | "remote"
  | "in_person"
  | "hybrid";

export type ComunCanonicalTaskCandidate = {
  readonly id: string;
  readonly actionId: string;
  readonly title: string;
  readonly description: string;
  readonly state: ComunTaskSuggestionState;
  readonly dueAt: string | null;
  readonly desiredCount: number;
  readonly activeCount: number;
  readonly effortLevel: ComunTaskSuggestionEffort;
  readonly participationMode: ComunTaskSuggestionMode;
};

export type ComunTaskCapabilityRequirement = {
  readonly taskId: string;
  readonly requiredCompetencyIds: readonly string[];
  readonly optionalCompetencyIds: readonly string[];
};

export type ComunSuggestedTask = {
  readonly taskId: string;
  readonly actionId: string;
  readonly title: string;
  readonly description: string;
  readonly dueAt: string | null;
  readonly effortLevel: ComunTaskSuggestionEffort;
  readonly participationMode: ComunTaskSuggestionMode;
  readonly matchedRequiredCompetencyIds: readonly string[];
  readonly matchedOptionalCompetencyIds: readonly string[];
  readonly remainingCapacity: number;
};

function isTaskAvailable(
  task: ComunCanonicalTaskCandidate,
  now: Date,
) {
  if (!["open", "in_progress"].includes(task.state)) return false;
  if (task.activeCount >= task.desiredCount) return false;
  if (!task.dueAt) return true;
  const due = new Date(task.dueAt);
  return Number.isFinite(due.getTime()) && due.getTime() >= now.getTime();
}

function dueTime(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function suggestComunTasksByCompetency(input: {
  readonly claims: readonly ComunCompetencyClaim[];
  readonly evidence: readonly ComunCompetencyEvidence[];
  readonly tasks: readonly ComunCanonicalTaskCandidate[];
  readonly requirements: readonly ComunTaskCapabilityRequirement[];
  readonly eligibleActionIds: readonly string[];
  readonly now?: Date;
}): readonly ComunSuggestedTask[] {
  const now = input.now ?? new Date();
  const eligibleActions = new Set(input.eligibleActionIds);
  const eligibleCompetencies = new Set(
    input.claims
      .filter((claim) =>
        isComunCompetencyEligibleForMatching(
          claim,
          input.evidence,
          now,
        ),
      )
      .map((claim) => claim.competencyId),
  );
  const requirementByTask = new Map(
    input.requirements.map((requirement) => [
      requirement.taskId,
      requirement,
    ]),
  );

  return input.tasks
    .flatMap((task): ComunSuggestedTask[] => {
      if (!eligibleActions.has(task.actionId)) return [];
      if (!isTaskAvailable(task, now)) return [];

      const requirement = requirementByTask.get(task.id);
      if (!requirement) return [];

      const required = [...new Set(requirement.requiredCompetencyIds)];
      const optional = [...new Set(requirement.optionalCompetencyIds)];
      if (!required.length) return [];

      const hasAllRequired = required.every((id) =>
        eligibleCompetencies.has(id),
      );
      if (!hasAllRequired) return [];

      const matchedOptional = optional.filter((id) =>
        eligibleCompetencies.has(id),
      );

      return [
        {
          taskId: task.id,
          actionId: task.actionId,
          title: task.title,
          description: task.description,
          dueAt: task.dueAt,
          effortLevel: task.effortLevel,
          participationMode: task.participationMode,
          matchedRequiredCompetencyIds: required,
          matchedOptionalCompetencyIds: matchedOptional,
          remainingCapacity: task.desiredCount - task.activeCount,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.matchedOptionalCompetencyIds.length -
          a.matchedOptionalCompetencyIds.length ||
        dueTime(a.dueAt) - dueTime(b.dueAt) ||
        a.title.localeCompare(b.title, "pt-BR"),
    );
}
