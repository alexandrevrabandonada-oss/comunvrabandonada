"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { runArchiveProcessingBatch } from "@/lib/archive/photo-processing-worker";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function processQueueNow() {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  await runArchiveProcessingBatch();
  revalidatePath("/comun/admin/acervo/processamento");
}
export async function retryJob(formData: FormData) {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id"));
  await createServiceSupabaseClient()
    ?.from("comun_archive_processing_jobs")
    .update({
      status: "queued",
      available_at: new Date().toISOString(),
      failed_at: null,
      last_error_code: null,
      last_error_summary: null,
    })
    .eq("id", id)
    .in("status", ["dead_letter", "failed"]);
  revalidatePath("/comun/admin/acervo/processamento");
}
export async function cancelJob(formData: FormData) {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id"));
  const db = createServiceSupabaseClient();
  const { data } = await db!
    .from("comun_archive_processing_jobs")
    .select("status")
    .eq("id", id)
    .single();
  if (["queued", "retry_scheduled"].includes(data?.status))
    await db!
      .from("comun_archive_processing_jobs")
      .update({ status: "cancelled", locked_at: null, locked_by: null })
      .eq("id", id);
  else if (data?.status === "processing")
    await db!
      .from("comun_archive_processing_jobs")
      .update({ status: "cancel_requested" })
      .eq("id", id);
  revalidatePath("/comun/admin/acervo/processamento");
}
