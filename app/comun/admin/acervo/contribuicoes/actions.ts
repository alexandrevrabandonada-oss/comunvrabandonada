"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { generateHistoricalPhotoDerivatives } from "@/lib/photo-derivatives";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function updateSubmissionStatus(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id")),
    status = String(formData.get("status"));
  if (
    ![
      "triage",
      "research",
      "rights_review",
      "derivative_pending",
      "ready_for_editorial_review",
      "rejected",
      "archived",
    ].includes(status)
  )
    throw new Error("Status invalido.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase indisponivel.");
  await db
    .from("comun_archive_submissions")
    .update({
      status,
      reviewed_at:
        status === "rejected" || status === "archived"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);
  const event =
    status === "triage"
      ? "archive_submission_triage_started"
      : status === "rejected"
        ? "archive_submission_rejected"
        : status === "archived"
          ? "archive_submission_archived"
          : "archive_submission_status_updated";
  await logComunAdminAction({
    session,
    action: event,
    targetType: "archive_submission",
    targetId: id,
    metadata: { status },
  });
  revalidatePath(`/comun/admin/acervo/contribuicoes/${id}`);
}
export async function createArchiveItemFromSubmission(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id"));
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase indisponivel.");
  const { data: s } = await db
    .from("comun_archive_submissions")
    .select("*")
    .eq("id", id)
    .single();
  if (!s || !s.permission_confirmed)
    throw new Error("Contribuicao sem declaracao de direitos.");
  const slug = `${String(s.title_suggestion || "fotografia")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)}-${id.slice(0, 6)}`;
  const item = await db
    .from("comun_archive_items")
    .insert({
      slug,
      item_type: "photograph",
      title: s.title_suggestion || "Fotografia sem titulo",
      description: s.description_suggestion,
      city: s.city,
      neighborhood: s.neighborhood,
      place_name: s.place_name,
      approximate_date: s.approximate_date,
      source_name: s.source_name,
      source_description: s.source_story,
      credits:
        s.public_credit ||
        (s.contributor_credit_preference === "contributor_name"
          ? s.contributor_name
          : "Contribuicao anonima"),
      rights_status: "permission_granted",
      status: "draft",
      visibility: "private",
      editorial_notes:
        "Criado a partir de contribuicao comunitaria; revisar certezas, fonte e direitos.",
    })
    .select("id")
    .single();
  if (item.error) throw item.error;
  await db
    .from("comun_archive_assets")
    .update({
      archive_item_id: item.data.id,
      rights_status: "permission_granted",
      credits: s.public_credit || null,
    })
    .in(
      "id",
      (
        await db
          .from("comun_archive_submission_assets")
          .select("archive_asset_id")
          .eq("submission_id", id)
      ).data?.map((x) => x.archive_asset_id) ?? [],
    );
  await db
    .from("comun_archive_submissions")
    .update({ archive_item_id: item.data.id, status: "derivative_pending" })
    .eq("id", id);
  await logComunAdminAction({
    session,
    action: "archive_submission_item_created",
    targetType: "archive_submission",
    targetId: id,
    metadata: { archive_item_id: item.data.id },
  });
  revalidatePath(`/comun/admin/acervo/contribuicoes/${id}`);
}
export async function generateSubmissionDerivatives(formData: FormData) {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id")),
    assetId = String(formData.get("asset_id"));
  await generateHistoricalPhotoDerivatives(assetId);
  const db = createServiceSupabaseClient();
  await db
    ?.from("comun_archive_submissions")
    .update({ status: "ready_for_editorial_review" })
    .eq("id", id);
  revalidatePath(`/comun/admin/acervo/contribuicoes/${id}`);
}
