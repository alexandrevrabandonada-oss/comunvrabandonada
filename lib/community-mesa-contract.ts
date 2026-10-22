/**
 * SOC-D10.M3 — contrato puro de leitura, sem direitos organizativos novos.
 * Um papel comunitário não comprova filiação a um núcleo.
 */
export function canReadMesaPilot(input: {
  membershipState: string | null | undefined;
  roles: readonly string[];
}) {
  return (
    input.membershipState === "member" &&
    input.roles.some((role) => role === "coordinator" || role === "facilitator")
  );
}

export type MesaOwnTask = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  actionTitle: string;
  actionSlug: string;
};

type RawAssignment = {
  id: string;
  member_user_id: string;
  status: string;
  task?: {
    title: string;
    description: string;
    due_at: string | null;
    state: string;
    action?: {
      community_id: string | null;
      slug: string;
      title: string;
      visibility: string;
      status: string;
    } | null;
  } | null;
};

/** Defesa adicional além do filtro de identidade aplicado na consulta. */
export function ownPublicMesaTasks(
  rows: readonly RawAssignment[],
  userId: string,
  communityId: string,
): MesaOwnTask[] {
  return rows.flatMap((row) => {
    const task = row.task;
    const action = task?.action;
    if (
      row.member_user_id !== userId ||
      row.status !== "active" ||
      !task ||
      !action ||
      action.community_id !== communityId ||
      action.visibility !== "public" ||
      !["open", "active", "awaiting_result"].includes(action.status) ||
      !["open", "in_progress"].includes(task.state)
    ) {
      return [];
    }
    return [{
      id: row.id,
      title: task.title,
      description: task.description,
      dueAt: task.due_at,
      actionTitle: action.title,
      actionSlug: action.slug,
    }];
  });
}
