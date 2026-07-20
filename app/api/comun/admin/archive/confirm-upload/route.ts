import { NextResponse } from "next/server";
import { getComunAdminSession } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { getMediaStorage } from "@/lib/media-storage";
import type { BucketScope } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getComunAdminSession();
  if (
    !session ||
    !(["admin", "editor"] as string[]).includes(session.admin.role)
  )
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const { assetId } = (await request.json()) as { assetId: string };
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Supabase nao configurado." },
      { status: 500 },
    );
  const { data: asset } = await db
    .from("comun_archive_assets")
    .select(
      "id, archive_item_id, asset_role, bucket_scope, object_key, mime_type, size_bytes",
    )
    .eq("id", assetId)
    .maybeSingle();
  if (!asset)
    return NextResponse.json(
      { error: "Asset nao encontrado." },
      { status: 404 },
    );
  const scope = asset.bucket_scope as BucketScope;
  try {
    const metadata = await getMediaStorage().getObjectMetadata(
      scope,
      asset.object_key,
    );
    if (!metadata) throw new Error("Objeto nao encontrado no storage.");
    if (metadata.contentType !== asset.mime_type)
      throw new Error("Content-Type real difere do upload autorizado.");
    if (metadata.contentLength !== Number(asset.size_bytes))
      throw new Error("Tamanho real difere do upload autorizado.");
    const updated = await db
      .from("comun_archive_assets")
      .update({
        size_bytes: metadata.contentLength,
        mime_type: metadata.contentType,
        checksum_sha256: metadata.checksum ?? null,
      })
      .eq("id", assetId);
    if (updated.error) throw new Error(updated.error.message);
    await logComunAdminAction({
      session,
      action: asset.asset_role === "oral_history_original_audio" ? "oral_history_original_uploaded" : asset.asset_role === "radio_private_original" ? "radio_original_uploaded" : "archive_upload_confirmed",
      targetType: "archive_asset",
      targetId: assetId,
      metadata: {
        archive_item_id: asset.archive_item_id,
        mime_type: metadata.contentType,
        size_bytes: metadata.contentLength,
        bucket_scope: scope,
        checksum_available: Boolean(metadata.checksum),
      },
    });
    return NextResponse.json({
      ok: true,
      metadata: {
        contentType: metadata.contentType,
        contentLength: metadata.contentLength,
        checksumAvailable: Boolean(metadata.checksum),
      },
    });
  } catch (error) {
    try {
      await getMediaStorage().deleteObject(scope, asset.object_key);
    } catch {}
    await db
      .from("comun_archive_assets")
      .update({ review_status: "rejected" })
      .eq("id", assetId);
    await logComunAdminAction({
      session,
      action: "archive_upload_validation_failed",
      targetType: "archive_asset",
      targetId: assetId,
      metadata: {
        archive_item_id: asset.archive_item_id,
        reason: error instanceof Error ? error.message : "validation_failed",
      },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha na validacao do upload.",
      },
      { status: 400 },
    );
  }
}
