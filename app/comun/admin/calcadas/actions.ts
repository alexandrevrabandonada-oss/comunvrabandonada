"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { generateSidewalkPhotoDerivative } from "@/lib/sidewalk-photos";
import { requireSidewalkOperationalRelease } from "@/lib/sidewalk-operational-release";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const decisions = new Set([
  "approve_approximate",
  "publish_without_image",
  "needs_information",
  "reject",
  "withdraw",
]);
const approximate = (geometry: any) =>
  geometry?.type === "Point" && Array.isArray(geometry.coordinates)
    ? {
        type: "Point",
        coordinates: geometry.coordinates.map((v: number) =>
          Number(v.toFixed(3)),
        ),
      }
    : null;

export async function moderateSidewalkRecord(form: FormData) {
  await requireSidewalkOperationalRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const id = String(form.get("record_id") ?? ""),
    decision = String(form.get("decision") ?? "");
  if (!id || !decisions.has(decision))
    throw new Error("Decisão editorial inválida.");
  const { data: record, error } = await db
    .from("comun_sidewalk_records")
    .select("id,member_user_id,pauta_id,private_geometry_geojson,private_notes")
    .eq("id", id)
    .single();
  if (error || !record) throw new Error("Registro não encontrado.");
  const publicSummary = String(form.get("public_summary") ?? "").trim(),
    complementRequest = String(form.get("complement_request") ?? "").trim(),
    complementField = String(form.get("complement_field") ?? "").trim(),
    complementDueAt = String(form.get("complement_due_at") ?? "").trim();
  if (["approve_approximate", "publish_without_image"].includes(decision) && !publicSummary)
    throw new Error("A publicação exige um resumo público sanitizado.");
  if (decision === "needs_information") {
    if (!complementRequest || !complementField)
      throw new Error("Explique o que falta e qual campo ou evidência deve ser complementado.");
    const updated = await db
      .from("comun_sidewalk_records")
      .update({
        status: "under_review",
        verification_status: "community_report",
        complement_request_private: complementRequest.slice(0, 1600),
        complement_field_private: complementField.slice(0, 300),
        complement_due_at: complementDueAt ? new Date(complementDueAt).toISOString() : null,
      })
      .eq("id", id);
    if (updated.error) throw new Error("Não foi possível registrar o pedido de complemento.");
  } else if (decision === "reject") {
    const updated = await db
      .from("comun_sidewalk_records")
      .update({
        status: "rejected",
        visibility: "internal",
        public_geometry_geojson: null,
      })
      .eq("id", id);
    if (updated.error) throw new Error("Não foi possível rejeitar o registro.");
  } else if (decision === "withdraw") {
    const updated = await db
      .from("comun_sidewalk_records")
      .update({
        status: "withdrawn",
        visibility: "internal",
        public_geometry_geojson: null,
    })
      .eq("id", id);
    if (updated.error) throw new Error("Não foi possível retirar o registro.");
  }
  else {
    const publicGeometry = decision === "approve_approximate"
        ? approximate(record.private_geometry_geojson)
        : null;
    if (decision === "approve_approximate" && !publicGeometry)
      throw new Error("A publicação exige uma geometria pública aproximada.");
    let publicationRollback: null | {
      photoId: string;
      itemId: string;
      derivativeId: string;
      derivativeKey: string;
    } = null;
    try {
      if (decision === "approve_approximate") {
      const { data: photo, error: photoError } = await db
        .from("comun_sidewalk_record_photos")
        .select("id,archive_item_id,original_asset_id,comun_archive_assets!comun_sidewalk_record_photos_original_asset_id_fkey(object_key,original_filename)")
        .eq("record_id", id).eq("review_status", "pending").maybeSingle();
      if (photoError || !photo) throw new Error("A fotografia privada não está pronta para revisão.");
      const asset = Array.isArray(photo.comun_archive_assets) ? photo.comun_archive_assets[0] : photo.comun_archive_assets;
      if (!asset?.object_key) throw new Error("O original privado não está disponível para derivação.");
      const derivative = await generateSidewalkPhotoDerivative(db, photo.archive_item_id, asset.object_key, asset.original_filename ?? "registro.jpg");
      const photoUpdate = await db.from("comun_sidewalk_record_photos").update({ derivative_asset_id: derivative.assetId, review_status: "approved", is_public: true, public_alt_text: "Registro comunitário de trecho de calçada, publicado após revisão de privacidade." }).eq("id", photo.id);
      if (photoUpdate.error) throw new Error("Não foi possível aprovar a derivada pública.");
      const itemUpdate = await db.from("comun_archive_items").update({ status: "published", visibility: "public", published_at: new Date().toISOString() }).eq("id", photo.archive_item_id);
      if (itemUpdate.error) throw new Error("Não foi possível publicar a derivada revisada.");
        publicationRollback = {
          photoId: photo.id,
          itemId: photo.archive_item_id,
          derivativeId: derivative.assetId,
          derivativeKey: derivative.key,
        };
      }
      if (decision === "publish_without_image") {
      const photoUpdate = await db.from("comun_sidewalk_record_photos").update({ review_status: "approved_without_image", is_public: false }).eq("record_id", id);
      if (photoUpdate.error) throw new Error("Não foi possível manter a fotografia privada.");
      }
      const published = await db
      .from("comun_sidewalk_records")
      .update({
        status: "published",
        visibility: "public",
        verification_status: "verified",
        public_geometry_geojson: publicGeometry,
        location_precision: publicGeometry ? "approximate" : "hidden",
        last_observed_at: new Date().toISOString(),
        public_summary: publicSummary,
      })
      .eq("id", id);
      if (published.error) throw new Error("Não foi possível publicar o registro revisado.");
    } catch (publicationError) {
      if (publicationRollback) {
        await db.from("comun_sidewalk_record_photos").update({
          derivative_asset_id: null,
          review_status: "pending",
          is_public: false,
          public_alt_text: null,
        }).eq("id", publicationRollback.photoId);
        await db.from("comun_archive_items").update({
          status: "draft",
          visibility: "private",
          published_at: null,
        }).eq("id", publicationRollback.itemId);
        await db.from("comun_archive_assets").delete().eq("id", publicationRollback.derivativeId);
        await import("@/lib/media-storage").then(({ getMediaStorage }) =>
          getMediaStorage().removeObject("public_safe", publicationRollback!.derivativeKey),
        ).catch(() => {});
      }
      throw publicationError;
    }
  }
  if (record.member_user_id) {
    const inbox = await db
      .from("comun_member_inbox")
      .upsert(
        {
          member_user_id: record.member_user_id,
          pauta_id: record.pauta_id,
          notification_type:
            decision.startsWith("approve") || decision.startsWith("publish")
              ? "sidewalk_report_published"
              : "sidewalk_report_verified",
          title: "Atualização no registro de calçada",
          summary:
            decision === "needs_information"
              ? `Falta: ${complementField}. ${complementRequest}${complementDueAt ? ` Prazo: ${new Date(complementDueAt).toLocaleDateString("pt-BR")}.` : ""}`
              : decision === "reject"
                ? "O registro não foi publicado após revisão."
                : "A decisão editorial foi registrada.",
          action_label: "Acompanhar registro",
          action_url: `/comun/minha-participacao?registro=${id}&acao=complementar`,
          priority: "normal",
          dedupe_key: `sidewalk-moderation:${id}:${decision}`,
        },
        { onConflict: "member_user_id,dedupe_key" },
      );
    if (inbox.error) throw new Error("Não foi possível registrar a mensagem de acompanhamento.");
  }
  await logComunAdminAction({
    session,
    action: `sidewalk_${decision}`,
    targetType: "sidewalk_record",
    targetId: id,
    metadata: {
      public_geometry: decision === "approve_approximate",
      public_image: decision === "approve_approximate",
    },
  });
  revalidatePath("/comun/admin/calcadas");
  revalidatePath("/comun/calcadas");
}

