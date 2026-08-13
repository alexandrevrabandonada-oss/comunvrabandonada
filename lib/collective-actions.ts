import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const collectiveActionTypes = [
  "community_inspection",
  "petition",
  "public_meeting",
  "mutual_aid",
  "pressure_campaign",
  "collective_forwarding",
  "cultural_action",
  "study_circle",
  "volunteer_task_force",
  "other",
] as const;

export const collectiveActionStatuses = [
  "draft",
  "preparing",
  "open",
  "active",
  "awaiting_result",
  "completed",
  "cancelled",
  "archived",
] as const;

export const collectiveActionTypeLabels: Record<
  (typeof collectiveActionTypes)[number],
  string
> = {
  community_inspection: "vistoria comunitária",
  petition: "abaixo-assinado",
  public_meeting: "encontro público",
  mutual_aid: "mutirão de cuidado",
  pressure_campaign: "campanha de pressão",
  collective_forwarding: "encaminhamento coletivo",
  cultural_action: "ação cultural",
  study_circle: "círculo de estudo",
  volunteer_task_force: "força-tarefa",
  other: "outra ação",
};

export const collectiveActionStatusLabels: Record<
  (typeof collectiveActionStatuses)[number],
  string
> = {
  draft: "rascunho",
  preparing: "preparando",
  open: "aberta",
  active: "em andamento",
  awaiting_result: "aguardando resultado",
  completed: "concluída",
  cancelled: "cancelada",
  archived: "arquivada",
};

export const collectiveTaskEffortLabels: Record<string, string> = {
  small: "pequeno esforço",
  medium: "esforço médio",
  collective: "coletiva",
};

export const collectiveParticipationModeLabels: Record<string, string> = {
  remote: "remota",
  in_person: "presencial",
  hybrid: "híbrida",
};

const publicStatuses = ["open", "active", "awaiting_result", "completed"];

function service() {
  return createServiceSupabaseClient() as any;
}

export async function listPublicCollectiveActions(filters?: {
  territory?: string;
  type?: string;
}) {
  const db = service();
  if (!db) return [];
  let query = db
    .from("comun_collective_actions")
    .select(
      "id,slug,title,summary,objective,action_type,status,visibility,territory_label,meeting_place,starts_at,ends_at,participation_mode,published_at,completed_at,result_status,result_summary,memory_summary,participant_count_aggregate,tasks_completed_aggregate,learned_summary,next_steps_summary,memory_published_at,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)",
    )
    .eq("visibility", "public")
    .in("status", publicStatuses)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (filters?.territory)
    query = query.eq("territory_label", filters.territory);
  if (filters?.type && collectiveActionTypes.includes(filters.type as any))
    query = query.eq("action_type", filters.type);
  const { data } = await query;
  return data ?? [];
}

