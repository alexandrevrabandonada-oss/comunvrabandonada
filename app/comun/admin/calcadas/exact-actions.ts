"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { getMediaStorage } from "@/lib/media-storage";
import { requireSidewalkOperationalRelease } from "@/lib/sidewalk-operational-release";
import { generateSidewalkPhotoDerivative } from "@/lib/sidewalk-photos";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const EXACT_CONSENT_VALUE = "exact";

type ConsentPayload = {
  consent_publish?: unknown;
  consent_location_precision?: unknown;
};

function hasExactLocationConsent(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as ConsentPayload;
  return (
    candidate.consent_publish === "yes" &&
    candidate.consent_location_precision === EXACT_CONSENT_VALUE
  );
}

function isValidPointGeometry(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  return (
    geometry.type === "Point" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length === 2 &&
    geometry.coordinates.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  );
}

export async function moderateSidewalkRecordExact(form: FormData) {
  await requireSidewalkOperationalRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");

  const recordId = String(form.get("record_id") ?? "").trim();
  const publicSummary = String(form.get("public_summary") ?? "").trim();
  if (!recordId) throw new Error("Registro não informado.");
  if (publicSummary.length < 20 || publicSummary.length > 1600)
    throw new Error(
      "A publicação exata exige um resumo público sanitizado entre 20 e 1.600 caracteres.",
    );

  const { data: record, error: recordError } = await db
    .from("comun_sidewalk_records")
    .select(
      "id,member_user_id,pauta_id,status,visibility,private_geometry_geojson",
    )
    .eq("id", recordId)
    .single();
  if (recordError || !record) throw new Error("Registro não encontrado.");
  if (record.status !== "under_review" || record.visibility !== "internal")
    throw new Error("Este registro não está disponível para publicação exata.");
  if (!isValidPointGeometry(record.private_geometry_geojson))
    throw new Error("O registro não possui um ponto exato válido.");

  const { data: uploads, error: uploadsError } = await db
    .from("comun_sidewalk_uploads")
    .select("id,status,submission_payload")
    .eq("record_id", recordId)
    .eq("status", "confirmed");
  if (uploadsError) throw new Error("Não foi possível verificar o consentimento.");
  if (uploads?.length !== 1 || !hasExactLocationConsent(uploads[0].submission_payload))
    throw new Error(
      "A publicação do ponto exato exige consentimento explícito registrado no envio.",
    );

  const { data: photo, error: photoError } = await db
    .from("comun_sidewalk_record_photos")
    .select(
      "id,archive_item_id,derivative_asset_id,review_status,is_public,comun_archive_assets!comun_sidewalk_record_photos_original_asset_id_fkey(object_key,original_filename)",
    )
    .eq("record_id", recordId)
    .maybeSingle();
  if (photoError || !photo)
    throw new Error("A fotografia privada não está pronta para revisão.");
  if (photo.review_status !== "pending" || photo.derivative_asset_id || photo.is_public)
    throw new Error("A fotografia já recebeu uma decisão editorial incompatível.");

  const originalAsset = Array.isArray(photo.comun_archive_assets)
    ? photo.comun_archive_assets[0]
    : photo.comun_archive_assets;
  if (!originalAsset?.object_key)
    throw new Error("O original privado não está disponível para derivação.");

  let derivative:
    | Awaited<ReturnType<typeof generateSidewalkPhotoDerivative>>
    | undefined;
  let recordPublished = false;
  try {
    derivative = await generateSidewalkPhotoDerivative(
      db,
      photo.archive_item_id,
      originalAsset.object_key,
      originalAsset.original_filename ?? "registro.jpg",
    );

    const photoUpdate = await db
      .from("comun_sidewalk_record_photos")
      .update({
        derivative_asset_id: derivative.assetId,
        review_status: "approved",
        is_public: true,
        public_alt_text:
          "Registro comunitário de trecho de calçada, publicado após revisão de privacidade.",
      })
      .eq("id", photo.id)
      .eq("review_status", "pending")
      .is("derivative_asset_id", null);
    if (photoUpdate.error)
      throw new Error("Não foi possível aprovar a derivada pública.");

    const itemUpdate = await db
      .from("comun_archive_items")
      .update({
        status: "published",
        visibility: "public",
        published_at: new Date().toISOString(),
      })
      .eq("id", photo.archive_item_id)
      .eq("visibility", "private");
    if (itemUpdate.error)
      throw new Error("Não foi possível publicar a derivada revisada.");

    const published = await db
      .from("comun_sidewalk_records")
      .update({
        status: "published",
        visibility: "public",
        verification_status: "verified",
        public_geometry_geojson: record.private_geometry_geojson,
        location_precision: "exact",
        public_location_level: "exact",
        public_summary: publicSummary,
        last_observed_at: new Date().toISOString(),
      })
      .eq("id", recordId)
      .eq("status", "under_review")
      .eq("visibility", "internal")
      .select("id")
      .single();
    if (published.error || !published.data)
      throw new Error("Não foi possível publicar o registro com ponto exato.");
    recordPublished = true;

    if (record.member_user_id) {
      const inbox = await db.from("comun_member_inbox").upsert(
        {
          member_user_id: record.member_user_id,
          pauta_id: record.pauta_id,
          notification_type: "sidewalk_report_published",
          title: "Registro de calçada publicado",
          summary:
            "A contribuição foi revisada e publicada com o ponto exato autorizado.",
          action_label: "Abrir no mapa",
          action_url: `/comun/calcadas?registro=${recordId}`,
          priority: "normal",
          dedupe_key: `sidewalk-moderation:${recordId}:approve_exact`,
        },
        { onConflict: "member_user_id,dedupe_key" },
      );
      if (inbox.error)
        throw new Error("Não foi possível registrar a mensagem de acompanhamento.");
    }
  } catch (error) {
    if (recordPublished) {
      await db
        .from("comun_sidewalk_records")
        .update({
          status: "under_review",
          visibility: "internal",
          verification_status: "community_report",
          public_geometry_geojson: null,
          public_summary: null,
        })
        .eq("id", recordId);
    }
    if (derivative) {
      await db
        .from("comun_sidewalk_record_photos")
        .update({
          derivative_asset_id: null,
          review_status: "pending",
          is_public: false,
          public_alt_text: null,
        })
        .eq("id", photo.id);
      await db
        .from("comun_archive_items")
        .update({
          status: "draft",
          visibility: "private",
          published_at: null,
        })
        .eq("id", photo.archive_item_id);
      await db
        .from("comun_archive_assets")
        .delete()
        .eq("id", derivative.assetId);
      await getMediaStorage()
        .removeObject("public_safe", derivative.key)
        .catch(() => undefined);
    }
    throw error;
  }

  await logComunAdminAction({
    session,
    action: "sidewalk_approve_exact",
    targetType: "sidewalk_record",
    targetId: recordId,
    metadata: {
      public_geometry: true,
      public_location_precision: "exact",
      public_image: true,
      consent_source: "confirmed_upload_payload",
    },
  });
  revalidatePath("/comun/admin/calcadas");
  revalidatePath("/comun/calcadas");
}
