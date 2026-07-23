import crypto from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMediaStorage } from "./media-storage";

const PHOTO_REVIEW_CHECKLIST = [
  "face",
  "child",
  "license_plate",
  "house_number",
  "home_interior",
  "document",
  "sensitive_location",
  "routine",
  "vulnerable_situation",
  "authorship",
] as const;

export function getPhotoReviewChecklist() {
  return PHOTO_REVIEW_CHECKLIST;
}

export async function createFixtureSidewalkImage(): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  mime: string;
}> {
  const width = 800;
  const height = 600;
  // Imagem sintética abstrata: calçada cinza com buraco escuro e faixa amarela.
  // Sem pessoas, placas, números ou endereços reais.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#9ca3af"/>
    <rect x="0" y="100" width="${width}" height="80" fill="#6b7280"/>
    <rect x="0" y="420" width="${width}" height="80" fill="#6b7280"/>
    <rect x="350" y="250" width="120" height="90" rx="20" fill="#1f2937"/>
    <rect x="100" y="520" width="600" height="12" fill="#facc15" opacity="0.8"/>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    width: meta.width ?? width,
    height: meta.height ?? height,
    mime: "image/jpeg",
  };
}

export async function validateSidewalkPhotoImage(
  body: Uint8Array,
  filename: string,
) {
  const allowed = new Map([
    ["image/jpeg", [[0xff, 0xd8, 0xff]]],
    ["image/png", [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
    ["image/webp", [[0x52, 0x49, 0x46, 0x46]]],
  ]);
  const mime = filename.toLowerCase().endsWith(".png")
    ? "image/png"
    : filename.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  if (!allowed.has(mime) || !/\.(jpe?g|png|webp)$/i.test(filename))
    throw new Error("SIDEWALK_PHOTO_TYPE_INVALID");
  if (body.byteLength < 12 || body.byteLength > 30 * 1024 * 1024)
    throw new Error("SIDEWALK_PHOTO_SIZE_INVALID");
  if (
    !(allowed.get(mime) ?? []).some((sig) =>
      sig.every((x, i) => body[i] === x),
    ) ||
    (mime === "image/webp" &&
      Buffer.from(body.slice(8, 12)).toString() !== "WEBP")
  ) {
    throw new Error("SIDEWALK_PHOTO_MAGIC_INVALID");
  }
  const meta = await sharp(body, {
    animated: false,
    limitInputPixels: 80_000_000,
  }).metadata();
  if (
    !meta.width ||
    !meta.height ||
    (meta.pages && meta.pages > 1) ||
    meta.width * meta.height > 80_000_000
  )
    throw new Error("SIDEWALK_PHOTO_DIMENSIONS_INVALID");
  return {
    mime,
    width: meta.width,
    height: meta.height,
    size: body.byteLength,
    checksum: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

export async function createSidewalkPhotoUploadTarget(
  itemId: string,
  filename: string,
  sizeBytes: number,
) {
  const provider = getMediaStorage();
  const key = `originals/sidewalk/${itemId}/${filename}`;
  return provider.createUploadTarget({
    scope: "private_original",
    key,
    contentType: "image/jpeg",
    sizeBytes,
  });
}

export async function confirmAndStoreSidewalkOriginal(
  db: SupabaseClient,
  itemId: string,
  key: string,
  filename: string,
  mime: string,
  sizeBytes: number,
  width: number,
  height: number,
  checksum: string,
) {
  const provider = getMediaStorage();
  await provider.confirmUpload("private_original", key);
  const { data, error } = await db
    .from("comun_archive_assets" as never)
    .insert({
      archive_item_id: itemId,
      asset_role: "original",
      storage_provider: "supabase-local",
      bucket_scope: "private_original",
      object_key: key,
      original_filename: filename,
      mime_type: mime,
      size_bytes: sizeBytes,
      width,
      height,
      checksum_sha256: checksum,
      review_status: "pending",
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return { assetId: (data as any).id };
}

export async function generateSidewalkPhotoDerivative(
  db: SupabaseClient,
  itemId: string,
  originalKey: string,
  filename: string,
) {
  const provider = getMediaStorage();
  const body = await provider.readObject("private_original", originalKey);
  const validated = await validateSidewalkPhotoImage(body, filename);
  const derivative = await createMetadataCleanSidewalkDerivative(body);
  const meta = await sharp(derivative).metadata();
  const key = `public/sidewalk/${itemId}/detail.webp`;
  await provider.removeObject("public_safe", key).catch(() => {});
  await provider.writeDerivative({
    scope: "public_safe",
    key,
    contentType: "image/webp",
    sizeBytes: derivative.byteLength,
    body: derivative,
  });
  const publicUrl = provider.createPublicDerivativeUrl(key);
  const { data, error } = await db
    .from("comun_archive_assets" as never)
    .insert({
      archive_item_id: itemId,
      asset_role: "public_version",
      storage_provider: "supabase-local",
      bucket_scope: "public_safe",
      object_key: key,
      original_filename: "detail.webp",
      mime_type: "image/webp",
      size_bytes: derivative.byteLength,
      width: meta.width,
      height: meta.height,
      public_url: publicUrl,
      review_status: "approved",
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return {
    assetId: (data as any).id,
    key,
    publicUrl,
    width: meta.width,
    height: meta.height,
    size: derivative.byteLength,
  };
}

export async function createMetadataCleanSidewalkDerivative(body: Uint8Array) {
  return sharp(body, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
}

export async function createSidewalkPhotoItem(
  db: SupabaseClient,
  title: string,
  slug: string,
) {
  const { data, error } = await db
    .from("comun_archive_items" as never)
    .insert({
      item_type: "photograph",
      slug,
      title,
      summary: "Registro fotográfico sintético de calçada para teste local.",
      status: "published",
      visibility: "public",
      rights_status: "permission_granted",
      published_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return { itemId: (data as any).id };
}

export async function createSidewalkRecordPhoto(
  db: SupabaseClient,
  recordId: string,
  archiveItemId: string,
  originalAssetId: string,
  derivativeAssetId: string,
) {
  const { data, error } = await db
    .from("comun_sidewalk_record_photos" as never)
    .insert({
      record_id: recordId,
      archive_item_id: archiveItemId,
      original_asset_id: originalAssetId,
      derivative_asset_id: derivativeAssetId,
      review_status: "approved",
      checklist: Object.fromEntries(
        PHOTO_REVIEW_CHECKLIST.map((k) => [k, false]),
      ),
      is_public: true,
      public_alt_text:
        "Imagem aproximada de trecho de calçada sintético, sem pessoas ou placas identificáveis.",
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return { photoId: (data as any).id };
}

export async function cleanupSidewalkPhotoAssets(
  db: SupabaseClient,
  prefixItemId: string,
) {
  const provider = getMediaStorage();
  const keys: string[] = [];
  for (const scope of ["private_original", "public_safe"] as const) {
    const prefix =
      scope === "private_original"
        ? `originals/sidewalk/${prefixItemId}`
        : `public/sidewalk/${prefixItemId}`;
    const list = await provider.listObjects(scope, prefix);
    for (const obj of list) {
      await provider.deleteObject(scope, obj.key);
      keys.push(obj.key);
    }
  }
  return keys;
}
