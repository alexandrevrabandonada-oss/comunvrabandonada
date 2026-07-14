"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function moderateArchiveSuggestion(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id")),
    status = String(formData.get("status"));
  if (!["research", "approved", "rejected", "archived"].includes(status))
    throw new Error("Status invalido.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase indisponivel.");
  const { data, error } = await db
    .from("comun_archive_item_suggestions")
    .update({
      status,
      moderator_notes:
        String(formData.get("moderator_notes") || "").trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("archive_item_id")
    .single();
  if (error) throw error;
  await logComunAdminAction({
    session,
    action:
      status === "approved"
        ? "archive_suggestion_approved"
        : status === "rejected"
          ? "archive_suggestion_rejected"
          : "archive_suggestion_moderated",
    targetType: "archive_suggestion",
    targetId: id,
    metadata: { status, archive_item_id: data.archive_item_id },
  });
  revalidatePath("/comun/admin/acervo/sugestoes");
}
