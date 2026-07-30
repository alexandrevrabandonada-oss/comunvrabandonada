import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getComunAdminSession } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { getMediaStorage, publicMediaUrl } from "@/lib/media-storage";
import { validateRadioUploadMetadata } from "@/lib/radio-media-profile.mjs";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const ROLES = new Set([
  "original",
  "public_version",
  "cover",
  "oral_history_original_audio",
  "oral_history_public_audio_excerpt",
  "oral_history_public_full_audio",
  "oral_history_consent_document",
  "oral_history_transcript_source",
  "oral_history_portrait",
  "oral_history_attachment",
  "radio_private_original",
  "radio_voice_consent_document",
  "radio_music_rights_document",
  "radio_transcript_document",
  "radio_context_document",
]);
const ORAL_AUDIO = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
]);
const RADIO_AUDIO = new Set([
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
]);
const PRIVATE_ORAL_ROLES = new Set([
  "oral_history_original_audio",
  "oral_history_consent_document",
  "oral_history_transcript_source",
  "oral_history_attachment",
]);
const PRIVATE_RADIO_ROLES = new Set([
  "radio_private_original",
  "radio_voice_consent_document",
  "radio_music_rights_document",
  "radio_transcript_document",
  "radio_context_document",
]);
const MAX_URLS_PER_10_MINUTES = 20;

export async function POST(request: Request) {
  const session = await getComunAdminSession();
  if (
    !session ||
    !(["admin", "editor"] as string[]).includes(session.admin.role)
  )
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Supabase nao configurado." },
      { status: 500 },
    );
  let assetId: string | null = null;
  try {
    const body = (await request.json()) as {
      archiveItemId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      role: string;
    };
    if (!body.archiveItemId || !body.filename || !ROLES.has(body.role))
      throw new Error("Dados de upload incompletos.");
    const { data: typedItem } = await db
      .from("comun_archive_items")
      .select("id,item_type")
      .eq("id", body.archiveItemId)
      .maybeSingle();
    if (!typedItem) throw new Error("Item do Acervo nao encontrado.");
    const oralRole = body.role.startsWith("oral_history_");
    const radioRole = body.role.startsWith("radio_");
    if (oralRole && typedItem.item_type !== "oral_history")
      throw new Error("Papel de Historia Oral exige entrevista.");
    if (radioRole && typedItem.item_type !== "community_radio_episode")
      throw new Error("Papel de radio exige episodio.");
    if (body.mimeType.startsWith("video/"))
      throw new Error("Upload de video permanece bloqueado.");
    if (
      body.mimeType.startsWith("audio/") &&
      !(
        (oralRole && ORAL_AUDIO.has(body.mimeType)) ||
        (body.role === "radio_private_original" &&
          RADIO_AUDIO.has(body.mimeType))
      )
    )
      throw new Error("Audio exige papel e MIME autorizados.");
    if (body.role === "radio_private_original") {
      const radioValidation = validateRadioUploadMetadata({
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });
      if (!radioValidation.ok) throw new Error(radioValidation.message);
    }
    if (
      [
        "radio_voice_consent_document",
        "radio_music_rights_document",
        "radio_context_document",
      ].includes(body.role) &&
      body.mimeType !== "application/pdf"
    )
      throw new Error("Documento privado deve ser PDF.");
    if (
      body.role === "radio_transcript_document" &&
      !["text/plain", "text/vtt", "application/pdf"].includes(body.mimeType)
    )
      throw new Error("Transcricao deve ser TXT, VTT ou PDF.");
    if (
      body.role === "oral_history_original_audio" &&
      body.sizeBytes > 500 * 1024 * 1024
    )
      throw new Error("Audio excede 500 MB.");
    if (
      body.role === "oral_history_consent_document" &&
      body.mimeType !== "application/pdf"
    )
      throw new Error("Termo deve ser PDF privado.");
    if (
      body.role === "oral_history_transcript_source" &&
      !["text/plain", "application/pdf"].includes(body.mimeType)
    )
      throw new Error("Fonte de transcricao deve ser TXT ou PDF.");
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await db
      .from("comun_admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", session.admin.id)
      .eq("action", "archive_upload_url_created")
      .gte("created_at", since);
    if (rateLimitError)
      throw new Error("Nao foi possivel validar o limite de uploads.");
    if ((count ?? 0) >= MAX_URLS_PER_10_MINUTES) {
      await logComunAdminAction({
        session,
        action: "archive_upload_rate_limited",
        targetType: "archive_item",
        targetId: body.archiveItemId,
      });
      return NextResponse.json(
        {
          error:
            "Limite temporario de URLs de upload atingido. Aguarde alguns minutos.",
        },
        { status: 429 },
      );
    }
    const extension = body.filename.split(".").pop()?.toLowerCase() ?? "";
    const scope = PRIVATE_RADIO_ROLES.has(body.role)
      ? "radio_private_original"
      : body.role === "original" || PRIVATE_ORAL_ROLES.has(body.role)
        ? "private_original"
        : ("public_safe" as const);
    const created = await db
      .from("comun_archive_assets")
      .insert({
        archive_item_id: body.archiveItemId,
        asset_role: body.role,
        bucket_scope: scope,
        object_key: `smoke/pending/${randomUUID()}`,
        public_url: null,
        original_filename: body.filename,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        review_status: "pending",
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);
    assetId = created.data.id;
    const key =
      scope === "radio_private_original"
        ? `radio-originals/${body.archiveItemId}/${randomUUID()}.${extension}`
        : scope === "private_original"
          ? `originals/${body.archiveItemId}/${randomUUID()}.${extension}`
          : `public/${body.archiveItemId}/${assetId}/${randomUUID()}.${extension}`;
    const signed = await getMediaStorage().createUploadUrl({
      scope,
      key,
      contentType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });
    const updated = await db
      .from("comun_archive_assets")
      .update({
        object_key: key,
        public_url: scope === "public_safe" ? publicMediaUrl(key) : null,
      })
      .eq("id", assetId);
    if (updated.error) throw new Error(updated.error.message);
    await logComunAdminAction({
      session,
      action: "archive_upload_url_created",
      targetType: "archive_asset",
      targetId: assetId,
      metadata: {
        archive_item_id: body.archiveItemId,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        bucket_scope: scope,
      },
    });
    return NextResponse.json({
      assetId,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    });
  } catch (error) {
    if (assetId)
      await db.from("comun_archive_assets").delete().eq("id", assetId);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao preparar upload.",
      },
      { status: 400 },
    );
  }
}
