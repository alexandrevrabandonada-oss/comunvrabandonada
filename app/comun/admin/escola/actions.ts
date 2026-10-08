"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireComunAdmin } from "@/lib/admin-auth";
import { isLearningEnabled, getMission } from "@/lib/learning/core";
import { learningService } from "@/lib/learning/server";
export async function reviewPractice(form: FormData) {
  if (!isLearningEnabled()) redirect("/comun/admin");
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const input = z
    .object({
      userId: z.string().uuid(),
      missionId: z.string().max(100),
      decision: z.enum(["validated", "revision_requested"]),
      note: z.string().trim().max(600),
    })
    .safeParse({
      userId: form.get("userId"),
      missionId: form.get("missionId"),
      decision: form.get("decision"),
      note: form.get("note") ?? "",
    });
  if (!input.success || !getMission(input.data.missionId))
    redirect("/comun/admin/escola?status=invalid");
  const { userId, missionId, decision, note } = input.data;
  const { error } = await learningService().rpc(
    "comun_learning_review_practice",
    {
      p_reviewer: session.user.id,
      p_user_id: userId,
      p_mission_id: missionId,
      p_decision: decision,
      p_note: note,
    },
  );
  if (error) redirect("/comun/admin/escola?status=retry");
  revalidatePath("/comun/admin/escola");
  revalidatePath("/comun/escola");
  redirect("/comun/admin/escola?status=saved");
}
