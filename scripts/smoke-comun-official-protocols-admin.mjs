import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");

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

loadEnvFile(envPath);

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias: ${missingVars.join(", ")}`);
  process.exit();
}

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const protocol = `COMUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;
const responseSecret = "ADMIN-OFFICIAL-RESPONSE-PRIVATE";
const publicSummary = "Resumo publico seguro: retorno oficial recebido e pendente de avaliacao comunitaria.";
let reportId = null;
let officialProtocolId = null;

try {
  const insertReport = await service.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada] Smoke admin protocolos",
    raw_text: "ADMIN-OFFICIAL-RAW-PRIVATE",
    public_text: "Buraco em calcada em local aproximado, com risco para pedestres.",
    period_text: "Ultima semana",
    approximate_location: "perto da praca do bairro",
    neighborhood: "Retiro",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    status: "published",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (insertReport.error) throw new Error(insertReport.error.message);
  reportId = insertReport.data.id;
  ok("relato teste criado");

  const insertOfficial = await service.from("comun_official_protocols").insert({
    report_id: reportId,
    comun_protocol: protocol,
    channel: "ouvidoria-municipal",
    agency: "Prefeitura municipal",
    official_protocol_number: "OUV-ADMIN-FAKE-123",
    submitted_by_user: true,
    submitted_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    expected_response_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "waiting_response",
    generated_text: `Ha registro comunitario no COMUN pelo protocolo ${protocol}.`,
  }).select("id").single();
  if (insertOfficial.error) throw new Error(insertOfficial.error.message);
  officialProtocolId = insertOfficial.data.id;
  ok("protocolo oficial associado criado e aguardando resposta");

  const queue = await service
    .from("comun_official_protocols")
    .select("id, status, official_protocol_number, expected_response_at, report:comun_reports!inner(protocol, community_slug, issue_slug)")
    .eq("id", officialProtocolId)
    .eq("status", "waiting_response")
    .single();
  if (queue.error || !queue.data) throw new Error(queue.error?.message ?? "protocolo nao apareceu na fila admin");
  if (queue.data.official_protocol_number !== "OUV-ADMIN-FAKE-123") throw new Error("numero oficial nao apareceu na fila admin");
  ok("protocolo aparece na fila admin agregada");

  const saveResponse = await service.from("comun_official_protocols").update({
    response_text: responseSecret,
    response_received_at: new Date().toISOString(),
    status: "response_received",
  }).eq("id", officialProtocolId);
  if (saveResponse.error) throw new Error(saveResponse.error.message);
  ok("resposta fake registrada");

  const followAfterPrivateResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!followAfterPrivateResponse.ok) throw new Error(`acompanhamento retornou ${followAfterPrivateResponse.status}`);
  const privateHtml = normalize(await followAfterPrivateResponse.text());
  if (privateHtml.includes(responseSecret)) throw new Error("response_text apareceu publicamente");
  ok("response_text nao aparece publicamente");

  const saveSummary = await service.from("comun_official_protocols").update({
    public_summary: publicSummary,
  }).eq("id", officialProtocolId);
  if (saveSummary.error) throw new Error(saveSummary.error.message);

  const followAfterSummary = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!followAfterSummary.ok) throw new Error(`acompanhamento retornou ${followAfterSummary.status}`);
  const summaryHtml = normalize(await followAfterSummary.text());
  if (!summaryHtml.includes(publicSummary)) throw new Error("public_summary nao apareceu no acompanhamento publico");
  if (summaryHtml.includes(responseSecret)) throw new Error("response_text apareceu junto do resumo publico");
  ok("resumo publico aparece sem vazar resposta completa");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
    ok("dados de smoke removidos");
  }
}
