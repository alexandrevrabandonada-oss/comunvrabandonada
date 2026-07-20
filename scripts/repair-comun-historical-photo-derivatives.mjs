import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const sourceRoot = process.argv[2];
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!sourceRoot) throw new Error("Informe a pasta dos originais.");
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url || "") || !key)
  throw new Error("Supabase remoto não configurado.");
if (apply && process.env.COMUN_REPAIR_CONFIRM !== "REPAIR_CORRUPTED_PUBLIC_WEBP")
  throw new Error("Confirmação operacional ausente.");

const db = createClient(url, key, { auth: { persistSession: false } });
const checksum = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(target)));
    else if (/\.(jpe?g|png)$/i.test(entry.name)) files.push(target);
  }
  return files;
}

async function allRows(table, select, configure = (query) => query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const result = await configure(db.from(table).select(select)).range(from, from + 999);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
}

const localFiles = await filesUnder(path.resolve(sourceRoot));
const localByChecksum = new Map();
for (const [index, filename] of localFiles.entries()) {
  const body = await readFile(filename);
  localByChecksum.set(checksum(body), { filename, body });
  if ((index + 1) % 100 === 0) console.log(`Inventário local: ${index + 1}/${localFiles.length}`);
}

const originals = await allRows(
  "comun_archive_assets",
  "id,archive_item_id,checksum_sha256",
  (query) => query.eq("bucket_scope", "private_original").eq("storage_provider", "supabase"),
);
const derivatives = await allRows(
  "comun_archive_assets",
  "id,archive_item_id,object_key,derivative_kind",
  (query) => query.eq("bucket_scope", "public_safe").in("derivative_kind", ["thumbnail", "display"]),
);
const derivativesByItem = new Map();
for (const asset of derivatives) {
  const group = derivativesByItem.get(asset.archive_item_id) || new Map();
  group.set(asset.derivative_kind, asset);
  derivativesByItem.set(asset.archive_item_id, group);
}

const plan = originals.flatMap((original) => {
  const local = localByChecksum.get(original.checksum_sha256);
  const group = derivativesByItem.get(original.archive_item_id);
  return local && group ? [{ original, local, group }] : [];
});
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", local_files: localFiles.length, matched_originals: plan.length, expected_processable: 859 }));
if (!apply) process.exit(0);

let repaired = 0;
let failed = 0;
const queue = [...plan];
async function worker() {
  while (queue.length) {
    const record = queue.shift();
    try {
      for (const spec of [
        { kind: "thumbnail", width: 480, quality: 78 },
        { kind: "display", width: 1600, quality: 84 },
      ]) {
        const asset = record.group.get(spec.kind);
        if (!asset?.object_key) throw new Error(`Derivada ${spec.kind} ausente`);
        const body = await sharp(record.local.body, { failOn: "error" })
          .rotate()
          .resize({ width: spec.width, withoutEnlargement: true })
          .webp({ quality: spec.quality })
          .toBuffer();
        const meta = await sharp(body).metadata();
        const upload = await db.storage
          .from("archive-public-derivatives")
          .upload(asset.object_key, Buffer.from(body), {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });
        if (upload.error) throw upload.error;
        const downloaded = await db.storage.from("archive-public-derivatives").download(asset.object_key);
        if (downloaded.error) throw downloaded.error;
        const remote = Buffer.from(await downloaded.data.arrayBuffer());
        const remoteMeta = await sharp(remote, { failOn: "error" }).metadata();
        if (checksum(remote) !== checksum(body) || remoteMeta.format !== "webp")
          throw new Error("Verificação binária remota falhou");
        const update = await db.from("comun_archive_assets").update({
          size_bytes: body.byteLength,
          checksum_sha256: checksum(body),
          width: meta.width,
          height: meta.height,
          integrity_status: "verified",
        }).eq("id", asset.id);
        if (update.error) throw update.error;
      }
      repaired++;
      if (repaired % 25 === 0) console.log(`Reparadas: ${repaired}/${plan.length}`);
    } catch (error) {
      failed++;
      console.error(`Falha sanitizada no item ${record.original.archive_item_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));
console.log(JSON.stringify({ repaired, failed, unmatched_or_blocked: originals.length - plan.length }));
if (failed || repaired !== 859) process.exitCode = 2;
