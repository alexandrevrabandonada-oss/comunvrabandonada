import { NextResponse } from "next/server";
import { z } from "zod";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  historicalOriginalKey,
  validateHistoricalPhotoUpload,
} from "@/lib/historical-photo";
import { getMediaStorage } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  filename: z.string().min(3).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
});
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Servico indisponivel." },
      { status: 503 },
    );
  const { data: submission } = await db
    .from("comun_archive_submissions")
    .select("id, status, submitter_hash")
    .eq("id", id)
    .maybeSingle();
  if (!submission || submission.status !== "awaiting_upload")
    return NextResponse.json(
      { error: "Contribuicao indisponivel para upload." },
      { status: 409 },
    );
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("comun_admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "archive_submission_upload_requested")
    .eq("target_id", id)
    .gte("created_at", since);
  if ((count ?? 0) >= 10)
    return NextResponse.json(
      { error: "Limite temporario de uploads atingido." },
      { status: 429 },
    );
  try {
    const { extension } = validateHistoricalPhotoUpload(parsed.data);
    const key = historicalOriginalKey(id, extension);
    const { data: asset, error } = await db
      .from("comun_archive_assets")
      .insert({
        archive_item_id: null,
        asset_role: "original",
        bucket_scope: "private_original",
        object_key: key,
        original_filename: parsed.data.filename,
        mime_type: parsed.data.mimeType,
        size_bytes: parsed.data.sizeBytes,
        review_status: "pending",
        integrity_status: "unknown",
      })
      .select("id")
      .single();
    if (error) throw error;
    await db.from("comun_archive_submission_assets").insert({
      submission_id: id,
      archive_asset_id: asset.id,
      upload_status: "authorized",
    });
    const signed = await getMediaStorage().createUploadUrl({
      scope: "private_original",
      key,
      contentType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    });
    await logComunAdminAction({
      action: "archive_submission_upload_requested",
      targetType: "archive_submission",
      targetId: id,
      metadata: {
        mime_type: parsed.data.mimeType,
        size_bytes: parsed.data.sizeBytes,
      },
    });
    return NextResponse.json({
      assetId: asset.id,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel preparar o upload." },
      { status: 400 },
    );
  }
}