export async function moderateSidewalkObservation(form: FormData) {
  await requireSidewalkOperationalRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const id = String(form.get("observation_id") ?? ""),
    status = String(form.get("status") ?? "");
  if (!["approved", "rejected"].includes(status))
    throw new Error("Decisão inválida.");
  const { data: item } = await db
    .from("comun_sidewalk_observations")
    .select("id,record_id,observation_type")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!item) throw new Error("Observação não encontrada.");
  const { error: updateError } = await db
    .from("comun_sidewalk_observations")
    .update({ status })
    .eq("id", id);
  if (updateError) throw new Error("Não foi possível moderar a observação.");
  if (status === "approved") {
    const patch =
      item.observation_type === "resolved"
        ? {
            last_observed_at: new Date().toISOString(),
            forwarding_status: "resolved",
          }
        : item.observation_type === "worse"
          ? {
              last_observed_at: new Date().toISOString(),
              forwarding_status: "reopened",
            }
          : { last_observed_at: new Date().toISOString() };
    const { error: recordError } = await db
      .from("comun_sidewalk_records")
      .update(patch)
      .eq("id", item.record_id);
    if (recordError)
      throw new Error("Não foi possível atualizar o registro observado.");
  }
  const { data: record } = await db
    .from("comun_sidewalk_records")
    .select("slug")
    .eq("id", item.record_id)
    .maybeSingle();
  await logComunAdminAction({
    session,
    action: `sidewalk_observation_${status}`,
    targetType: "sidewalk_observation",
    targetId: id,
  });
  revalidatePath("/comun/admin/calcadas");
  revalidatePath("/comun/calcadas");
  if (record?.slug) revalidatePath(`/comun/calcadas/registros/${record.slug}`);
}

export async function decideSidewalkDuplicate(form: FormData) {
  await requireSidewalkOperationalRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const recordId = String(form.get("record_id") ?? ""),
    candidateRecordId = String(form.get("candidate_record_id") ?? ""),
    decision = String(form.get("decision") ?? ""),
    score = Number(form.get("score") ?? 0),
    signals = String(form.get("signals") ?? "").split(",").filter(Boolean);
  if (!recordId || !candidateRecordId || recordId === candidateRecordId)
    throw new Error("Registros de duplicidade inválidos.");
  if (!["related", "merged", "distinct"].includes(decision))
    throw new Error("Decisão de duplicidade inválida.");
  const saved = await db.from("comun_sidewalk_duplicate_suggestions" as never).upsert({
    record_id: recordId,
    candidate_record_id: candidateRecordId,
    score: Math.max(0, Math.min(100, Math.round(score))),
    signals,
    decision,
    decided_by_admin_id: session.admin.id,
    decided_at: new Date().toISOString(),
  } as never, { onConflict: "record_id,candidate_record_id" });
  if (saved.error) throw new Error("Não foi possível registrar a decisão de duplicidade.");
  await logComunAdminAction({
    session,
    action: `sidewalk_duplicate_${decision}`,
    targetType: "sidewalk_record",
    targetId: recordId,
    metadata: { candidate_record_id: candidateRecordId, score, signals },
  });
  revalidatePath("/comun/admin/calcadas");
}
