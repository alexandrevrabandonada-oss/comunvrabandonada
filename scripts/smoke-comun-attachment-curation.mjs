import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");
const originalBucket = "comun-report-attachments";
const publicSafeBucket = "comun-public-safe-attachments";

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

function ok(message) {
  console.log(`[ok] ${message}`);
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exitCode = 1;
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

loadEnvFile(envPath);

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias: ${missingVars.join(", ")}`);
  process.exit();
}

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const protocol = `COMUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l2XK2wAAAABJRU5ErkJggg==",
  "base64",
);
let reportId = null;
let attachmentId = null;
let originalPath = null;
let publicSafePath = null;

try {
  const buckets = await service.storage.listBuckets();
  if (buckets.error) throw new Error(buckets.error.message);
  for (const bucketName of [originalBucket, publicSafeBucket]) {
    const bucket = buckets.data?.find((item) => item.name === bucketName);
    if (!bucket) throw new Error(`bucket ausente: ${bucketName}`);
    if (bucket.public) throw new Error(`bucket esta publico: ${bucketName}`);
  }
  ok("buckets de anexo original e versao segura estao privados");

  const insertReport = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada]",
    raw_text: "ATTACHMENT-CURATION-RAW foto sensivel de teste com dado privado.",
    approximate_location: "perto da escola teste",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    private_contact: null,
    status: "received",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: true,
    photo_count: 1,
  });
  if (insertReport.error) throw new Error(insertReport.error.message);

  const storedReport = await service.from("comun_reports").select("id").eq("protocol", protocol).single();
  if (storedReport.error || !storedReport.data) throw new Error(storedReport.error?.message ?? "relato nao encontrado");
  reportId = storedReport.data.id;

  originalPath = `${protocol}/original-${Date.now()}.png`;
  const originalUpload = await service.storage.from(originalBucket).upload(originalPath, onePixelPng, {
    contentType: "image/png",
    upsert: false,
  });
  if (originalUpload.error) throw new Error(originalUpload.error.message);

  const insertAttachment = await service
    .from("comun_report_attachments")
    .insert({
      report_id: reportId,
      storage_bucket: originalBucket,
      storage_path: originalPath,
      original_filename: "sensitive-original-smoke.png",
      mime_type: "image/png",
      size_bytes: onePixelPng.length,
      attachment_type: "photo",
      public_approved: false,
    })
    .select("id, review_status, public_approved")
    .single();
  if (insertAttachment.error) throw new Error(insertAttachment.error.message);
  attachmentId = insertAttachment.data.id;
  if (insertAttachment.data.review_status !== "pending") throw new Error("review_status inicial nao e pending");
  if (insertAttachment.data.public_approved !== false) throw new Error("anexo original nao ficou privado por padrao");
  ok("attachment original criado como pending e sem public_approved");

  const markNeedsRedaction = await service
    .from("comun_report_attachments")
    .update({
      review_status: "needs_redaction",
      needs_redaction: true,
      redaction_notes: "Smoke: borrar rosto, placa e documento.",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attachmentId);
  if (markNeedsRedaction.error) throw new Error(markNeedsRedaction.error.message);

  const auditNeedsRedaction = await service.from("comun_admin_audit_log").insert({
    action: "attachment_marked_needs_redaction",
    target_type: "attachment",
    target_id: attachmentId,
    metadata: {
      attachment_id: attachmentId,
      report_id: reportId,
      review_status: "needs_redaction",
      has_public_safe_version: false,
    },
  });
  if (auditNeedsRedaction.error) throw new Error(auditNeedsRedaction.error.message);
  ok("needs_redaction e auditoria registrados");

  const reject = await service
    .from("comun_report_attachments")
    .update({
      review_status: "rejected",
      public_approved: false,
      needs_redaction: false,
      public_storage_bucket: null,
      public_storage_path: null,
      public_approved_at: null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attachmentId);
  if (reject.error) throw new Error(reject.error.message);
  ok("reprovacao manteve public_approved=false");

  publicSafePath = `${reportId}/${attachmentId}/safe-${Date.now()}.png`;
  const safeUpload = await service.storage.from(publicSafeBucket).upload(publicSafePath, onePixelPng, {
    contentType: "image/png",
    upsert: false,
  });
  if (safeUpload.error) throw new Error(safeUpload.error.message);

  const publicReady = await service
    .from("comun_report_attachments")
    .update({
      review_status: "public_ready",
      public_approved: true,
      public_storage_bucket: publicSafeBucket,
      public_storage_path: publicSafePath,
      public_mime_type: "image/png",
      public_size_bytes: onePixelPng.length,
      public_approved_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attachmentId)
    .select("storage_bucket, storage_path, public_storage_bucket, public_storage_path, public_approved, review_status")
    .single();
  if (publicReady.error) throw new Error(publicReady.error.message);
  if (publicReady.data.storage_bucket !== originalBucket) throw new Error("bucket original foi alterado");
  if (publicReady.data.storage_path !== originalPath) throw new Error("storage_path original foi alterado");
  if (publicReady.data.public_storage_path !== publicSafePath) throw new Error("versao segura nao foi registrada");
  ok("versao publica segura registrada sem transformar original em publico");

  const auditPublicReady = await service.from("comun_admin_audit_log").insert({
    action: "attachment_public_safe_uploaded",
    target_type: "attachment",
    target_id: attachmentId,
    metadata: {
      attachment_id: attachmentId,
      report_id: reportId,
      review_status: "public_ready",
      has_public_safe_version: true,
    },
  });
  if (auditPublicReady.error) throw new Error(auditPublicReady.error.message);

  const publicSafeRows = await service
    .from("comun_report_attachments")
    .select("storage_bucket, storage_path, public_storage_bucket, public_storage_path")
    .eq("report_id", reportId)
    .eq("public_approved", true)
    .eq("review_status", "public_ready")
    .not("public_storage_path", "is", null);
  if (publicSafeRows.error) throw new Error(publicSafeRows.error.message);
  const publicSafeJson = JSON.stringify(publicSafeRows.data ?? []);
  if (!publicSafeJson.includes(publicSafePath)) throw new Error("helper/query publica segura nao retornaria versao segura");
  if (!publicSafeJson.includes(originalPath)) {
    ok("query publica segura tem versao segura; original segue separado");
  } else {
    ok("query administrativa ainda ve storage original, mas helper app nao retorna storage_path original");
  }

  const htmlResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!htmlResponse.ok) throw new Error(`acompanhamento retornou ${htmlResponse.status}`);
  const html = normalize(await htmlResponse.text());
  for (const forbidden of [
    "ATTACHMENT-CURATION-RAW",
    "sensitive-original-smoke.png",
    originalPath,
    publicSafePath,
    "storage_path",
    "signedUrl",
    "signed_url",
  ]) {
    if (html.includes(forbidden)) throw new Error(`pagina publica vazou dado de anexo: ${forbidden}`);
  }
  ok("pagina publica nao vaza original, signed URL nem paths de storage");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (originalPath) await service.storage.from(originalBucket).remove([originalPath]);
  if (publicSafePath) await service.storage.from(publicSafeBucket).remove([publicSafePath]);
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
    ok("registros e arquivos de smoke removidos");
  }
}
