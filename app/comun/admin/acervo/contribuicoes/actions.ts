"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { enqueueHistoricalPhotoDerivativeJob } from "@/lib/archive/photo-processing-queue";
import {
  isArchiveSubmissionTransitionAllowed,
  resolveArchiveSubmissionReadiness,
} from "@/lib/archive/cultural-curation-readiness";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

async function loadSubmissionReadiness(db: ReturnType<typeof createServiceSupabaseClient>, submission: any) {
  if (!db) throw new Error("Supabase indisponivel.");
  const [{ data: links }, { data: derivatives }] = await Promise.all([
    db
      .from("comun_archive_submission_assets")
      .select("upload_status,comun_archive_assets(integrity_status,review_status)")
      .eq("submission_id", submission.id),
    submission.archive_item_id
      ? db
          .from("comun_archive_assets")
          .select("id")
          .eq("archive_item_id", submission.archive_item_id)
          .eq("bucket_scope", "public_safe")
          .eq("review_status", "approved")
          .in("asset_role", ["thumbnail", "display"])
      : Promise.resolve({ data: [] }),
  ]);
  const confirmedOriginal = (links ?? []).some((link: any) => {
    const asset = Array.isArray(link.comun_archive_assets)
      ? link.comun_archive_assets[0]
      : link.comun_archive_assets;
    return (
      link.upload_status === "confirmed" &&
      asset?.integrity_status === "verified" &&
      asset?.review_status === "approved"
    );
  });
  return resolveArchiveSubmissionReadiness(submission, {
    confirmedOriginal,
    derivativesReady: (derivatives ?? []).length >= 2,
  });
}

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
  const { data: submission } = await db
    .from("comun_archive_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!submission) throw new Error("Contribuicao nao encontrada.");
  const readiness = await loadSubmissionReadiness(db, submission);
  if (!isArchiveSubmissionTransitionAllowed(submission.status, status, readiness)) {
    throw new Error(
      status === "ready_for_editorial_review"
        ? `A contribuicao ainda nao esta pronta: ${readiness.blockers.join(", ") || "revisao pendente"}.`
        : "Transicao de curadoria invalida para o estado atual.",
    );
  }
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
  if (!s)
    throw new Error("Contribuicao sem declaracao de direitos.");
  const readiness = await loadSubmissionReadiness(db, s);
  if (!readiness.readyForDraftMaterialization) {
    throw new Error(
      `A contribuicao nao esta pronta para criar rascunho privado: ${readiness.blockers.join(", ")}.`,
    );
  }
  if (s.submission_type !== "historical_photo")
    throw new Error("Este adapter so materializa contribuicoes fotograficas historicas.");
  const slug = `${String(s.title_suggestion)
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
      title: s.title_suggestion,
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
      rights_status: "unknown",
      status: "draft",
      visibility: "private",
      editorial_notes:
        "Rascunho privado criado a partir de contribuicao comunitaria; revisar contexto, direitos e editorial antes de qualquer publicacao.",
    })
    .select("id")
    .single();
  if (item.error) throw item.error;
  await db
    .from("comun_archive_assets")
    .update({
      archive_item_id: item.data.id,
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
    metadata: {
      archive_item_id: item.data.id,
      materialization: "private_photo_draft",
      publication: "not_authorized",
    },
  });
  revalidatePath(`/comun/admin/acervo/contribuicoes/${id}`);
}
export async function generateSubmissionDerivatives(formData: FormData) {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = String(formData.get("id")),
    assetId = String(formData.get("asset_id"));
  await enqueueHistoricalPhotoDerivativeJob(assetId);
  const db = createServiceSupabaseClient();
  await db
    ?.from("comun_archive_submissions")
    .update({ status: "derivative_pending" })
    .eq("id", id);
  revalidatePath(`/comun/admin/acervo/contribuicoes/${id}`);
}
