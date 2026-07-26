import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const collectiveActionTypes = [
  "community_inspection", "petition", "public_meeting", "mutual_aid",
  "pressure_campaign", "collective_forwarding", "cultural_action",
  "study_circle", "volunteer_task_force", "other",
] as const;

export const collectiveActionStatuses = [
  "draft", "preparing", "open", "active", "awaiting_result",
  "completed", "cancelled", "archived",
] as const;

export const collectiveActionTypeLabels: Record<(typeof collectiveActionTypes)[number], string> = {
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

export const collectiveActionStatusLabels: Record<(typeof collectiveActionStatuses)[number], string> = {
  draft: "rascunho", preparing: "preparando", open: "aberta", active: "em andamento",
  awaiting_result: "aguardando resultado", completed: "concluída", cancelled: "cancelada", archived: "arquivada",
};

export const collectiveTaskEffortLabels: Record<string, string> = {
  small: "pequeno esforço", medium: "esforço médio", collective: "coletiva",
};

export const collectiveParticipationModeLabels: Record<string, string> = {
  remote: "remota", in_person: "presencial", hybrid: "híbrida",
};

const publicStatuses = ["open", "active", "awaiting_result", "completed"];

function service() {
  return createServiceSupabaseClient() as any;
}

export async function listPublicCollectiveActions(filters?: { territory?: string; type?: string }) {
  const db = service();
  if (!db) return [];
  let query = db.from("comun_collective_actions").select("id,slug,title,summary,objective,action_type,status,territory_label,meeting_place,starts_at,ends_at,participation_mode,published_at,completed_at,result_summary,memory_summary,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)").eq("visibility", "public").in("status", publicStatuses).order("starts_at", { ascending: true, nullsFirst: false });
  if (filters?.territory) query = query.eq("territory_label", filters.territory);
  if (filters?.type && collectiveActionTypes.includes(filters.type as any)) query = query.eq("action_type", filters.type);
  const { data } = await query;
  return data ?? [];
}

export async function listPublicCollectiveActionFilters() {
  const actions = await listPublicCollectiveActions();
  return {
    territories: [...new Set<string>(actions.map((action: any) => action.territory_label).filter((value: unknown): value is string => typeof value === "string" && value.length > 0))].sort(),
    types: [...new Set<string>(actions.map((action: any) => action.action_type).filter((value: unknown): value is string => typeof value === "string" && value.length > 0))].sort(),
  };
}

export async function getPublicCollectiveAction(slug: string) {
  const db = service();
  if (!db) return null;
  const { data: action } = await db.from("comun_collective_actions").select("id,slug,title,summary,objective,action_type,status,territory_label,meeting_place,starts_at,ends_at,participation_mode,published_at,completed_at,result_summary,memory_summary,pauta:comun_pauta_spaces(slug,title),community:comun_communities(slug,name)").eq("slug", slug).eq("visibility", "public").in("status", publicStatuses).maybeSingle();
  if (!action) return null;
  const [tasksResult, updatesResult, linksResult, participationResult] = await Promise.all([
    db.from("comun_collective_action_tasks").select("id,title,description,desired_count,due_at,state,effort_level,participation_mode").eq("action_id", action.id).in("state", ["open", "in_progress", "done"]).order("due_at", { ascending: true, nullsFirst: false }),
    db.from("comun_collective_action_updates").select("id,update_type,title,public_summary,occurred_at").eq("action_id", action.id).eq("visibility", "public").order("occurred_at", { ascending: false }),
    db.from("comun_collective_action_sidewalk_records").select("sidewalk_record_id").eq("action_id", action.id),
    db.from("comun_collective_action_participations").select("status").eq("action_id", action.id),
  ]);
  const tasks = tasksResult.data ?? [];
  const taskIds = tasks.map((task: any) => task.id);
  const sidewalkRecordIds = (linksResult.data ?? []).map((link: any) => link.sidewalk_record_id);
  const assignmentRows = taskIds.length
    ? (await db.from("comun_collective_action_task_assignments").select("task_id").eq("status", "active").in("task_id", taskIds)).data ?? []
    : [];
  const sidewalkRecords = sidewalkRecordIds.length
    ? (await db.from("comun_sidewalk_records").select("slug,name,public_summary,approximate_location").in("id", sidewalkRecordIds).eq("visibility", "public")).data ?? []
    : [];
  const assignmentsByTask = new Map<string, number>();
  assignmentRows.forEach((row: any) => assignmentsByTask.set(row.task_id, (assignmentsByTask.get(row.task_id) ?? 0) + 1));
  const counts = { interested: 0, participating: 0, tasksAssumed: assignmentRows.length, updates: (updatesResult.data ?? []).length, results: action.status === "completed" ? 1 : 0 };
  (participationResult.data ?? []).forEach((row: any) => {
    if (row.status === "interested") counts.interested += 1;
    if (["participating", "available_for_task", "attended", "contributed"].includes(row.status)) counts.participating += 1;
  });
  return {
    ...action,
    tasks: tasks.map((task: any) => ({ ...task, assumed_count: assignmentsByTask.get(task.id) ?? 0 })),
    updates: updatesResult.data ?? [],
    sidewalkRecords,
    counts,
  };
}

export async function listAdminCollectiveActions() {
  const db = service();
  if (!db) return [];
  const { data } = await db.from("comun_collective_actions").select("id,slug,title,summary,objective,action_type,status,visibility,territory_label,meeting_place,starts_at,ends_at,participation_mode,pauta_id,community_id,result_summary,memory_summary,created_at,published_at,completed_at").order("created_at", { ascending: false });
  return data ?? [];
}

export async function listCollectiveActionCommunities() {
  const db = service();
  if (!db) return [];
  const { data } = await db.from("comun_communities").select("id,name").eq("is_active", true).order("name");
  return data ?? [];
}

export async function listMemberCollectiveActions(memberUserId: string) {
  const db = service();
  if (!db) return [];
  const { data } = await db.from("comun_collective_action_participations").select("id,status,updated_at,action:comun_collective_actions(slug,title,status,summary)").eq("member_user_id", memberUserId).order("updated_at", { ascending: false });
  return (data ?? []).map((item: any) => ({
    ...item,
    action_url: item.action?.slug ? `/comun/acoes/${item.action.slug}` : null,
  }));
}
