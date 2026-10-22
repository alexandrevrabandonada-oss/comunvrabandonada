import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-only: userId must come from the verified session, never from FormData.
 * Returning a responsibility remains possible after closure or community exit.
 * No participant, history or replacement is changed by this operation.
 */
export async function releaseOwnCollectiveTask(
  db: SupabaseClient,
  input: { userId: string; slug: string; taskId: string },
) {
  const failure =
    "Não foi possível liberar esta tarefa. Atualize e tente novamente.";
  if (!input.userId || !input.slug || !input.taskId) throw new Error(failure);
  const { data: assignment, error: readError } = await db
    .from("comun_collective_action_task_assignments")
    .select(
      "id,task:comun_collective_action_tasks!inner(action:comun_collective_actions!inner(slug))",
    )
    .eq("member_user_id", input.userId)
    .eq("task_id", input.taskId)
    .eq("status", "active")
    .eq("task.action.slug", input.slug)
    .maybeSingle();
  if (readError || !assignment) throw new Error(failure);

  const { data: released, error } = await db
    .from("comun_collective_action_task_assignments")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", assignment.id)
    .eq("member_user_id", input.userId)
    .eq("task_id", input.taskId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error || !released) throw new Error(failure);
}
