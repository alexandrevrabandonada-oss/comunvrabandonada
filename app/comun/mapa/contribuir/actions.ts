"use server";
import { createHash, randomUUID } from "node:crypto";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireCommunitySession } from "@/lib/community-auth";
import { safeCommunityReturn } from "@/lib/community-return";
import { getMediaStorage } from "@/lib/media-storage";
import { validateSidewalkPhotoImage } from "@/lib/sidewalk-photos";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function submitTerritorialContribution(f: FormData) {
  if (String(f.get("company_website") ?? "").trim())
    redirect("/comun/mapa/contribuir?status=recebido");
  const summary = String(f.get("public_summary") ?? "").trim(),
    contact = String(f.get("contact_private") ?? "").trim();
  if (summary.length < 20 || summary.length > 2000)
    throw new Error("A contribuição deve ter entre 20 e 2.000 caracteres.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const hash = createHash("sha256")
      .update(
        `${contact.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`,
      )
      .digest("hex"),
    since = new Date(Date.now() - 86400000).toISOString(),
    count = await db
      .from("comun_territorial_contributions")
      .select("id", { count: "exact", head: true })
      .eq("submitter_hash", hash)
      .gte("created_at", since);
  if ((count.count ?? 0) >= 5)
    throw new Error("Limite diário atingido. Tente novamente amanhã.");
  const { error } = await db.from("comun_territorial_contributions").insert({
    contribution_type: String(f.get("contribution_type") ?? "history"),
    territory_id: String(f.get("territory_id") ?? "") || null,
    public_summary: summary,
    approximate_location:
      String(f.get("approximate_location") ?? "").slice(0, 300) || null,
    contact_private: contact.slice(0, 300) || null,
    raw_details_private:
      String(f.get("raw_details_private") ?? "").slice(0, 4000) || null,
    submitter_hash: hash,
    status: "pending",
  });
  if (error) throw new Error(error.message);
  redirect("/comun/mapa/contribuir?status=recebido");
}

type DirectUploadPayload = {
  pauta_slug: string;
  return_to: string;
  description: string;
  category: string;
  problems: string;
  condition: string;
  longitude: string;
  latitude: string;
  location_accuracy_m: string;
  location_source: string;
  affected_groups: string;
  consent_publish: string;
};

export async function authorizeSidewalkPhotoUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  payload: DirectUploadPayload;
}) {
  const { user } = await requireCommunitySession(
      "/comun/mapa/contribuir?origem=calcadas",
    ),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço local indisponível.");
  if (
    !/\.(jpe?g|png|webp)$/i.test(input.filename) ||
    !["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)
  )
    throw new Error("Formato de fotografia inválido.");
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 12 ||
    input.sizeBytes > 30 * 1024 * 1024
  )
    throw new Error("Tamanho de fotografia inválido.");
  const uploadId = randomUUID(),
    extension =
      input.mimeType === "image/png"
        ? "png"
        : input.mimeType === "image/webp"
          ? "webp"
          : "jpg",
    objectKey = `originals/sidewalk/${user.id}/${uploadId}.${extension}`,
    expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const created = await db.from("comun_sidewalk_uploads").insert({
    id: uploadId,
    member_user_id: user.id,
    object_key: objectKey,
    original_filename: input.filename.slice(0, 240),
    declared_mime_type: input.mimeType,
    declared_size_bytes: input.sizeBytes,
    submission_payload: input.payload,
    status: "awaiting_upload",
    expires_at: expiresAt,
  });
  if (created.error) throw new Error("Não foi possível autorizar o envio.");
  const signed = await db.storage
    .from("archive-private-originals")
    .createSignedUploadUrl(objectKey, { upsert: false });
  if (signed.error || !signed.data) {
    await db
      .from("comun_sidewalk_uploads")
      .update({ status: "upload_failed", failure_code: "signed_url" })
      .eq("id", uploadId);
    throw new Error("Não foi possível autorizar o envio.");
  }
  return {
    uploadId,
    path: signed.data.path,
    token: signed.data.token,
    expiresAt,
  };
}

