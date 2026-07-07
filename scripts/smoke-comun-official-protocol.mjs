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
const rawSecret = "OFFICIAL-PROTOCOL-RAW-SECRET";
const privateContact = "11999999999";
const internalNotes = "OFFICIAL-PROTOCOL-INTERNAL-NOTES";
const responseSecret = "OFFICIAL-PROTOCOL-RESPONSE-PRIVATE";
let reportId = null;
let officialProtocolId = null;

try {
  const insertReport = await service.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada] Buraco em calcada",
    raw_text: `${rawSecret} relato bruto com telefone ${privateContact}`,
    public_text: "Buraco em calcada em local aproximado, com risco para pedestres.",
    period_text: "Ultima semana",
    approximate_location: "perto da praca do bairro",
    neighborhood: "Retiro",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: true,
    private_contact: privateContact,
    internal_notes: internalNotes,
    status: "published",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  });
  if (insertReport.error) throw new Error(insertReport.error.message);

  const storedReport = await service.from("comun_reports").select("id").eq("protocol", protocol).single();
  if (storedReport.error || !storedReport.data) throw new Error(storedReport.error?.message ?? "relato nao encontrado");
  reportId = storedReport.data.id;
  ok("relato teste criado");

  const ouvidoriaResponse = await fetch(new URL(`/comun/acompanhar/${protocol}/ouvidoria`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!ouvidoriaResponse.ok) throw new Error(`/ouvidoria retornou ${ouvidoriaResponse.status}`);
  const ouvidoriaHtml = normalize(await ouvidoriaResponse.text());
  for (const expected of [protocol, "Solicito providencias", "Buraco em calcada", "risco para pedestres"]) {
    if (!ouvidoriaHtml.includes(expected)) throw new Error(`texto de Ouvidoria nao contem: ${expected}`);
  }
  for (const forbidden of [rawSecret, privateContact, internalNotes, "raw_text", "private_contact", "internal_notes"]) {
    if (ouvidoriaHtml.includes(forbidden)) throw new Error(`pagina de Ouvidoria vazou dado sensivel: ${forbidden}`);
  }
  ok("rota de Ouvidoria gera texto seguro com protocolo COMUN");

  const generatedText = `Solicito providencias sobre o seguinte problema:\n\nLocal aproximado: Retiro - perto da praca do bairro\nData ou periodo: Ultima semana\nTipo de problema: Buraco ou calcada\nDescricao: Buraco em calcada em local aproximado, com risco para pedestres.\n\nHa registro comunitario no COMUN pelo protocolo ${protocol}.\n\nPedido objetivo:\nSolicito vistoria, providencia e resposta formal com prazo, orgao responsavel e medida adotada.`;
  const insertOfficial = await service
    .from("comun_official_protocols")
    .insert({
      report_id: reportId,
      comun_protocol: protocol,
      channel: "ouvidoria-municipal",
      agency: "Prefeitura municipal",
      generated_text: generatedText,
      status: "text_generated",
    })
    .select("id")
    .single();
  if (insertOfficial.error) throw new Error(insertOfficial.error.message);
  officialProtocolId = insertOfficial.data.id;
  ok("registro operacional de texto gerado criado");

  const saveNumber = await service
    .from("comun_official_protocols")
    .update({
      official_protocol_number: "OUV-FAKE-123",
      submitted_by_user: true,
      submitted_at: new Date().toISOString(),
      status: "official_protocol_informed",
    })
    .eq("id", officialProtocolId);
  if (saveNumber.error) throw new Error(saveNumber.error.message);

  const followAfterNumber = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!followAfterNumber.ok) throw new Error(`acompanhamento retornou ${followAfterNumber.status}`);
  const followNumberHtml = normalize(await followAfterNumber.text());
  if (!followNumberHtml.includes("OUV-FAKE-123")) throw new Error("acompanhamento nao mostra protocolo oficial informado");
  ok("acompanhamento mostra protocolo oficial informado");

  const saveResponse = await service
    .from("comun_official_protocols")
    .update({
      response_text: responseSecret,
      response_received_at: new Date().toISOString(),
      satisfaction: "unsatisfactory",
      status: "response_received",
    })
    .eq("id", officialProtocolId);
  if (saveResponse.error) throw new Error(saveResponse.error.message);

  const followAfterResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!followAfterResponse.ok) throw new Error(`acompanhamento retornou ${followAfterResponse.status}`);
  const followResponseHtml = normalize(await followAfterResponse.text());
  if (!followResponseHtml.includes("Resposta recebida")) throw new Error("acompanhamento nao mostra estado de resposta recebida");
  if (followResponseHtml.includes(responseSecret)) throw new Error("response_text apareceu publicamente");
  ok("response_text nao aparece publicamente por padrao");

  const audit = await service.from("comun_admin_audit_log").insert({
    action: "official_protocol_response_saved",
    target_type: "official_protocol",
    target_id: officialProtocolId,
    metadata: { comun_protocol: protocol, report_id: reportId, status: "response_received" },
  });
  if (audit.error) throw new Error(audit.error.message);
  ok("auditoria/registro operacional confirmado");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
    ok("dados de smoke removidos");
  }
}
