import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const source = valueAfter("--source") || process.env.COMUN_HISTORICAL_PHOTOS_SOURCE;
const only = valueAfter("--only");
const manifestPath = valueAfter("--manifest");
const apply = args.includes("--apply");
const limitArg = Number(valueAfter("--limit") || "0");
const limit = Number.isInteger(limitArg) && limitArg > 0 ? limitArg : Infinity;
const concurrencyArg = Number(valueAfter("--concurrency") || "6");
const concurrency = Number.isInteger(concurrencyArg) && concurrencyArg > 0 && concurrencyArg <= 12 ? concurrencyArg : 6;
const collectionSlug = "volta-redonda-em-formacao-1940-1989";
const bucket = "archive-private-originals";

if (!source) throw new Error("Informe --source <pasta>.");

function dateFromName(filename) {
  const base = path.parse(filename).name;
  const fullYear = base.match(/(?:^|\D)(19(?:4\d|5\d|6\d|7\d|8\d))(?:\D|$)/);
  if (fullYear) return { approximateDate: fullYear[1], year: Number(fullYear[1]), circa: true };
  const compact = base.match(/(?:^|[_-])(\d{2})(\d{2})(4\d|5\d|6\d|7\d|8\d)(?:\D|$)/);
  if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    const year = 1900 + Number(compact[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12)
      return { approximateDate: `${compact[1]}/${compact[2]}/${year}`, year, circa: false };
  }
  const separated = base.match(/(?:^|\D)(\d{1,2})[-_.](\d{1,2})[-_.](4\d|5\d|6\d|7\d|8\d)(?:\D|$)/);
  if (separated) {
    const day = Number(separated[1]);
    const month = Number(separated[2]);
    const year = 1900 + Number(separated[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12)
      return { approximateDate: `${day}/${month}/${year}`, year, circa: false };
  }
  return { approximateDate: "Entre as décadas de 1940 e 1980; data a confirmar", year: null, circa: true };
}

function titleFromName(filename) {
  const base = path.parse(filename).name;
  if (/^(?:[A-Z]+)?\d+[A-Z]*$/i.test(base) || /^PASTA \d+ \d+$/i.test(base))
    return `Fotografia histórica — arquivo ${base}`;
  return base.replaceAll("_", " ").replace(/\s+/g, " ").trim();
}

async function inventory() {
  const entries = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const records = [];
  const hashes = new Map();
  for (const entry of entries) {
    const filePath = path.join(source, entry.name);
    const body = await readFile(filePath);
    const checksum = createHash("sha256").update(body).digest("hex");
    let metadata = {};
    let technicalIssue = null;
    try {
      metadata = await sharp(body).metadata();
    } catch (error) {
      technicalIssue = error instanceof Error ? error.message.split("\n")[0] : String(error);
    }
    const date = dateFromName(entry.name);
    const record = {
      filename: entry.name,
      filePath,
      checksum,
      bytes: body.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      title: titleFromName(entry.name),
      ...date,
      duplicateOf: hashes.get(checksum) ?? null,
      technicalIssue,
    };
    if (!hashes.has(checksum)) hashes.set(checksum, entry.name);
    records.push(record);
  }
  return records;
}

const records = await inventory();
const unique = records.filter((record) => !record.duplicateOf);
const dated = unique.filter((record) => record.year);
const unreadable = unique.filter((record) => record.technicalIssue);
const totalBytes = unique.reduce((sum, record) => sum + record.bytes, 0);
console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  source,
  files: records.length,
  unique: unique.length,
  exact_duplicates: records.length - unique.length,
  dated_from_filename: dated.length,
  date_review_required: unique.length - dated.length,
  technically_unreadable: unreadable.length,
  technically_unreadable_files: unreadable.map((record) => record.filename),
  unique_megabytes: Number((totalBytes / 1024 / 1024).toFixed(2)),
  collection_slug: collectionSlug,
}, null, 2));