export async function listPublicCollectiveActionFilters() {
  const actions = await listPublicCollectiveActions();
  return {
    territories: [
      ...new Set<string>(
        actions
          .map((action: any) => action.territory_label)
          .filter(
            (value: unknown): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ].sort(),
    types: [
      ...new Set<string>(
        actions
          .map((action: any) => action.action_type)
          .filter(
            (value: unknown): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ].sort(),
  };
}

export async function getPublicCollectiveAction(slug: string) {
  const db = service();
  if (!db) return null;
  const { data: action } = await db
    .from("comun_collective_actions")
    .select(
      "id,slug,title,summary,objective,action_type,status,territory_label,meeting_place,starts_at,ends_at,participation_mode,published_at,completed_at,result_status,result_summary,memory_summary,participant_count_aggregate,tasks_completed_aggregate,learned_summary,next_steps_summary,memory_published_at,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)",
    )
    .eq("slug", slug)
    .eq("visibility", "public")
    .in("status", publicStatuses)
    .maybeSingle();
  if (!action) return null;
  const [
    tasksResult,
    updatesResult,
    linksResult,
    participationResult,
    forwardingResult,
    memoryAssetsResult,
  ] = await Promise.all([
    db
      .from("comun_collective_action_tasks")
      .select(
        "id,title,description,desired_count,due_at,state,effort_level,participation_mode",
      )
      .eq("action_id", action.id)
      .in("state", ["open", "in_progress", "done"])
      .order("due_at", { ascending: true, nullsFirst: false }),
    db
      .from("comun_collective_action_updates")
      .select("id,update_type,title,public_summary,occurred_at,visibility")
      .eq("action_id", action.id)
      .eq("visibility", "public")
      .order("occurred_at", { ascending: true }),
    db
      .from("comun_collective_action_sidewalk_records")
      .select("sidewalk_record_id")
      .eq("action_id", action.id),
    db
      .from("comun_collective_action_participations")
      .select("status")
      .eq("action_id", action.id),
    db
      .from("comun_collective_action_forwardings")
      .select(
        "recipient_name,public_summary,sent_at,protocol_code,expected_response_at,state,response_public,public_document_url,public_document_label,public_visible",
      )
      .eq("action_id", action.id)
      .eq("public_visible", true)
      .maybeSingle(),
    db
      .from("comun_collective_action_memory_assets")
      .select("id,asset_kind,title,public_url,public_visible,reviewed_at")
      .eq("action_id", action.id)
      .eq("public_visible", true)
      .not("reviewed_at", "is", null)
      .order("created_at", { ascending: true }),
  ]);
  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((task: any) => task.id);
  const sidewalkRecordIds = (linksResult.data ?? []).map(
    (link: any) => link.sidewalk_record_id,
  );
  const assignmentRows = taskIds.length
    ? ((
        await db
          .from("comun_collective_action_task_assignments")
          .select("task_id")
          .eq("status", "active")
          .in("task_id", taskIds)
      ).data ?? [])
    : [];
  const sidewalkRecords = sidewalkRecordIds.length
    ? ((
        await db
          .from("comun_sidewalk_records")
          .select("slug,name,public_summary,approximate_location")
          .in("id", sidewalkRecordIds)
          .eq("visibility", "public")
      ).data ?? [])
    : [];
  const assignmentsByTask = new Map<string, number>();
  assignmentRows.forEach((row: any) =>
    assignmentsByTask.set(
      row.task_id,
      (assignmentsByTask.get(row.task_id) ?? 0) + 1,
    ),
  );
  const counts = {
    interested: 0,
    participating: 0,
    tasksAssumed: assignmentRows.length,
    updates: (updatesResult.data ?? []).length,
    results: action.status === "completed" ? 1 : 0,
  };
  (participationResult.data ?? []).forEach((row: any) => {
    if (row.status === "interested") counts.interested += 1;
    if (
      [
        "participating",
        "available_for_task",
        "attended",
        "contributed",
      ].includes(row.status)
    )
      counts.participating += 1;
  });
  return {
    ...action,
    tasks: tasks.map((task: any) => ({
      ...task,
      assumed_count: assignmentsByTask.get(task.id) ?? 0,
    })),
    updates: updatesResult.data ?? [],
    sidewalkRecords,
    forwarding: forwardingResult.data ?? null,
    memoryAssets: memoryAssetsResult.data ?? [],
    counts,
  };
}

export async function listAdminCollectiveActions() {
  const db = service();
  if (!db) return [];
  const [
    actionsResult,
    tasksResult,
    updatesResult,
    forwardingResult,
    assetsResult,
    participationResult,
  ] = await Promise.all([
    db
      .from("comun_collective_actions")
      .select(
        "id,slug,title,summary,objective,action_type,status,visibility,territory_label,meeting_place,starts_at,ends_at,participation_mode,pauta_id,community_id,result_status,result_summary,memory_summary,participant_count_aggregate,tasks_completed_aggregate,learned_summary,next_steps_summary,memory_published_at,created_at,published_at,completed_at",
      )
      .order("created_at", { ascending: false }),
    db
      .from("comun_collective_action_tasks")
      .select(
        "id,action_id,title,description,desired_count,due_at,state,effort_level,participation_mode,updated_at",
      )
      .order("created_at", { ascending: true }),
    db
      .from("comun_collective_action_updates")
      .select(
        "id,action_id,event_key,update_type,title,public_summary,occurred_at,visibility",
      )
      .order("occurred_at", { ascending: true }),
    db
      .from("comun_collective_action_forwardings")
      .select(
        "id,action_id,recipient_name,public_summary,sent_at,protocol_code,expected_response_at,state,response_public,public_document_url,public_document_label,public_visible,updated_at",
      ),
    db
      .from("comun_collective_action_memory_assets")
      .select(
        "id,action_id,asset_kind,title,public_url,public_visible,reviewed_at",
      )
      .order("created_at", { ascending: true }),
    db
      .from("comun_collective_action_participations")
      .select("action_id,status"),
  ]);
  const rowsByAction = <T extends { action_id: string }>(rows: T[] | null) => {
    const mapped = new Map<string, T[]>();
    for (const row of rows ?? [])
      mapped.set(row.action_id, [...(mapped.get(row.action_id) ?? []), row]);
    return mapped;
  };
  const tasksByAction = rowsByAction(tasksResult.data);
  const updatesByAction = rowsByAction(updatesResult.data);
  const assetsByAction = rowsByAction(assetsResult.data);
  const participationByAction = rowsByAction(participationResult.data);
  const forwardingByAction = new Map(
    (forwardingResult.data ?? []).map((row: any) => [row.action_id, row]),
  );
  return (actionsResult.data ?? []).map((action: any) => {
    const participation = participationByAction.get(action.id) ?? [];
    return {
      ...action,
      tasks: tasksByAction.get(action.id) ?? [],
      updates: updatesByAction.get(action.id) ?? [],
      forwarding: forwardingByAction.get(action.id) ?? null,
      memoryAssets: assetsByAction.get(action.id) ?? [],
      participantCount: participation.filter(
        (row: any) => row.status !== "withdrew",
      ).length,
    };
  });
}

export async function listCollectiveActionCommunities() {
  const db = service();
  if (!db) return [];
  const { data } = await db
    .from("comun_communities")
    .select("id,name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function listMemberCollectiveActions(memberUserId: string) {
  const db = service();
  if (!db) return [];
  const [{ data: participations }, { data: assignments }] = await Promise.all([
    db
      .from("comun_collective_action_participations")
      .select(
        "id,status,updated_at,action:comun_collective_actions(id,slug,title,status,summary)",
      )
      .eq("member_user_id", memberUserId)
      .neq("status", "withdrew")
      .order("updated_at", { ascending: false }),
    db
      .from("comun_collective_action_task_assignments")
      .select(
        "id,status,created_at,task:comun_collective_action_tasks(id,action_id,title,description,due_at,state,effort_level,participation_mode,action:comun_collective_actions(slug,title,status))",
      )
      .eq("member_user_id", memberUserId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const assignmentsByAction = new Map<string, any[]>();
  for (const assignment of assignments ?? []) {
    const actionId = assignment.task?.action_id;
    if (!actionId) continue;
    assignmentsByAction.set(actionId, [
      ...(assignmentsByAction.get(actionId) ?? []),
      assignment,
    ]);
  }
  return (participations ?? []).map((item: any) => ({
    ...item,
    action_url: item.action?.slug ? `/comun/acoes/${item.action.slug}` : null,
    taskAssignments: assignmentsByAction.get(item.action?.id) ?? [],
  }));
}
