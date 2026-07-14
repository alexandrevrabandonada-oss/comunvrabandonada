import sharp from "sharp";
import { logComunAdminAction } from "@/lib/admin-audit";
import { historicalDerivativeKey, photoChecksum } from "@/lib/historical-photo";
import { getMediaStorage, publicMediaUrl } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function generateHistoricalPhotoDerivatives(assetId: string) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Supabase nao configurado.");
  const { data: original } = await db
    .from("comun_archive_assets")
    .select(
      "id, archive_item_id, object_key, bucket_scope, mime_type, checksum_sha256, rights_status, credits",
    )
    .eq("id", assetId)
    .maybeSingle();
  if (
    !original ||
    original.bucket_scope !== "private_original" ||
    !original.archive_item_id
  )
    throw new Error(
      "Original privado precisa estar vinculado a um item do Acervo.",
    );
  const signed = await getMediaStorage().createPrivateReadUrl(
    original.object_key,
    180,
  );
  const response = await fetch(signed.url, { cache: "no-store" });
  if (!response.ok) throw new Error("Nao foi possivel ler o original privado.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const input = sharp(bytes, { failOn: "error" });
  const metadata = await input.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !["jpeg", "png", "webp"].includes(metadata.format || "")
  )
    throw new Error("Original nao e uma imagem valida.");
  const checksum = photoChecksum(bytes);
  await db
    .from("comun_archive_assets")
    .update({
      checksum_sha256: checksum,
      width: metadata.width,
      height: metadata.height,
      integrity_status: "verified",
    })
    .eq("id", assetId);
  const generated: Array<{
    id: string;
    key: string;
    kind: "thumbnail" | "display";
  }> = [];
  try {
    for (const spec of [
      {
        kind: "thumbnail" as const,
        width: 480,
        quality: 78,
        role: "thumbnail",
      },
      {
        kind: "display" as const,
        width: 1600,
        quality: 84,
        role: "public_version",
      },
    ]) {
      const created = await db
        .from("comun_archive_assets")
        .insert({
          archive_item_id: original.archive_item_id,
          asset_role: spec.role,
          bucket_scope: "public_safe",
          object_key: `smoke/pending/${crypto.randomUUID()}.webp`,
          mime_type: "image/webp",
          review_status: "pending",
          integrity_status: "unknown",
          derivative_kind: spec.kind,
          rights_status: original.rights_status,
          credits: original.credits,
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      const key = historicalDerivativeKey(
        original.archive_item_id,
        created.data.id,
        spec.kind,
      );
      const body = await sharp(bytes, { failOn: "error" })
        .rotate()
        .resize({ width: spec.width, withoutEnlargement: true })
        .webp({ quality: spec.quality })
        .toBuffer();
      const output = await sharp(body).metadata();
      await getMediaStorage().putObject({
        scope: "public_safe",
        key,
        contentType: "image/webp",
        sizeBytes: body.byteLength,
        body,
      });
      await db
        .from("comun_archive_assets")
        .update({
          object_key: key,
          public_url: publicMediaUrl(key),
          size_bytes: body.byteLength,
          checksum_sha256: photoChecksum(body),
          width: output.width,
          height: output.height,
          integrity_status: "verified",
        })
        .eq("id", created.data.id);
      generated.push({ id: created.data.id, key, kind: spec.kind });
    }
    await logComunAdminAction({
      action: "archive_photo_derivatives_generated",
      targetType: "archive_asset",
      targetId: assetId,
      metadata: {
        derivative_ids: generated.map((x) => x.id),
        exif_removed: true,
      },
    });
    return generated;
  } catch (error) {
    for (const item of generated) {
      await getMediaStorage()
        .deleteObject("public_safe", item.key)
        .catch(() => undefined);
      await db.from("comun_archive_assets").delete().eq("id", item.id);
    }
    throw error;
  }
}
