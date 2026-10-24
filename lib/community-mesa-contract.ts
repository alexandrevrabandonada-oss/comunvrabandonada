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

export function currentMesaRoles(
  rows: readonly {
    role: string;
    scope: string;
    starts_at: string;
    revoked_at: string | null;
  }[],
  now = Date.now(),
) {
  return rows
    .filter(
      (row) =>
        row.scope === "community" &&
        row.revoked_at === null &&
        Number.isFinite(Date.parse(row.starts_at)) &&
        Date.parse(row.starts_at) <= now &&
        ["coordinator", "facilitator"].includes(row.role),
    )
    .map((row) => row.role);
}

export type MesaOwnTask = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  actionTitle: string;
  actionSlug: string;
};

export type MesaActivity = {
  slug: string;
  title: string;
  status: string;
  startsAt: string | null;
};

export function publicMesaActivities(
  rows: readonly {
    community_id: string | null;
    slug: string;
    title: string;
    status: string;
    visibility: string;
    published_at: string | null;
    starts_at: string | null;
  }[],
  communityId: string,
): MesaActivity[] {
  return rows.flatMap((row) =>
    row.community_id === communityId &&
    row.visibility === "public" &&
    row.published_at &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) &&
    ["open", "active", "awaiting_result", "completed"].includes(row.status)
      ? [
          {
            slug: row.slug,
            title: row.title,
            status: row.status,
            startsAt: row.starts_at,
          },
        ]
      : [],
  );
}

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
      published_at: string | null;
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
      !action.published_at ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.slug) ||
      !["open", "active", "awaiting_result"].includes(action.status) ||
      !["open", "in_progress"].includes(task.state)
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        title: task.title,
        description: task.description,
        dueAt: task.due_at,
        actionTitle: action.title,
        actionSlug: action.slug,
      },
    ];
  });
}
