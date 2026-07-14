"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export async function updateAlert(formData: FormData) {
  await requireComunAdmin();
  const id = String(formData.get("id")),
    status = String(formData.get("status"));
  if (!["acknowledged", "resolved", "archived"].includes(status))
    throw new Error("Status invalido");
  await createServiceSupabaseClient()
    ?.from("comun_admin_alerts")
    .update({
      status,
      acknowledged_at:
        status === "acknowledged" ? new Date().toISOString() : null,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/comun/admin/alertas");
}
