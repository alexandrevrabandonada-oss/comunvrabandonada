import { randomUUID, createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const required = [
    "ARCHIVE_ASSET_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  missing = required.filter((k) => !process.env[k]);
if (missing.length)
  throw new Error(`Configuracao incompleta: ${missing.join(", ")}`);
const storage = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  }),
  db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  hash = (b) => createHash("sha256").update(b).digest("hex");
const { data: original, error } = await db
  .from("comun_archive_assets")
  .select(
    "id, archive_item_id, object_key, bucket_scope, rights_status, credits",
  )
  .eq("id", process.env.ARCHIVE_ASSET_ID)
  .single();
if (
  error ||
  !original?.archive_item_id ||
  original.bucket_scope !== "private_original"
)
  throw new Error("Original privado vinculado a item nao encontrado.");
const received = await storage.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_ORIGINALS,
      Key: original.object_key,
    }),
  ),
  bytes = Buffer.from(await received.Body.transformToByteArray()),
  meta = await sharp(bytes, { failOn: "error" }).metadata();
if (!meta.width || !meta.height) throw new Error("Imagem invalida.");
await db
  .from("comun_archive_assets")
  .update({
    checksum_sha256: hash(bytes),
    width: meta.width,
    height: meta.height,
    integrity_status: "verified",
  })
  .eq("id", original.id);
const created = [];
try {
  for (const spec of [
    { kind: "thumbnail", role: "thumbnail", width: 480, quality: 78 },
    { kind: "display", role: "public_version", width: 1600, quality: 84 },
  ]) {
    const asset = await db
      .from("comun_archive_assets")
      .insert({
        archive_item_id: original.archive_item_id,
        asset_role: spec.role,
        bucket_scope: "public_safe",
        object_key: `smoke/pending/${randomUUID()}.webp`,
        mime_type: "image/webp",
        review_status: "pending",
        integrity_status: "unknown",
        derivative_kind: spec.kind,
        rights_status: original.rights_status,
        credits: original.credits,
      })
      .select("id")
      .single();
    if (asset.error) throw asset.error;
    const key = `public/${original.archive_item_id}/${asset.data.id}/${spec.kind}-${randomUUID()}.webp`,
      body = await sharp(bytes, { failOn: "error" })
        .rotate()
        .resize({ width: spec.width, withoutEnlargement: true })
        .webp({ quality: spec.quality })
        .toBuffer(),
      out = await sharp(body).metadata();
    await storage.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_PUBLIC,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    await db
      .from("comun_archive_assets")
      .update({
        object_key: key,
        public_url: `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`,
        size_bytes: body.length,
        checksum_sha256: hash(body),
        width: out.width,
        height: out.height,
        integrity_status: "verified",
      })
      .eq("id", asset.data.id);
    created.push({ id: asset.data.id, key, kind: spec.kind });
  }
  await db
    .from("comun_admin_audit_log")
    .insert({
      action: "archive_photo_derivatives_generated",
      target_type: "archive_asset",
      target_id: original.id,
      metadata: {
        derivative_ids: created.map((x) => x.id),
        exif_removed: true,
        execution: "manual_script",
      },
    });
  console.log(
    JSON.stringify({
      ok: true,
      assetId: original.id,
      derivatives: created.map((x) => ({ id: x.id, kind: x.kind })),
    }),
  );
} catch (error) {
  for (const item of created) {
    await storage
      .send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_PUBLIC,
          Key: item.key,
        }),
      )
      .catch(() => {});
    await db.from("comun_archive_assets").delete().eq("id", item.id);
  }
  throw error;
}
