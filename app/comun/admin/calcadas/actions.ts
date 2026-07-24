"use server";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { generateSidewalkPhotoDerivative } from "@/lib/sidewalk-photos";
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
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const id = String(form.get("record_id") ?? ""),
    decision = String(form.get("decision") ?? "");
  if (!id || !decisions.has(decision))
    throw new Error("Decisão editorial inválida.");
  const { data: record, error } = await db
    .from("comun_sidewalk_records")
    .select("id,member_user_id,pauta_id,private_geometry_geojson")
    .eq("id", id)
    .single();
  if (error || !record) throw new Error("Registro não encontrado.");
  if (decision === "needs_information")
    await db
      .from("comun_sidewalk_records")
      .update({
        status: "under_review",
        verification_status: "community_report",
      })
      .eq("id", id);
  else if (decision === "reject")
    await db
      .from("comun_sidewalk_records")
      .update({
        status: "rejected",
        visibility: "internal",
        public_geometry_geojson: null,
      })
      .eq("id", id);
  else if (decision === "withdraw")
    await db
      .from("comun_sidewalk_records")
      .update({
        status: "withdrawn",
        visibility: "internal",
        public_geometry_geojson: null,
      })
      .eq("id", id);
  else {
    const publicGeometry = decision === "approve_approximate"
        ? approximate(record.private_geometry_geojson)
        : null;
    await db
      .from("comun_sidewalk_records")
      .update({
        status: "published",
        visibility: "public",
        verification_status: "verified",
        public_geometry_geojson: publicGeometry,
        location_precision: publicGeometry ? "approximate" : "hidden",
        last_observed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (decision === "publish_without_image")
      await db
        .from("comun_sidewalk_record_photos")
        .update({ review_status: "approved_without_image", is_public: false })
        .eq("record_id", id);
    if (decision === "approve_approximate") {
      const { data: photo } = await db
        .from("comun_sidewalk_record_photos")
        .select(
          "id,archive_item_id,original_asset_id,comun_archive_assets!comun_sidewalk_record_photos_original_asset_id_fkey(object_key,original_filename)",
        )
        .eq("record_id", id)
        .eq("review_status", "pending")
        .maybeSingle();
      const asset = Array.isArray(photo?.comun_archive_assets)
        ? photo.comun_archive_assets[0]
        : photo?.comun_archive_assets;
      if (photo && asset?.object_key) {
        const derivative = await generateSidewalkPhotoDerivative(
          db,
          photo.archive_item_id,
          asset.object_key,
          asset.original_filename ?? "registro.jpg",
        );
        await db
          .from("comun_sidewalk_record_photos")
          .update({
            derivative_asset_id: derivative.assetId,
            review_status: "approved",
            is_public: true,
            public_alt_text:
              "Registro comunitário de trecho de calçada, publicado após revisão de privacidade.",
          })
          .eq("id", photo.id);
        await db
          .from("comun_archive_items")
          .update({
            status: "published",
            visibility: "public",
            published_at: new Date().toISOString(),
          })
          .eq("id", photo.archive_item_id);
      }
    }
  }
  if (record.member_user_id)
    await db
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
              ? "A equipe solicitou informações complementares."
              : decision === "reject"
                ? "O registro não foi publicado após revisão."
                : "A decisão editorial foi registrada.",
          action_url: "/comun/minha-participacao",
          priority: "normal",
          dedupe_key: `sidewalk-moderation:${id}:${decision}`,
        },
        { onConflict: "member_user_id,dedupe_key" },
      );
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