export async function confirmSidewalkPhotoUpload(uploadId: string) {
  const { user } = await requireCommunitySession(
      "/comun/mapa/contribuir?origem=calcadas",
    ),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço local indisponível.");
  const ticket = await db
    .from("comun_sidewalk_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("member_user_id", user.id)
    .single();
  if (ticket.error || !ticket.data) throw new Error("Envio não encontrado.");
  if (ticket.data.status === "confirmed" && ticket.data.record_id)
    redirect(
      `/comun/mapa/contribuir/confirmacao?registro=${ticket.data.record_id}&returnTo=${encodeURIComponent("/comun/calcadas")}`,
    );
  if (new Date(ticket.data.expires_at).getTime() < Date.now()) {
    await db
      .from("comun_sidewalk_uploads")
      .update({ status: "abandoned", failure_code: "expired" })
      .eq("id", uploadId);
    throw new Error("A autorização expirou. Tente enviar novamente.");
  }
  if (!["awaiting_upload", "uploaded"].includes(ticket.data.status))
    throw new Error("Este envio não pode mais ser confirmado.");
  const downloaded = await db.storage
    .from("archive-private-originals")
    .download(ticket.data.object_key);
  if (downloaded.error || !downloaded.data) {
    await db
      .from("comun_sidewalk_uploads")
      .update({ status: "upload_failed", failure_code: "object_missing" })
      .eq("id", uploadId);
    throw new Error("A fotografia ainda não chegou ao armazenamento privado.");
  }
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  await validateSidewalkPhotoImage(bytes, ticket.data.original_filename);
  if (ticket.data.status === "awaiting_upload")
    await db
      .from("comun_sidewalk_uploads")
      .update({
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
        failure_code: null,
      })
      .eq("id", uploadId)
      .eq("member_user_id", user.id)
      .eq("status", "awaiting_upload");
  const claim = await db
    .from("comun_sidewalk_uploads")
    .update({ failure_code: "confirming" })
    .eq("id", uploadId)
    .eq("member_user_id", user.id)
    .eq("status", "uploaded")
    .is("failure_code", null)
    .select("id")
    .maybeSingle();
  if (!claim.data) {
    const latest = await db
      .from("comun_sidewalk_uploads")
      .select("status,record_id")
      .eq("id", uploadId)
      .eq("member_user_id", user.id)
      .single();
    if (latest.data?.status === "confirmed" && latest.data.record_id)
      redirect(
        `/comun/mapa/contribuir/confirmacao?registro=${latest.data.record_id}&returnTo=${encodeURIComponent("/comun/calcadas")}`,
      );
    throw new Error(
      "Este envio já está sendo confirmado. Aguarde antes de tentar novamente.",
    );
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(
    ticket.data.submission_payload as DirectUploadPayload,
  ))
    form.set(key, String(value));
  form.set(
    "photo",
    new File([bytes], ticket.data.original_filename, {
      type: ticket.data.declared_mime_type,
    }),
  );
  await persistAuthenticatedSidewalkRecord(form, {
    uploadId,
    objectKey: ticket.data.object_key,
  });
}

async function persistAuthenticatedSidewalkRecord(
  f: FormData,
  directUpload?: { uploadId: string; objectKey: string },
) {
  const returnTo = safeCommunityReturn(f.get("return_to"), "/comun/calcadas"),
    { user } = await requireCommunitySession(
      "/comun/mapa/contribuir?origem=calcadas",
    ),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço local indisponível.");
  const description = String(f.get("description") ?? "").trim(),
    category = String(f.get("category") ?? ""),
    problems = String(f.get("problems") ?? "")
      .split(",")
      .filter(Boolean),
    condition = String(f.get("condition") ?? ""),
    affectedGroups = String(f.get("affected_groups") ?? "")
      .split(",")
      .filter(Boolean),
    consentPublish = String(f.get("consent_publish") ?? "") === "yes",
    longitude = Number(f.get("longitude")),
    latitude = Number(f.get("latitude")),
    hasPoint =
      Number.isFinite(longitude) &&
      Number.isFinite(latitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90;
  const photo = f.get("photo"),
    locationAccuracy = Number(f.get("location_accuracy_m")),
    isAnonymous = Boolean(user.is_anonymous);
  if (!hasPoint) throw new Error("Confirme o ponto no mapa antes de enviar.");
  if (!(photo instanceof File) || !photo.size)
    throw new Error("Escolha uma fotografia antes de enviar.");
  if (!consentPublish)
    throw new Error("Confirme o consentimento para a publicação sanitizada.");
  if (description.length > 600)
    throw new Error("A descrição deve ter no máximo 600 caracteres.");
  if (
    ![
      "buraco",
      "irregular",
      "sem_rampa",
      "obstaculo",
      "estreita",
      "inexistente",
      "entulho",
      "vegetacao",
      "poste",
      "outro",
    ].includes(category) ||
    !["good", "regular", "bad", "terrible"].includes(condition)
  )
    throw new Error("Classificação inválida.");
  const { data: pauta, error: pautaError } = await db
    .from("comun_pauta_spaces")
    .select("id,slug,title")
    .eq("slug", String(f.get("pauta_slug") ?? "calcadas-em-circulacao"))
    .single();
  if (pautaError || !pauta) throw new Error("Pauta das calçadas indisponível.");
  const [hourly, daily] = await Promise.all([
    db
      .from("comun_sidewalk_records")
      .select("id", { count: "exact", head: true })
      .eq("member_user_id", user.id)
      .gte("created_at", new Date(Date.now() - 3_600_000).toISOString()),
    db
      .from("comun_sidewalk_records")
      .select("id", { count: "exact", head: true })
      .eq("member_user_id", user.id)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if ((hourly.count ?? 0) >= 5 || (daily.count ?? 0) >= 30)
    throw new Error(
      "Limite temporário de envios atingido. Tente novamente mais tarde.",
    );
  const id = randomUUID(),
    slug = `registro-${id.slice(0, 8)}`,
    location =
      String(f.get("approximate_location") ?? "")
        .trim()
        .slice(0, 120) || "Localização protegida",
    privateGeometry = hasPoint
      ? { type: "Point", coordinates: [longitude, latitude] }
      : null,
    impact =
      condition === "terrible"
        ? "critical"
        : condition === "bad"
          ? "high"
          : condition === "regular"
            ? "medium"
            : "low";
  const { error } = await db.from("comun_sidewalk_records").insert({
    id,
    pauta_id: pauta.id,
    member_user_id: user.id,
    submitter_is_anonymous: isAnonymous,
    location_accuracy_m: Number.isFinite(locationAccuracy)
      ? locationAccuracy
      : null,
    slug,
    name: "Registro comunitário de calçada",
    geometry_geojson: null,
    private_geometry_geojson: privateGeometry,
    public_geometry_geojson: null,
    municipality: "Volta Redonda",
    neighborhood: String(f.get("neighborhood") ?? "").slice(0, 120) || null,
    location_source: hasPoint
      ? String(f.get("location_source") ?? "manual")
      : "neighborhood",
    location_precision: hasPoint ? "exact" : "neighborhood",
    condition,
    forwarding_status: "no_action",
    last_observed_at: new Date().toISOString(),
    categories: problems.length ? problems : [category],
    impact_level: impact,
    affected_groups: affectedGroups.filter((value) =>
      [
        "wheelchair_users",
        "visually_impaired",
        "elderly",
        "children",
        "strollers",
        "temporary_mobility",
        "general_public",
      ].includes(value),
    ),
    status: "under_review",
    verification_status: "community_report",
    visibility: "internal",
    public_summary: description || `Avaliação comunitária: ${condition}.`,
    private_notes: null,
    public_location_level: hasPoint ? "approximate" : "neighborhood",
    approximate_location: location,
  });
  if (error) throw new Error("Não foi possível registrar a contribuição.");
  if (photo instanceof File && photo.size) {
    const bytes = new Uint8Array(await photo.arrayBuffer()),
      meta = await validateSidewalkPhotoImage(bytes, photo.name),
      item = await db
        .from("comun_archive_items")
        .insert({
          item_type: "photograph",
          slug: `foto-${slug}`,
          title: "Foto privada de registro de calçada",
          summary: "Imagem aguardando revisão de privacidade.",
          status: "draft",
          visibility: "private",
          rights_status: "permission_granted",
        })
        .select("id")
        .single();
    if (item.error || !item.data)
      throw new Error("Não foi possível preparar a fotografia.");
    const key =
      directUpload?.objectKey ??
      `originals/sidewalk/${item.data.id}/${randomUUID()}.jpg`;
    if (!directUpload)
      await getMediaStorage().putObject({
        scope: "private_original",
        key,
        contentType: meta.mime,
        sizeBytes: bytes.byteLength,
        body: bytes,
      });
    const asset = await db
      .from("comun_archive_assets")
      .insert({
        archive_item_id: item.data.id,
        asset_role: "original",
        storage_provider: "supabase-local",
        bucket_scope: "private_original",
        object_key: key,
        original_filename: photo.name,
        mime_type: meta.mime,
        size_bytes: meta.size,
        width: meta.width,
        height: meta.height,
        checksum_sha256: meta.checksum,
        review_status: "pending",
      })
      .select("id")
      .single();
    if (asset.error || !asset.data)
      throw new Error("Não foi possível registrar a fotografia.");
    await db.from("comun_sidewalk_record_photos").insert({
      record_id: id,
      archive_item_id: item.data.id,
      original_asset_id: asset.data.id,
      review_status: "pending",
      checklist: {},
      is_public: false,
    });
    if (directUpload)
      await db
        .from("comun_sidewalk_uploads")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          record_id: id,
          failure_code: null,
        })
        .eq("id", directUpload.uploadId)
        .eq("member_user_id", user.id);
  }
  if (!isAnonymous)
    await db.from("comun_pauta_memberships").upsert(
      {
        pauta_id: pauta.id,
        member_user_id: user.id,
        role: "participant",
        status: "active",
        left_at: null,
      },
      { onConflict: "pauta_id,member_user_id" },
    );
  await db.from("comun_member_inbox").upsert(
    {
      member_user_id: user.id,
      pauta_id: pauta.id,
      notification_type: "sidewalk_report_received",
      title: "Registro de calçada recebido",
      summary:
        "A equipe revisará contexto, privacidade e localização antes de publicar.",
      action_url: `/comun/minha-participacao?registro=${id}`,
      priority: "normal",
      dedupe_key: `sidewalk-received:${id}`,
    },
    { onConflict: "member_user_id,dedupe_key" },
  );
  redirect(
    `/comun/mapa/contribuir/confirmacao?registro=${id}&returnTo=${encodeURIComponent(returnTo)}`,
  );
}

export type SidewalkSubmissionState = { error?: string } | null;
const safeSubmissionMessages = new Set([
  "Serviço local indisponível.",
  "Confirme o ponto no mapa antes de enviar.",
  "Escolha uma fotografia antes de enviar.",
  "Confirme o consentimento para a publicação sanitizada.",
  "Este envio já está sendo confirmado. Aguarde antes de tentar novamente.",
  "Limite temporário de envios atingido. Tente novamente mais tarde.",
  "A descrição deve ter no máximo 600 caracteres.",
  "Classificação inválida.",
  "Pauta das calçadas indisponível.",
  "Não foi possível registrar a contribuição.",
  "Não foi possível preparar a fotografia.",
  "Não foi possível registrar a fotografia.",
]);
export async function submitAuthenticatedSidewalkRecord(
  _: SidewalkSubmissionState,
  f: FormData,
): Promise<SidewalkSubmissionState> {
  try {
    await persistAuthenticatedSidewalkRecord(f);
    return null;
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && safeSubmissionMessages.has(error.message)
        ? error.message
        : "Não foi possível enviar agora. Seu contexto foi mantido; tente novamente.";
    return { error: message };
  }
}
