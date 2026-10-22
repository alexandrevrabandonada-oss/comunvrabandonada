import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getCollectiveActionsRelease } from "@/lib/collective-actions-release";
import {
  canReadMesaPilot,
  ownPublicMesaTasks,
  type MesaOwnTask,
} from "@/lib/community-mesa-contract";

export type MesaPilotSnapshot =
  | { kind: "forbidden" }
  | { kind: "unavailable" }
  | {
      kind: "ready";
      communityName: string;
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
  const db = createServiceSupabaseClient();
  if (!db) return { kind: "unavailable" };

  try {
    const { data: community, error: communityError } = await db
      .from("comun_communities")
      .select("id,name")
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
      .select("role")
      .eq("membership_id", membership.id)
      .eq("scope", "community")
      .is("revoked_at", null)
      .lte("starts_at", new Date().toISOString())
      .in("role", ["coordinator", "facilitator"]);
    if (roleError) return { kind: "unavailable" };

    const roles = (assignments ?? []).map((row) => row.role);
    if (!canReadMesaPilot({ membershipState: membership.state, roles }))
      return { kind: "forbidden" };

    const role: "coordinator" | "facilitator" = roles.includes("coordinator")
      ? "coordinator"
      : "facilitator";
    const release = await getCollectiveActionsRelease();
    if (!release.enabled) {
      return {
        kind: "ready",
        communityName: community.name,
        role,
        tasksState: "not_released",
        tasks: [],
      };
    }

    // Filtra no banco pela identidade e novamente no contrato puro pela comunidade.
    const { data: ownAssignments, error: taskError } = await db
      .from("comun_collective_action_task_assignments")
      .select(
        "id,member_user_id,status,task:comun_collective_action_tasks!inner(title,description,due_at,state,action:comun_collective_actions!inner(community_id,slug,title,visibility,status))",
      )
      .eq("member_user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);
    if (taskError) {
      return {
        kind: "ready",
        communityName: community.name,
        role,
        tasksState: "unavailable",
        tasks: [],
      };
    }
    // O tipo raw de PostgREST não exprime a relação aninhada com precisão.
    const tasks = ownPublicMesaTasks(
      (ownAssignments ?? []) as unknown as Parameters<typeof ownPublicMesaTasks>[0],
      userId,
      community.id,
    ).slice(0, 10);
    return {
      kind: "ready",
      communityName: community.name,
      role,
      tasksState: "ready",
      tasks,
    };
  } catch {
    // Nenhuma falha de infraestrutura deve virar painel vazio ou dado público.
    return { kind: "unavailable" };
  }
}
