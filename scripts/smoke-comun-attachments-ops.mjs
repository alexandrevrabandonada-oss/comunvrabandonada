import { createClient } from "@supabase/supabase-js";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");
const originalBucket = "comun-report-attachments";

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

async function countAttachments(service, predicate) {
  const { data, error } = await service
    .from("comun_report_attachments")
    .select("id, review_status, needs_redaction, created_at, report:comun_reports!inner(protocol)")
    .like("comun_reports.protocol", "COMUN-%");
  if (error) throw new Error(error.message);
  return (data ?? []).filter(predicate).length;
}

async function assertQueueContains(service, attachmentId, status, message) {
  const { data, error } = await service
    .from("comun_report_attachments")
    .select("id, review_status, report:comun_reports!inner(id, protocol, community_slug)")
    .eq("review_status", status)
    .limit(100);
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
let recentAttachmentId = null;
let oldAttachmentId = null;
let recentPath = null;
let oldPath = null;

try {
  const insertReport = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada]",
    raw_text: "ATTACHMENTS-OPS-RAW relato de teste com foto fake.",
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
    photo_count: 2,
  });
  if (insertReport.error) throw new Error(insertReport.error.message);

  const storedReport = await service.from("comun_reports").select("id").eq("protocol", protocol).single();
  if (storedReport.error || !storedReport.data) throw new Error(storedReport.error?.message ?? "relato nao encontrado");
  reportId = storedReport.data.id;

  recentPath = `${protocol}/ops-recent-${Date.now()}.png`;
  oldPath = `${protocol}/ops-old-${Date.now()}.png`;
  for (const storagePath of [recentPath, oldPath]) {
    const upload = await service.storage.from(originalBucket).upload(storagePath, onePixelPng, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);
  }

  const recentCreatedAt = new Date().toISOString();
  const oldCreatedAt = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
  const insertAttachments = await service
    .from("comun_report_attachments")
    .insert([
      {
        report_id: reportId,
        storage_bucket: originalBucket,
        storage_path: recentPath,
        original_filename: "ops-recent-sensitive.png",
        mime_type: "image/png",
        size_bytes: onePixelPng.length,
        attachment_type: "photo",
        public_approved: false,
        created_at: recentCreatedAt,
      },
      {
        report_id: reportId,
        storage_bucket: originalBucket,
        storage_path: oldPath,
        original_filename: "ops-old-sensitive.png",
        mime_type: "image/png",
        size_bytes: onePixelPng.length,
        attachment_type: "photo",
        public_approved: false,
        created_at: oldCreatedAt,
      },
    ])
    .select("id, review_status, created_at")
    .order("created_at", { ascending: false });
  if (insertAttachments.error) throw new Error(insertAttachments.error.message);
  const rows = insertAttachments.data ?? [];
  recentAttachmentId = rows.find((row) => new Date(row.created_at).getTime() > Date.now() - 60 * 60 * 1000)?.id ?? rows[0]?.id;
  oldAttachmentId = rows.find((row) => new Date(row.created_at).getTime() <= Date.now() - 72 * 60 * 60 * 1000)?.id;
  if (!recentAttachmentId || !oldAttachmentId) throw new Error("anexos de smoke nao foram criados corretamente");
  if (rows.some((row) => row.review_status !== "pending")) throw new Error("anexo nao iniciou como pending");
  ok("relato rapido com foto fake criou anexos pending");

  await assertQueueContains(service, recentAttachmentId, "pending", "anexo recente nao apareceu como pendente");
  await assertQueueContains(service, oldAttachmentId, "pending", "anexo antigo nao apareceu como pendente");
  ok("anexos aparecem como pendentes na fila operacional");

  const pendingCount = await countAttachments(service, (row) => row.id === recentAttachmentId || row.id === oldAttachmentId);
  const oldPendingCount = await countAttachments(
    service,
    (row) => row.id === oldAttachmentId && row.review_status === "pending" && Date.now() - new Date(row.created_at).getTime() > 72 * 60 * 60 * 1000,
  );
  if (pendingCount !== 2) throw new Error("contagem operacional de pendentes nao encontrou os dois anexos de smoke");
  if (oldPendingCount !== 1) throw new Error("contagem operacional de pendente antigo nao encontrou o anexo de 72h");
  ok("contadores operacionais de pendentes recentes e antigos calculados");

  const markNeedsRedaction = await service
    .from("comun_report_attachments")
    .update({
      review_status: "needs_redaction",
      needs_redaction: true,
      redaction_notes: "Smoke ops: borrar rosto, placa e documento.",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", recentAttachmentId);
  if (markNeedsRedaction.error) throw new Error(markNeedsRedaction.error.message);

  await assertQueueContains(service, recentAttachmentId, "needs_redaction", "anexo nao apareceu no filtro needs_redaction");
  const attentionCount = await countAttachments(
    service,
    (row) => row.id === recentAttachmentId && (row.needs_redaction || row.review_status === "needs_redaction"),
  );
  if (attentionCount !== 1) throw new Error("contador operacional de atencao nao encontrou needs_redaction");
  ok("filtro e contador de needs_redaction validados");

  const htmlResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!htmlResponse.ok) throw new Error(`acompanhamento retornou ${htmlResponse.status}`);
  const html = normalize(await htmlResponse.text());
  for (const forbidden of ["ATTACHMENTS-OPS-RAW", "ops-recent-sensitive.png", "ops-old-sensitive.png", recentPath, oldPath, "storage_path", "signedUrl", "signed_url"]) {
    if (html.includes(forbidden)) throw new Error(`pagina publica vazou dado de anexo: ${forbidden}`);
  }
  ok("paginas publicas nao exibem signed URL nem storage_path");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (recentPath) await service.storage.from(originalBucket).remove([recentPath]);
  if (oldPath) await service.storage.from(originalBucket).remove([oldPath]);
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
    ok("registros e arquivos de smoke removidos");
  }
}
