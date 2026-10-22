import "server-only";
import { getCommunitySession } from "@/lib/community-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import {
  canReadMesaPilot,
  ownPublicMesaTasks,
  type MesaOwnTask,
  publicMesaActivities,
  type MesaActivity,
  currentMesaRoles,
} from "@/lib/community-mesa-contract";

export type MesaPilotSnapshot =
  | { kind: "forbidden" }
  | { kind: "unavailable" }
  | {
      kind: "ready";
      communityName: string;
      purpose: string;
      activitiesState: "ready" | "unavailable" | "not_released";
      activities: MesaActivity[];
      role: "coordinator" | "facilitator";
      tasksState: "ready" | "unavailable" | "not_released";
      tasks: MesaOwnTask[];
    };

/**
 * Projeção privada somente de leitura.
 * Nunca enumera pessoas, reuniões reservadas, decisões internas ou filiações.
 * Utiliza service role APÓS checagens explícitas de identidade, comunidade e papel.
 */
export async function getMesaPilotSnapshot(
  slug: string,
  userId: string,
): Promise<MesaPilotSnapshot> {
  try {
    const session = await getCommunitySession();
    if (
      !session ||
      session.user.id !== userId ||
      session.profile?.status !== "active"
    )
      return { kind: "forbidden" };
    const db = createServiceSupabaseClient();
    if (!db) return { kind: "unavailable" };
    const { data: community, error: communityError } = await db
      .from("comun_communities")
      .select("id,name,short_description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (communityError) return { kind: "unavailable" };
    if (!community) return { kind: "forbidden" };

    const { data: membership, error: membershipError } = await db
      .from("comun_community_memberships")
      .select("id,state")
      .eq("community_id", community.id)
      .eq("member_user_id", userId)
      .maybeSingle();
    if (membershipError) return { kind: "unavailable" };
    if (!membership || membership.state !== "member")
      return { kind: "forbidden" };

    const { data: assignments, error: roleError } = await db
      .from("comun_community_role_assignments")
      .select("role,scope,starts_at,revoked_at")
      .eq("membership_id", membership.id)
      .eq("scope", "community")
      .is("revoked_at", null)
      .lte("starts_at", new Date().toISOString())
      .in("role", ["coordinator", "facilitator"]);
    if (roleError) return { kind: "unavailable" };

    const roles = currentMesaRoles(assignments ?? []);
    if (!canReadMesaPilot({ membershipState: membership.state, roles }))
      return { kind: "forbidden" };

    const role: "coordinator" | "facilitator" = roles.includes("coordinator")
      ? "coordinator"
      : "facilitator";
    const context = {
      communityName: community.name,
      purpose: community.short_description ?? "",
      role,
    };
    const release = await getCollectiveActionsRelease();
    if (!release.enabled) {
      return {
        kind: "ready",
        ...context,
        activitiesState: "not_released",
        activities: [],
        tasksState: "not_released",
        tasks: [],
      };
    }

    // Public, published objects only; never meeting places, participants or notes.
    const { data: activityRows, error: activityError } = await db
      .from("comun_collective_actions")
      .select(
        "community_id,slug,title,status,visibility,published_at,starts_at",
      )
      .eq("community_id", community.id)
      .eq("visibility", "public")
      .not("published_at", "is", null)
      .in("status", ["open", "active", "awaiting_result", "completed"])
      .order("starts_at", { ascending: false })
      .limit(20);
    const activities = activityError
      ? []
      : publicMesaActivities(activityRows ?? [], community.id);
    const activityContext = {
      activities,
      activitiesState: activityError
        ? ("unavailable" as const)
        : ("ready" as const),
    };

    // Filtra no banco pela identidade e novamente no contrato puro pela comunidade.
    const { data: ownAssignments, error: taskError } = await db
      .from("comun_collective_action_task_assignments")
      .select(
        "id,member_user_id,status,task:comun_collective_action_tasks!inner(title,description,due_at,state,action:comun_collective_actions!inner(community_id,slug,title,visibility,status,published_at))",
      )
      .eq("member_user_id", userId)
      .eq("status", "active")
      .eq("task.action.community_id", community.id)
      .eq("task.action.visibility", "public")
      .not("task.action.published_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (taskError) {
      return {
        kind: "ready",
        ...context,
        ...activityContext,
        tasksState: "unavailable",
        tasks: [],
      };
    }
    // O tipo raw de PostgREST não exprime a relação aninhada com precisão.
    const tasks = ownPublicMesaTasks(
      (ownAssignments ?? []) as unknown as Parameters<
        typeof ownPublicMesaTasks
      >[0],
      userId,
      community.id,
    ).slice(0, 10);
    return {
      kind: "ready",
      ...context,
      ...activityContext,
      tasksState: "ready",
      tasks,
    };
  } catch {
    // Nenhuma falha de infraestrutura deve virar painel vazio ou dado público.
    return { kind: "unavailable" };
  }
}
