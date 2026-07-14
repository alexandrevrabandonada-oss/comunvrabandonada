import { createClient } from "@supabase/supabase-js";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
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
let insertedId = null;
let storagePath = null;

try {
  const insert = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada]",
    raw_text: "QUICK-RAW-SENSIVEL buraco grande na calcada perto da escola, risco de queda.",
    approximate_location: "perto da escola teste",
    neighborhood: null,
    involved_entity: null,
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    private_contact: null,
    status: "received",
    risk_level: "unknown",
    quick_report: true,
    latitude: -22.52345,
    longitude: -44.10456,
    location_accuracy: 65,
    location_source: "smoke",
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: false,
    photo_count: 0,
  });

  if (insert.error) throw new Error(insert.error.message);

  const stored = await service
    .from("comun_reports")
    .select("id, quick_report, latitude, longitude, location_accuracy, location_source, has_attachments, photo_count")
    .eq("protocol", protocol)
    .single();

  if (stored.error || !stored.data) throw new Error(stored.error?.message ?? "falha ao localizar relato rapido");
  insertedId = stored.data.id;

  if (!stored.data.quick_report) throw new Error("quick_report nao foi salvo como true");
  if (stored.data.latitude !== -22.52345 || stored.data.longitude !== -44.10456) {
    throw new Error("latitude/longitude internas nao foram salvas corretamente");
  }
  ok("relato rapido sem foto salvou dados internos");

  const publicReports = await anon.from("comun_public_reports").select("*").eq("protocol", protocol);
  if (publicReports.error) throw new Error(publicReports.error.message);
  const publicJson = JSON.stringify(publicReports.data ?? []);
  for (const forbidden of ["latitude", "longitude", "-22.52345", "-44.10456", "private_contact", "raw_text"]) {
    if (publicJson.includes(forbidden)) throw new Error(`view publica expos dado proibido: ${forbidden}`);
  }
  ok("view publica nao expoe localizacao precisa nem campos privados");

  const htmlResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!htmlResponse.ok) throw new Error(`acompanhamento retornou ${htmlResponse.status}`);
  const html = normalize(await htmlResponse.text());
  for (const forbidden of ["QUICK-RAW-SENSIVEL", "-22.52345", "-44.10456", "private_contact", "raw_text"]) {
    if (html.includes(forbidden)) throw new Error(`pagina publica vazou dado proibido: ${forbidden}`);
  }
  ok("pagina publica de acompanhamento nao vaza dados do relato rapido");

  const buckets = await service.storage.listBuckets();
  if (buckets.error) throw new Error(buckets.error.message);
  const bucket = buckets.data?.find((item) => item.name === bucketName);
  if (!bucket) {
    ok(`bucket ${bucketName} ausente; upload de imagem pulado`);
  } else {
    if (bucket.public) throw new Error(`bucket ${bucketName} esta publico`);
    storagePath = `${protocol}/smoke-${Date.now()}.png`;
    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l2XK2wAAAABJRU5ErkJggg==",
      "base64",
    );
    const upload = await service.storage.from(bucketName).upload(storagePath, onePixelPng, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);

    const attachment = await service.from("comun_report_attachments").insert({
      report_id: insertedId,
      storage_bucket: bucketName,
      storage_path: storagePath,
      original_filename: "smoke.png",
      mime_type: "image/png",
      size_bytes: onePixelPng.length,
      attachment_type: "photo",
      public_approved: false,
    });
    if (attachment.error) throw new Error(attachment.error.message);

    const update = await service
      .from("comun_reports")
      .update({ has_attachments: true, photo_count: 1 })
      .eq("id", insertedId);
    if (update.error) throw new Error(update.error.message);

    const storedAttachment = await service
      .from("comun_report_attachments")
      .select("public_approved")
      .eq("report_id", insertedId)
      .single();
    if (storedAttachment.error || storedAttachment.data?.public_approved !== false) {
      throw new Error("attachment nao ficou privado por padrao");
    }
    ok("upload privado e attachment interno validados");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (storagePath) await service.storage.from(bucketName).remove([storagePath]);
  if (insertedId) {
    await service.from("comun_reports").delete().eq("id", insertedId);
    ok("relato rapido de smoke removido");
  }
}
