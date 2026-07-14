import { createClient } from "@supabase/supabase-js";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
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
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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

async function assertQueueContains(service, attachmentId, filters, message) {
  let query = service
    .from("comun_report_attachments")
    .select("id, review_status, public_storage_path, report:comun_reports!inner(id, protocol, community_slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters.status) query = query.eq("review_status", filters.status);
  if (filters.communitySlug) query = query.eq("comun_reports.community_slug", filters.communitySlug);
  if (filters.publicSafe === "with") query = query.not("public_storage_path", "is", null);
  if (filters.publicSafe === "without") query = query.is("public_storage_path", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((row) => row.id === attachmentId)) throw new Error(message);
}

loadEnvFile(envPath);
assertProductionChecksAllowed(process.env.NEXT_PUBLIC_SITE_URL);

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
  const insertReport = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada]",
    raw_text: "ATTACHMENTS-QUEUE-RAW relato de teste com foto fake.",
    approximate_location: "referencia publica de teste",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
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

  originalPath = `${protocol}/queue-original-${Date.now()}.png`;
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
      original_filename: "queue-sensitive-original.png",
      mime_type: "image/png",
      size_bytes: onePixelPng.length,
      attachment_type: "photo",
      public_approved: false,
    })
    .select("id, review_status")
    .single();
  if (insertAttachment.error) throw new Error(insertAttachment.error.message);
  attachmentId = insertAttachment.data.id;
  if (insertAttachment.data.review_status !== "pending") throw new Error("anexo nao iniciou como pending");
  ok("relato rapido com foto fake criou anexo pending");

  await assertQueueContains(service, attachmentId, { status: "pending", communitySlug: "cidade", publicSafe: "without" }, "anexo pending nao apareceu na fila");
  ok("anexo aparece na fila pending");

  const markNeedsRedaction = await service
    .from("comun_report_attachments")
    .update({
      review_status: "needs_redaction",
      needs_redaction: true,
      redaction_notes: "Smoke fila: borrar rosto, placa e documento.",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attachmentId);
  if (markNeedsRedaction.error) throw new Error(markNeedsRedaction.error.message);

  const auditNeedsRedaction = await service.from("comun_admin_audit_log").insert({
    action: "attachment_marked_needs_redaction",
    target_type: "attachment",
    target_id: attachmentId,
    metadata: { attachment_id: attachmentId, report_id: reportId, review_status: "needs_redaction" },
  });
  if (auditNeedsRedaction.error) throw new Error(auditNeedsRedaction.error.message);
  await assertQueueContains(service, attachmentId, { status: "needs_redaction" }, "anexo nao apareceu no filtro needs_redaction");
  ok("filtro needs_redaction encontrou o anexo");

  publicSafePath = `${reportId}/${attachmentId}/queue-safe-${Date.now()}.png`;
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
      needs_redaction: false,
      public_approved_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attachmentId);
  if (publicReady.error) throw new Error(publicReady.error.message);

  const auditPublicReady = await service.from("comun_admin_audit_log").insert({
    action: "attachment_public_safe_uploaded",
    target_type: "attachment",
    target_id: attachmentId,
    metadata: { attachment_id: attachmentId, report_id: reportId, review_status: "public_ready", has_public_safe_version: true },
  });
  if (auditPublicReady.error) throw new Error(auditPublicReady.error.message);
  await assertQueueContains(service, attachmentId, { status: "public_ready", publicSafe: "with" }, "anexo nao apareceu como public_ready");
  ok("versao publica segura fake aparece como public_ready");

  const htmlResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!htmlResponse.ok) throw new Error(`acompanhamento retornou ${htmlResponse.status}`);
  const html = normalize(await htmlResponse.text());
  for (const forbidden of ["ATTACHMENTS-QUEUE-RAW", "queue-sensitive-original.png", originalPath, publicSafePath, "storage_path", "signedUrl", "signed_url"]) {
    if (html.includes(forbidden)) throw new Error(`pagina publica vazou dado de anexo: ${forbidden}`);
  }
  ok("paginas publicas nao exibem original, signed URL ou storage_path");
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
