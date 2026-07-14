"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { runArchiveProductionVerification } from "@/lib/archive/production-verification";
export async function runArchiveProductionVerificationAction(
  formData: FormData,
) {
  const session = await requireComunAdmin({ roles: ["admin"] });
  if (formData.get("confirmation") !== "confirmed")
    throw new Error("Confirmacao explicita obrigatoria.");
  await runArchiveProductionVerification({
    initiatedBy: session.admin.id,
    verificationType: "archive_queue_production",
  });
  revalidatePath("/comun/admin/acervo/verificacao");
}
