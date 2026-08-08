"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { isComunSidewalkPublicProjectionEnabled, isComunSidewalkRelataEnabled } from "@/lib/comun-sidewalk-p4-feature";
import { resolveSidewalkPublicPoint } from "@/lib/comun-sidewalk-review-runtime";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const decisions = new Set(["publish_approximate", "needs_information", "reject", "withdraw"]);

export async function reviewSidewalkRelata(formData: FormData) {
  if (!isComunSidewalkRelataEnabled()) throw new Error("COMUN_SIDEWALK_INTAKE_DISABLED");
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const intakeId = String(formData.get("intake_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const publicSummary = String(formData.get("public_summary") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(intakeId) || !decisions.has(decision)) {
    throw new Error("Decisão editorial inválida.");
  }
  if (decision === "publish_approximate" && !isComunSidewalkPublicProjectionEnabled()) {
    throw new Error("A projeção pública de Calçadas está desligada.");
  }
  if (decision === "publish_approximate" && (publicSummary.length < 16 || publicSummary.length > 800)) {
    throw new Error("O resumo público sanitizado deve ter entre 16 e 800 caracteres.");
  }
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const publicPoint = decision === "publish_approximate"
    ? await resolveSidewalkPublicPoint(db, intakeId)
    : null;
  const { data, error } = await db.rpc("comun_sidewalk_intake_review", {
    p_intake_id: intakeId,
    p_decision: decision,
    p_public_summary: decision === "publish_approximate" ? publicSummary : null,
    p_public_geometry: publicPoint,
  });
  if (error || !Array.isArray(data) || !data[0]) throw new Error("Não foi possível registrar a revisão.");
  await logComunAdminAction({
    session,
    action: `sidewalk_p4_${decision}`,
    targetType: "sidewalk_relata_intake",
    targetId: intakeId,
    metadata: {
      public_projection: decision === "publish_approximate",
      exact_location_rendered: false,
      public_photo: false,
    },
  });
  revalidatePath("/comun/admin/calcadas/relatos");
  revalidatePath("/comun/calcadas");
}
