import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import pg from "pg";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const databaseUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(url) || !key)
  throw new Error("COMUN_RELATA_LOCAL_STORAGE_REQUIRED");
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(databaseUrl))
  throw new Error("COMUN_RELATA_LOCAL_DATABASE_REQUIRED");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = "comun-relata-private";
const id = randomUUID();
const object = `sealed/${id}.webp`;
const body = await sharp({
  create: { width: 48, height: 36, channels: 3, background: "#777777" },
})
  .webp()
  .toBuffer();
const checksum = createHash("sha256").update(body).digest("hex");

try {
  const postgres = new pg.Client({ connectionString: databaseUrl });
  await postgres.connect();
  const bucketQuery = await postgres.query(
    "select public,file_size_limit,allowed_mime_types from storage.buckets where id=$1",
    [bucket],
  );
  await postgres.end();
  const bucketState = bucketQuery.rows[0];
  if (
    !bucketState ||
    bucketState.public !== false ||
    Number(bucketState.file_size_limit) !== 8_388_608
  )
    throw new Error("COMUN_RELATA_PRIVATE_BUCKET_INVALID");
  const uploaded = await db.storage
    .from(bucket)
    .upload(object, body, { contentType: "image/webp", cacheControl: "0" });
  if (uploaded.error) throw new Error("COMUN_RELATA_STORAGE_UPLOAD_FAILED");
  const backup = await db.storage.from(bucket).download(object);
  if (backup.error || !backup.data)
    throw new Error("COMUN_RELATA_STORAGE_BACKUP_FAILED");
  const backupBytes = Buffer.from(await backup.data.arrayBuffer());
  if (createHash("sha256").update(backupBytes).digest("hex") !== checksum)
    throw new Error("COMUN_RELATA_STORAGE_BACKUP_CHECKSUM_FAILED");
  const removed = await db.storage.from(bucket).remove([object]);
  if (removed.error) throw new Error("COMUN_RELATA_STORAGE_REMOVE_FAILED");
  const restored = await db.storage
    .from(bucket)
    .upload(object, backupBytes, { contentType: "image/webp", cacheControl: "0" });
  if (restored.error) throw new Error("COMUN_RELATA_STORAGE_RESTORE_FAILED");
  const verify = await db.storage.from(bucket).download(object);
  if (verify.error || !verify.data)
    throw new Error("COMUN_RELATA_STORAGE_RESTORE_VERIFY_FAILED");
  const verifiedBytes = Buffer.from(await verify.data.arrayBuffer());
  if (createHash("sha256").update(verifiedBytes).digest("hex") !== checksum)
    throw new Error("COMUN_RELATA_STORAGE_RESTORE_CHECKSUM_FAILED");
  console.log(
    JSON.stringify({
      result: "COMUN_RELATA_PRIVATE_STORAGE_RESTORE_GREEN",
      bucket: "private",
      public: false,
      syntheticObjects: 1,
      checksum: "matched_not_emitted",
      remote: "not_contacted",
    }),
  );
} finally {
  await db.storage.from(bucket).remove([object]).catch(() => undefined);
}
