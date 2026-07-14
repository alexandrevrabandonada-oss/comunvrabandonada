import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const required = [
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  missing = required.filter((key) => !process.env[key]);
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
  allowedPrefixes = ["originals/", "public/", "smoke/"];
async function list(Bucket, prefix) {
  const out = [];
  let token;
  do {
    const r = await storage.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    out.push(
      ...(r.Contents ?? [])
        .filter((x) => x.Key)
        .map((x) => ({
          key: x.Key,
          size: x.Size ?? 0,
          lastModified: x.LastModified?.toISOString() ?? null,
        })),
    );
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}
const keyReference = (key) => ({
  prefix: allowedPrefixes.find((prefix) => key.startsWith(prefix)) ?? "unknown",
  key_hash: createHash("sha256").update(key).digest("hex"),
});
const { data, error } = await db
  .from("comun_archive_assets")
  .select("id, bucket_scope, object_key");
if (error) throw error;
const records = data ?? [],
  known = new Set(records.map((x) => `${x.bucket_scope}:${x.object_key}`)),
  objects = [];
for (const [scope, bucket] of [
  ["private_original", process.env.R2_BUCKET_ORIGINALS],
  ["public_safe", process.env.R2_BUCKET_PUBLIC],
])
  for (const prefix of allowedPrefixes)
    for (const object of await list(bucket, prefix))
      objects.push({ ...object, scope, bucket });
const found = new Set(objects.map((x) => `${x.scope}:${x.key}`)),
  orphanObjects = objects.filter((x) => !known.has(`${x.scope}:${x.key}`)),
  missingObjects = records.filter(
    (x) => !found.has(`${x.bucket_scope}:${x.object_key}`),
  );
const deleteConfirmed = process.env.R2_ORPHAN_DELETE_CONFIRM === "true",
  deleted = [];
if (deleteConfirmed)
  for (const object of orphanObjects) {
    if (!allowedPrefixes.some((prefix) => object.key.startsWith(prefix)))
      continue;
    await storage.send(
      new DeleteObjectCommand({ Bucket: object.bucket, Key: object.key }),
    );
    deleted.push({ scope: object.scope, ...keyReference(object.key) });
  }
const report = {
  generated_at: new Date().toISOString(),
  mode: deleteConfirmed ? "delete-confirmed" : "dry-run",
  summary: {
    objects: objects.length,
    records: records.length,
    orphanObjects: orphanObjects.length,
    missingObjects: missingObjects.length,
    deleted: deleted.length,
  },
  orphanObjects: orphanObjects.map(({ bucket, key, ...safe }) => ({
    ...safe,
    ...keyReference(key),
  })),
  missingObjects: missingObjects.map(({ id, bucket_scope, object_key }) => ({
    id,
    bucket_scope,
    ...keyReference(object_key),
  })),
  deleted,
};
const file = path.join(
  process.cwd(),
  "reports",
  `r2-orphans-${new Date().toISOString().slice(0, 10)}.json`,
);
await fs.writeFile(file, JSON.stringify(report, null, 2));
console.log(`Relatorio gerado: ${file}`);
console.log(JSON.stringify(report.summary));
