/**
 * Public tasks on followed pautas are not proof of an accepted assignment.
 * Only explicitly active member task assignments may be called commitments.
 * This is a read-only presentation contract, not an authorization check.
 */
export const COMUN_MY_AREA_TASKS_PER_GROUP = 6;

export function groupComunMyAreaTasks<
  PautaTask extends { id: string },
  ActionAssignment extends { id: string },
>(publicPautaTasks: readonly PautaTask[], activeAssignments: readonly ActionAssignment[]) {
  return {
    commitments: activeAssignments.slice(0, COMUN_MY_AREA_TASKS_PER_GROUP),
    followedPautaTasks: publicPautaTasks.slice(0, COMUN_MY_AREA_TASKS_PER_GROUP),
    hasCommitments: activeAssignments.length > 0,
    hasFollowedPautaTasks: publicPautaTasks.length > 0,
  };
}

export function comunFollowedPautaHref(slug: unknown): string | null {
  if (
    typeof slug !== "string" ||
    slug.length > 96 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    return null;
  return `/comun/pautas/${slug}`;
}

export function comunPublicPautaTaskStatus(value: unknown): string {
  switch (value) {
    case "open":
      return "Aberta na pauta";
    case "in_progress":
      return "Em andamento na pauta";
    case "blocked":
      return "Bloqueada na pauta";
    default:
      return "Situação a verificar na pauta";
  }
}
