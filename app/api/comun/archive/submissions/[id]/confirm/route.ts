import { NextResponse } from "next/server";
import sharp from "sharp";
import { logComunAdminAction } from "@/lib/admin-audit";
import { photoChecksum } from "@/lib/historical-photo";
import { getMediaStorage } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { assetId } = (await request.json()) as { assetId?: string };
  const db = createServiceSupabaseClient();
  if (!db || !assetId)
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  const { data: link } = await db
    .from("comun_archive_submission_assets")
    .select(
      "archive_asset_id, comun_archive_assets(id, object_key, mime_type, size_bytes)",
    )
    .eq("submission_id", id)
    .eq("archive_asset_id", assetId)
    .maybeSingle();
  const raw = link?.comun_archive_assets as unknown as {
    id: string;
    object_key: string;
    mime_type: string;
    size_bytes: number;
  } | null;
  if (!raw)
    return NextResponse.json(
      { error: "Upload nao encontrado." },
      { status: 404 },
    );
  try {
    const meta = await getMediaStorage().getObjectMetadata(
      "private_original",
      raw.object_key,
    );
    if (
      !meta ||
      meta.contentType !== raw.mime_type ||
      meta.contentLength !== Number(raw.size_bytes)
    )
      throw new Error("Arquivo recebido difere do autorizado.");
    const signed = await getMediaStorage().createPrivateReadUrl(
      raw.object_key,
      120,
    );
    const response = await fetch(signed.url, { cache: "no-store" });
    if (!response.ok) throw new Error("Original privado indisponivel.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const image = await sharp(bytes, { failOn: "error" }).metadata();
    if (
      !image.width ||
      !image.height ||
      !["jpeg", "png", "webp"].includes(image.format || "")
    )
      throw new Error("Conteudo nao e uma fotografia valida.");
    const checksum = photoChecksum(bytes);
    const { data: duplicate } = await db
      .from("comun_archive_assets")
      .select("id, archive_item_id")
      .eq("checksum_sha256", checksum)
      .neq("id", assetId)
      .limit(1)
      .maybeSingle();
    await db
      .from("comun_archive_assets")
      .update({
        checksum_sha256: checksum,
        width: image.width,
        height: image.height,
        integrity_status: "verified",
      })
      .eq("id", assetId);
    await db
      .from("comun_archive_submission_assets")
      .update({ upload_status: "confirmed" })
      .eq("submission_id", id)
      .eq("archive_asset_id", assetId);
    await db
      .from("comun_archive_submissions")
      .update({
        status: "submitted",
        risk_level: duplicate ? "attention" : "normal",
      })
      .eq("id", id);
    await logComunAdminAction({
      action: "archive_submission_upload_confirmed",
      targetType: "archive_submission",
      targetId: id,
      metadata: {
        checksum_recorded: true,
        width: image.width,
        height: image.height,
      },
    });
    if (duplicate)
      await logComunAdminAction({
        action: "archive_duplicate_detected",
        targetType: "archive_submission",
        targetId: id,
        metadata: {
          existing_asset_id: duplicate.id,
          linked_item: Boolean(duplicate.archive_item_id),
        },
      });
    return NextResponse.json({ ok: true, duplicate: Boolean(duplicate) });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel validar a fotografia." },
      { status: 400 },
    );
  }
}