if (manifestPath) {
  await mkdir(path.dirname(path.resolve(manifestPath)), { recursive: true });
  await writeFile(path.resolve(manifestPath), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    source,
    collection_slug: collectionSlug,
    files: records.map((record) => ({
      filename: record.filename,
      checksum_sha256: record.checksum,
      bytes: record.bytes,
      width: record.width,
      height: record.height,
      duplicate_of: record.duplicateOf,
      approximate_date: record.approximateDate,
      inferred_year: record.year,
      technical_issue: record.technicalIssue,
    })),
  }, null, 2)}\n`, "utf8");
  console.log(`MANIFEST ${path.resolve(manifestPath)}`);
}

if (!apply) process.exit(0);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url || ""))
  throw new Error("Importação exige URL Supabase remota explícita.");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.");
if (process.env.COMUN_ARCHIVE_IMPORT_CONFIRM !== "IMPORT_PRIVATE_REVIEW")
  throw new Error("Defina COMUN_ARCHIVE_IMPORT_CONFIRM=IMPORT_PRIVATE_REVIEW.");

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: buckets, error: bucketError } = await db.storage.listBuckets();
if (bucketError) throw bucketError;
if (!buckets?.some((candidate) => candidate.id === bucket))
  throw new Error(`Bucket remoto ausente: ${bucket}`);

const { data: collection, error: collectionError } = await db
  .from("comun_archive_collections")
  .upsert({
    slug: collectionSlug,
    title: "Volta Redonda em formação — fotografias históricas, 1940–1989",
    summary: "Lote histórico em catalogação sobre a formação urbana, industrial e comunitária de Volta Redonda.",
    description: "Originais preservados em área privada. Datas, locais, autoria, pessoas retratadas e direitos aguardam confirmação editorial antes de qualquer publicação.",
    status: "review",
    published_at: null,
  }, { onConflict: "slug" })
  .select("id")
  .single();
if (collectionError) throw collectionError;

let imported = 0;
let skipped = 0;
let failed = 0;
let completed = 0;
const selected = (only ? unique.filter((record) => record.filename === only) : unique).slice(0, limit);
if (only && selected.length === 0) throw new Error(`Arquivo não encontrado no inventário: ${only}`);
async function importRecord(record, position) {
  try {
    const slug = `foto-vr-${record.checksum.slice(0, 16)}`;
    const { data: existing } = await db.from("comun_archive_items").select("id").eq("slug", slug).maybeSingle();
    let itemId = existing?.id;
    if (!itemId) {
      const { data: item, error: itemError } = await db.from("comun_archive_items").insert({
        slug,
        item_type: "photograph",
        title: record.title,
        summary: "Fotografia histórica de Volta Redonda em processo de identificação e pesquisa.",
        city: "Volta Redonda",
        approximate_date: record.approximateDate,
        year_start: record.year,
        year_end: record.year,
        circa: record.circa,
        source_name: "Lote Fotos antigas VR",
        source_description: "Arquivo fornecido pelo responsável pelo acervo para catalogação; proveniência específica a confirmar.",
        rights_status: "unknown",
        status: "review",
        visibility: "private",
        editorial_notes: `Importação controlada; confirmar autoria, direitos, local, data e pessoas. Arquivo de origem: ${record.filename}${record.technicalIssue ? "; falha de leitura do JPEG, requer restauração técnica" : ""}`,
      }).select("id").single();
      if (itemError) throw itemError;
      itemId = item.id;
    }
    const objectKey = `historical-photos/volta-redonda-1940-1989/${record.checksum}.jpg`;
    const { data: existingAsset } = await db.from("comun_archive_assets").select("id").eq("bucket_scope", "private_original").eq("object_key", objectKey).maybeSingle();
    if (!existingAsset) {
      const body = await readFile(record.filePath);
      const upload = await db.storage.from(bucket).upload(objectKey, body, { contentType: "image/jpeg", upsert: false });
      if (upload.error && !/already exists/i.test(upload.error.message)) throw upload.error;
      const { error: assetError } = await db.from("comun_archive_assets").insert({
        archive_item_id: itemId,
        asset_role: "original",
        storage_provider: "supabase",
        bucket_scope: "private_original",
        object_key: objectKey,
        original_filename: record.filename,
        mime_type: "image/jpeg",
        size_bytes: record.bytes,
        checksum_sha256: record.checksum,
        width: record.width,
        height: record.height,
        alt_text: "Fotografia histórica de Volta Redonda; descrição detalhada pendente de pesquisa.",
        rights_status: "unknown",
        review_status: "pending",
        integrity_status: record.technicalIssue ? "review_required" : "verified",
      });
      if (assetError) throw assetError;
    }
    const { error: linkError } = await db.from("comun_archive_collection_items").upsert({
      collection_id: collection.id,
      archive_item_id: itemId,
      position,
      editorial_note: "Catalogação, identificação e revisão de direitos pendentes.",
    }, { onConflict: "collection_id,archive_item_id" });
    if (linkError) throw linkError;
    existing ? skipped++ : imported++;
  } catch (error) {
    failed++;
    console.error(`FAILED ${record.filename}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    completed++;
    if (completed % 25 === 0 || completed === selected.length)
      console.log(`PROGRESS ${completed}/${selected.length}`);
  }
}
let cursor = 0;
async function worker() {
  while (cursor < selected.length) {
    const position = cursor++;
    await importRecord(selected[position], position);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()));
console.log(JSON.stringify({ imported, skipped, failed, collection_id: collection.id }, null, 2));
if (failed) process.exitCode = 1;
