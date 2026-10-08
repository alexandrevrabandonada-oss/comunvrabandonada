import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { catalog, type Progress, type Practice } from "./core";

export function learningService() {
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("learning_unavailable");
  return service;
}
export async function learningSnapshot(userId: string) {
  const service = learningService();
  const [program, progress, practices, enrollment, memberships] =
    await Promise.all([
      service
        .from("comun_learning_programs")
        .select("version")
        .eq("id", catalog.program.id)
        .maybeSingle(),
      service
        .from("comun_learning_progress")
        .select("mission_id,step,revision,status,updated_at")
        .eq("user_id", userId)
        .eq("program_id", catalog.program.id),
      service
        .from("comun_learning_practice_links")
        .select("mission_id,pauta_id,task_id,reflection,state,review_note")
        .eq("user_id", userId),
      service
        .from("comun_learning_enrollments")
        .select("saved_resource_ids")
        .eq("user_id", userId)
        .eq("program_id", catalog.program.id)
        .maybeSingle(),
      service
        .from("comun_pauta_memberships")
        .select("pauta_id")
        .eq("member_user_id", userId)
        .eq("status", "active"),
    ]);
  if (
    [program, progress, practices, enrollment, memberships].some(
      (r) => r.error,
    ) ||
    program.data?.version !== catalog.program.version
  )
    throw new Error("learning_unavailable");
  const ids = (memberships.data ?? []).map((m) => String(m.pauta_id));
  const [pautas, tasks] = ids.length
    ? await Promise.all([
        service
          .from("comun_pauta_spaces")
          .select("id,slug,title")
          .in("id", ids)
          .neq("status", "archived"),
        service
          .from("comun_pauta_tasks")
          .select("id,pauta_id,title,status")
          .in("pauta_id", ids)
          .neq("status", "archived"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (pautas.error || tasks.error) throw new Error("learning_unavailable");
  return {
    progress: progress.data as Progress[],
    practices: practices.data as Practice[],
    savedResources: (enrollment.data?.saved_resource_ids ?? []) as string[],
    pautas: pautas.data as { id: string; slug: string; title: string }[],
    tasks: tasks.data as {
      id: string;
      pauta_id: string;
      title: string;
      status: string;
    }[],
  };
}
