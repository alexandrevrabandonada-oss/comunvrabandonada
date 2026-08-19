"use server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCommunitySession } from "@/lib/community-auth";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { artworkPublicationBlockers } from "@/lib/archive/territorial-art";
import { getMediaStorage } from "@/lib/media-storage";
import {
  processArtworkDerivatives,
  validateArtworkImage,
} from "@/lib/archive/artwork-storage";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  CULTURAL_RIGHTS_CONTRACT_VERSION,
  decideArtworkRights,
  isComunCulturalProgressiveRightsEnabled,
} from "@/lib/comun-cultural-progressive-rights";

export async function submitArtworkContribution(
  _: unknown,
  formData: FormData,
) {
  const session = await getCommunitySession();
  const db = createServiceSupabaseClient();
  if (!db) return { error: "Envio indisponível." };
  const title = String(formData.get("title") || "")
      .trim()
      .slice(0, 160),
    context = String(formData.get("context") || "")
      .trim()
      .slice(0, 4000),
    credit = String(formData.get("credit") || "")
      .trim()
      .slice(0, 240);
  if (
    title.length < 3 ||
    context.length < 20 ||
    !credit ||
    formData.get("truth") !== "on" ||
    formData.get("moderation") !== "on" ||
    formData.get("withdrawal") !== "on" ||
    (!isComunCulturalProgressiveRightsEnabled() &&
      formData.get("authorized") !== "on")
  )
    return { error: "Revise os campos e as quatro declarações obrigatórias." };
  const progressive = isComunCulturalProgressiveRightsEnabled();
  const rights = progressive
    ? decideArtworkRights({
        authorshipBasis: String(formData.get("authorshipBasis") || ""),
        publicationScope: String(formData.get("publicationScope") || ""),
        reusePermission: String(formData.get("reusePermission") || ""),
        identityPreference: String(formData.get("identityPreference") || ""),
        licenseCode: String(formData.get("licenseCode") || ""),
      })
    : null;
  if (progressive && !rights)
    return {
      error: "Complete as escolhas de autoria, identificação e escopo de uso.",
    };
  const protocol = `ARTE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { error } = await db
    .from("comun_archive_artwork_submissions" as never)
    .insert({
      member_user_id: session?.user.id ?? null,
      public_protocol: protocol,
      submission_kind: String(formData.get("submission_kind") || "own_work"),
      title_suggestion: title,
      artwork_type: String(formData.get("artwork_type") || "other"),
      context_suggestion: context,
      creator_credit_suggestion: credit,
      authorship_source:
        String(formData.get("source") || "")
          .trim()
          .slice(0, 500) || null,
      private_contact:
        String(formData.get("contact") || "")
          .trim()
          .slice(0, 200) || null,
      status: "pending",
      is_author_or_authorized: true,
      information_true_declared: true,
      moderation_understood: true,
      correction_withdrawal_understood: true,
      ...(progressive
        ? {
            authorship_basis: formData.get("authorshipBasis"),
            publication_scope: formData.get("publicationScope"),
            reuse_permission: formData.get("reusePermission"),
            license_code: formData.get("licenseCode"),
            identity_preference: formData.get("identityPreference"),
            rights_state: rights?.state,
            rights_contract_version: CULTURAL_RIGHTS_CONTRACT_VERSION,
            rights_declared_at: new Date().toISOString(),
          }
        : {}),
      next_action_public: "Aguardar triagem da curadoria.",
    } as never);
  if (error) return { error: "Não foi possível registrar a contribuição." };
  revalidatePath("/comun/minha-participacao");
  return { ok: true, protocol };
}

export async function createArtworkAdminAction(formData: FormData) {
  await requireComunAdmin();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Título obrigatório.");
  const slug = String(formData.get("slug") || title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const { data: item, error } = await db
    .from("comun_archive_items" as never)
    .insert({
      slug,
      item_type: "territorial_artwork",
      title,
      summary: String(formData.get("description") || "")
        .trim()
        .slice(0, 500),
      status: "draft",
      visibility: "private",
      rights_status: "unknown",
    } as never)
    .select("id")
    .single();
  if (error || !item) throw new Error(error?.message || "Falha ao criar obra.");
  await db.from("comun_archive_artworks" as never).insert({
    archive_item_id: (item as any).id,
    artwork_type: String(formData.get("artwork_type") || "other"),
    title_public: title,
    description_public: String(formData.get("description") || "").trim(),
    context_public: String(formData.get("context") || "").trim(),
    technique_public: String(formData.get("technique") || "").trim() || null,
    territory_absence_reason:
      String(formData.get("territory_absence_reason") || "").trim() || null,
  } as never);
  redirect(`/comun/admin/acervo/arte/${(item as any).id}`);
}

export async function publishArtworkAdminAction(formData: FormData) {
  const session = await requireComunAdmin();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const id = String(formData.get("id") || "");
  const [
    { data: item },
    { data: art },
    { data: credits, count: creditCount },
    { data: rights },
    { data: assets },
    { data: safety },
  ] = await Promise.all([
    db
      .from("comun_archive_items" as never)
      .select("title,description" as never)
      .eq("id" as never, id)
      .single(),
    db
      .from("comun_archive_artworks" as never)
      .select("*" as never)
      .eq("archive_item_id" as never, id)
      .single(),
    db
      .from("comun_archive_artwork_credits" as never)
      .select("id" as never, { count: "exact" })
      .eq("archive_item_id" as never, id),
    db
      .from("comun_archive_artwork_rights" as never)
      .select("*" as never)
      .eq("archive_item_id" as never, id)
      .maybeSingle(),
    db
      .from("comun_archive_assets" as never)
      .select(
        "asset_role,bucket_scope,review_status,object_key,alt_text" as never,
      )
      .eq("archive_item_id" as never, id),
    db
      .from("comun_archive_artwork_safety_reviews" as never)
      .select("*" as never)
      .eq("archive_item_id" as never, id)
      .maybeSingle(),
  ]);
  const aa = (assets || []) as any[],
    ss = safety as any,
    rr = rights as any,
    a = art as any,
    i = item as any;
  const publicDerivatives = aa.filter(
    (x) =>
      ["artwork_public_detail", "artwork_public_card"].includes(x.asset_role) &&
      x.bucket_scope === "public_safe" &&
      x.review_status === "approved",
  );
  const storage = getMediaStorage();
  const publicDerivativeObjectVerified =
    publicDerivatives.length > 0 &&
    (
      await Promise.all(
        publicDerivatives.map((x) =>
          storage.objectExists("public_safe", x.object_key),
        ),
      )
    ).every(Boolean);
  const blockers = artworkPublicationBlockers({
    title: i?.title,
    description: a?.description_public,
    context: a?.context_public,
    credits: creditCount || 0,
    territoryId: a?.territory_id,
    territoryAbsenceReason: a?.territory_absence_reason,
    privateOriginal: aa.some(
      (x) =>
        x.asset_role === "artwork_private_original" &&
        x.bucket_scope === "private_original",
    ),
    publicDerivative: publicDerivatives.length > 0,
    publicDerivativeAltText: publicDerivatives.every((x) =>
      Boolean(x.alt_text?.trim()),
    ),
    publicDerivativeObjectVerified,
    allowDisplay: rr?.allow_comun_display === true,
    consentStatus: rr?.consent_status,
    validFrom: rr?.valid_from,
    validUntil: rr?.valid_until,
    safetyRequired: Boolean(
      ss?.creator_minor_private ||
      ss?.depicted_minor_private ||
      ss?.identifiable_people_private ||
      ss?.sensitive_location_private,
    ),
    safetyApproved: ss?.reinforced_review_status === "approved",
  });
  if (blockers.length)
    redirect(
      `/comun/admin/acervo/arte/${id}?bloqueios=${encodeURIComponent(blockers.join(","))}`,
    );
  const now = new Date().toISOString();
  await Promise.all([
    db
      .from("comun_archive_items" as never)
      .update({
        status: "published",
        visibility: "public",
        published_at: now,
        rights_status: "permission_granted",
      } as never)
      .eq("id" as never, id),
    db
      .from("comun_archive_artworks" as never)
      .update({ publication_status: "published" } as never)
      .eq("archive_item_id" as never, id),
    db.from("comun_archive_artwork_editorial_versions" as never).insert({
      archive_item_id: id,
      version_number: Date.now(),
      change_type: "publication",
      created_by: session.user.id,
      sanitized_snapshot: {
        title: i.title,
        description: a.description_public,
        context: a.context_public,
        credit_count: creditCount,
        rights_public: {
          license: rr.license_public,
          required_credit: rr.required_credit_public,
        },
        publication: "published",
      },
    } as never),
  ]);
  revalidatePath("/comun/acervo");
  revalidatePath("/comun/acervo/arte");
  redirect(`/comun/acervo/arte/${String(formData.get("slug") || "")}`);
}

export async function saveArtworkCreditAction(formData: FormData) {
  await requireComunAdmin();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const itemId = String(formData.get("id") || "");
  const name = String(formData.get("public_name") || "").trim();
  if (!itemId || !name) throw new Error("Crédito inválido.");
  const slug = `${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const { data: agent, error } = await db
    .from("comun_archive_agents" as never)
    .insert({
      agent_type: String(formData.get("agent_type") || "person"),
      public_name: name,
      public_slug: slug,
      public_visibility:
        formData.get("public_visibility") === "public" ? "public" : "private",
      status:
        formData.get("public_visibility") === "public"
          ? "published"
          : "approved",
    } as never)
    .select("id")
    .single();
  if (error || !agent) throw new Error(error?.message || "Falha no agente.");
  await db.from("comun_archive_artwork_credits" as never).insert({
    archive_item_id: itemId,
    agent_id: (agent as any).id,
    credit_role: String(formData.get("credit_role") || "creator"),
    public_credit: name,
    position: Number(formData.get("position") || 0),
    public_visibility: "public",
  } as never);
  revalidatePath(`/comun/admin/acervo/arte/${itemId}`);
}

export async function saveArtworkRightsAction(formData: FormData) {
  await requireComunAdmin();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const id = String(formData.get("id") || "");
  const value = (name: string) => formData.get(name) === "on";
  await db.from("comun_archive_artwork_rights" as never).upsert(
    {
      archive_item_id: id,
      consent_status: String(formData.get("consent_status") || "pending"),
      allow_private_preservation: value("allow_private_preservation"),
      allow_comun_display: value("allow_comun_display"),
      allow_social_media: value("allow_social_media"),
      allow_print: value("allow_print"),
      allow_exhibition: value("allow_exhibition"),
      allow_educational_use: value("allow_educational_use"),
      allow_campaign_use: value("allow_campaign_use"),
      allow_crop: value("allow_crop"),
      allow_derivative_use: value("allow_derivative_use"),
      allow_download: value("allow_download"),
      allow_third_party_reuse: value("allow_third_party_reuse"),
      required_credit_public:
        String(formData.get("required_credit_public") || "").trim() || null,
      license_public:
        String(formData.get("license_public") || "").trim() || null,
      valid_from: String(formData.get("valid_from") || "") || null,
      valid_until: String(formData.get("valid_until") || "") || null,
      reviewed_at: new Date().toISOString(),
    } as never,
    { onConflict: "archive_item_id" as never },
  );
  revalidatePath(`/comun/admin/acervo/arte/${id}`);
}

export async function uploadArtworkOriginalLocalAction(formData: FormData) {
  const session = await requireComunAdmin(),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const id = String(formData.get("id") || ""),
    file = formData.get("file");
  if (!(file instanceof File) || !id) throw new Error("Arquivo obrigatório.");
  const body = new Uint8Array(await file.arrayBuffer()),
    meta = await validateArtworkImage(body, file.type, file.name),
    key = `originals/${id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
  const storage = getMediaStorage();
  await logComunAdminAction({
    session,
    action: "artwork_original_upload_started",
    targetType: "territorial_artwork",
    targetId: id,
    metadata: { status: "uploading", mime: file.type, size: body.length },
  });
  await storage.putObject({
    scope: "private_original",
    key,
    contentType: file.type,
    sizeBytes: body.length,
    body,
  });
  await db.from("comun_archive_assets" as never).insert({
    archive_item_id: id,
    asset_role: "artwork_private_original",
    storage_provider: "supabase-local",
    bucket_scope: "private_original",
    object_key: key,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: body.length,
    checksum_sha256: meta.checksum,
    width: meta.width,
    height: meta.height,
    review_status: "approved",
    integrity_status: "verified",
    rights_status: "pending",
  } as never);
  await logComunAdminAction({
    session,
    action: "artwork_original_uploaded",
    targetType: "territorial_artwork",
    targetId: id,
    metadata: {
      status: "ready_for_review",
      mime: file.type,
      size: body.length,
      width: meta.width,
      height: meta.height,
    },
  });
  revalidatePath(`/comun/admin/acervo/arte/${id}`);
}

export async function processArtworkDerivativesLocalAction(formData: FormData) {
  const session = await requireComunAdmin(),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const id = String(formData.get("id") || "");
  const altText = String(formData.get("alt_text") || "")
    .trim()
    .slice(0, 500);
  if (altText.length < 8)
    throw new Error(
      "Descrição acessível obrigatória para as derivadas públicas.",
    );
  const [{ data: rights }, { data: asset }] = await Promise.all([
    db
      .from("comun_archive_artwork_rights" as never)
      .select("allow_comun_display" as never)
      .eq("archive_item_id" as never, id)
      .maybeSingle(),
    db
      .from("comun_archive_assets" as never)
      .select("object_key,mime_type,original_filename" as never)
      .eq("archive_item_id" as never, id)
      .eq("asset_role" as never, "artwork_private_original")
      .order("created_at" as never, { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!(rights as any)?.allow_comun_display)
    throw new Error(
      "Direito de exibição necessário antes de criar derivadas públicas.",
    );
  if (!asset) throw new Error("Original privado ausente.");
  await logComunAdminAction({
    session,
    action: "artwork_processing_started",
    targetType: "territorial_artwork",
    targetId: id,
    metadata: { status: "processing" },
  });
  const result = await processArtworkDerivatives({
    itemId: id,
    originalKey: (asset as any).object_key,
    mime: (asset as any).mime_type,
    filename: (asset as any).original_filename,
  });
  for (const x of result.outputs) {
    const role = `artwork_public_${x.role}`;
    await db
      .from("comun_archive_assets" as never)
      .delete()
      .eq("archive_item_id" as never, id)
      .eq("asset_role" as never, role);
    await db.from("comun_archive_assets" as never).insert({
      archive_item_id: id,
      asset_role: role,
      storage_provider: "supabase-local",
      bucket_scope: "public_safe",
      object_key: x.key,
      public_url: x.url,
      mime_type: "image/webp",
      size_bytes: x.size,
      checksum_sha256: x.checksum,
      width: x.width,
      height: x.height,
      alt_text: altText,
      review_status: "approved",
      integrity_status: "verified",
      rights_status: "permission_granted",
    } as never);
  }
  await logComunAdminAction({
    session,
    action: "artwork_derivatives_generated",
    targetType: "territorial_artwork",
    targetId: id,
    metadata: {
      status: "completed",
      count: result.outputs.length,
      accessibility: "alt_text_recorded",
    },
  });
  revalidatePath(`/comun/admin/acervo/arte/${id}`);
}
