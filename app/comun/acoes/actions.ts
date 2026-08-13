"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommunitySession } from "@/lib/community-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { requireCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { isComunCollectiveActionsCanonicalExperienceEnabled } from "@/lib/comun-collective-actions-canonical-feature";

const participationStates = new Set([
  "interested",
  "participating",
  "available_for_task",
  "attended",
  "contributed",
  "withdrew",
]);

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function finishCanonicalMutation(
  form: FormData,
  slug: string,
  confirmation: string,
) {
  if (
    value(form, "canonical_experience") === "1" &&
    isComunCollectiveActionsCanonicalExperienceEnabled()
  ) {
    redirect(`/comun/acoes/${slug}?confirmacao=${confirmation}`);
  }
}

async function memberAction(form: FormData) {
  await requireCollectiveActionsRelease();
  const slug = value(form, "slug");
  if (!slug) throw new Error("Ação coletiva inválida.");
  const session = await requireCommunitySession(`/comun/acoes/${slug}`);
  const db: any = createServiceSupabaseClient();
  if (!db) throw new Error("A participação está indisponível agora.");
  const { data: action } = await db
    .from("comun_collective_actions")
    .select("id,status,visibility")
    .eq("slug", slug)
    .eq("visibility", "public")
    .in("status", ["open", "active", "awaiting_result"])
    .maybeSingle();
  if (!action) throw new Error("Esta ação não está aberta para participação.");
  return { slug, userId: session.user.id, db, action };
}

export async function updateCollectiveActionParticipation(form: FormData) {
  const { slug, userId, db, action } = await memberAction(form);
  const status = value(form, "status");
  if (!participationStates.has(status))
    throw new Error("Forma de participação inválida.");
  const note = value(form, "contribution_note_private").slice(0, 600);
  if (status === "withdrew") {
    const { data: tasks } = await db
      .from("comun_collective_action_tasks")
      .select("id")
      .eq("action_id", action.id);
    const taskIds = (tasks ?? []).map((task: { id: string }) => task.id);
    if (taskIds.length) {
      const { data: assignment } = await db
        .from("comun_collective_action_task_assignments")
        .select("id")
        .eq("member_user_id", userId)
        .eq("status", "active")
        .in("task_id", taskIds)
        .limit(1)
        .maybeSingle();
      if (assignment)
        throw new Error("Libere suas tarefas antes de sair da ação.");
    }
  }
  const { error } = await db
    .from("comun_collective_action_participations")
    .upsert(
      {
        action_id: action.id,
        member_user_id: userId,
        status,
        contribution_note_private: note || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "action_id,member_user_id" },
    );
  if (error) throw new Error("Não foi possível registrar sua participação.");
  revalidatePath(`/comun/acoes/${slug}`);
  revalidatePath("/comun/minha-participacao");
  finishCanonicalMutation(
    form,
    slug,
    status === "contributed" ? "note" : status,
  );
}

export async function claimCollectiveActionTask(form: FormData) {
  const { slug, userId, db, action } = await memberAction(form);
  const taskId = value(form, "task_id");
  if (!taskId) throw new Error("Tarefa inválida.");
  const { data: participation } = await db
    .from("comun_collective_action_participations")
    .select("id,status")
    .eq("action_id", action.id)
    .eq("member_user_id", userId)
    .in("status", [
      "participating",
      "available_for_task",
      "attended",
      "contributed",
    ])
    .maybeSingle();
  if (!participation)
    throw new Error("Entre na ação antes de assumir uma tarefa.");
  const { data: task } = await db
    .from("comun_collective_action_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("action_id", action.id)
    .in("state", ["open", "in_progress"])
    .maybeSingle();
  if (!task) throw new Error("Esta tarefa não está disponível.");
  const { error } = await db
    .from("comun_collective_action_task_assignments")
    .upsert(
      {
        task_id: task.id,
        member_user_id: userId,
        status: "active",
        released_at: null,
      },
      { onConflict: "task_id,member_user_id" },
    );
  if (error) {
    if (error.message?.includes("COMUN_COLLECTIVE_TASK_CAPACITY_REACHED"))
      throw new Error("As vagas desta tarefa já foram preenchidas.");
    throw new Error("Não foi possível assumir esta tarefa.");
  }
  revalidatePath(`/comun/acoes/${slug}`);
  revalidatePath("/comun/minha-participacao");
  finishCanonicalMutation(form, slug, "task_claimed");
}

export async function releaseCollectiveActionTask(form: FormData) {
  const { slug, userId, db, action } = await memberAction(form);
  const taskId = value(form, "task_id");
  if (!taskId) throw new Error("Tarefa inválida.");
  const { data: task } = await db
    .from("comun_collective_action_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("action_id", action.id)
    .maybeSingle();
  if (!task) throw new Error("Tarefa inválida para esta ação.");
  const { error } = await db
    .from("comun_collective_action_task_assignments")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("member_user_id", userId)
    .eq("status", "active");
  if (error) throw new Error("Não foi possível liberar esta tarefa.");
  revalidatePath(`/comun/acoes/${slug}`);
  revalidatePath("/comun/minha-participacao");
  finishCanonicalMutation(form, slug, "task_released");
}
