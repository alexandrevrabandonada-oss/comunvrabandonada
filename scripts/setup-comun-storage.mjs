import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");
const bucketName = "comun-report-attachments";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}

loadEnvFile(envPath);

for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]) fail(`falta ${name}`);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const buckets = await supabase.storage.listBuckets();
if (buckets.error) fail(buckets.error.message);

const existing = buckets.data?.find((bucket) => bucket.name === bucketName);
if (existing) {
  if (existing.public) {
    const update = await supabase.storage.updateBucket(bucketName, { public: false });
    if (update.error) fail(update.error.message);
    console.log(`[ok] bucket ${bucketName} ajustado para privado`);
  } else {
    console.log(`[ok] bucket ${bucketName} ja existe e esta privado`);
  }
  process.exit(0);
}

const created = await supabase.storage.createBucket(bucketName, {
  public: false,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  fileSizeLimit: 8 * 1024 * 1024,
});

if (created.error) fail(created.error.message);
console.log(`[ok] bucket ${bucketName} criado como privado`);
