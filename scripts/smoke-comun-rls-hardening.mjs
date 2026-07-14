import { createClient } from "@supabase/supabase-js";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
import crypto from "node:crypto";
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

async function fetchText(pathname) {
  const response = await fetch(new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL));
  return { status: response.status, text: normalize(await response.text()) };
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
const authenticatedToken = signLocalJwt({
  aud: "authenticated",
  role: "authenticated",
  sub: "00000000-0000-4000-8000-000000000029",
  exp: Math.floor(Date.now() / 1000) + 3600,
});
const authenticated = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${authenticatedToken}` } },
});
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const stamp = Date.now();
const protocol = `COMUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;
const responseSecret = `RLS-HARDENING-RESPONSE-${stamp}`;
const rawSecret = `RLS-HARDENING-RAW-${stamp}`;
const privateContact = `rls-private-${stamp}@example.test`;
const internalNotes = `RLS-HARDENING-INTERNAL-${stamp}`;
let reportId = null;
let officialProtocolId = null;

try {
  const serviceProbe = await service.from("comun_official_protocols").select("id").limit(1);
  if (serviceProbe.error) throw new Error(`service_role nao acessa comun_official_protocols: ${serviceProbe.error.message}`);
  ok("service_role acessa comun_official_protocols server-side");

  const anonProbe = await anon.from("comun_official_protocols").select("id").limit(1);
  if (!anonProbe.error) throw new Error("anon conseguiu acesso direto a comun_official_protocols");
  if (!["42501", "PGRST301"].includes(anonProbe.error.code ?? "")) throw new Error(`anon falhou com erro inesperado: ${anonProbe.error.message}`);
  ok("anon nao tem acesso direto a comun_official_protocols");

  const authProbe = await authenticated.from("comun_official_protocols").select("id").limit(1);
  if (!authProbe.error) throw new Error("authenticated conseguiu acesso direto a comun_official_protocols");
  if (!["42501", "PGRST301"].includes(authProbe.error.code ?? "")) throw new Error(`authenticated falhou com erro inesperado: ${authProbe.error.message}`);
  ok("authenticated nao tem acesso direto a comun_official_protocols");

  const insertReport = await service.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada] Hardening RLS",
    raw_text: `${rawSecret} relato bruto com contato ${privateContact}`,
    public_text: "Relato publico sanitizado para hardening de RLS.",
    period_text: "Hoje",
    approximate_location: "local aproximado",
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
  }).select("id").single();
  if (insertReport.error) throw new Error(insertReport.error.message);
  reportId = insertReport.data.id;

  const insertOfficial = await service.from("comun_official_protocols").insert({
    report_id: reportId,
    comun_protocol: protocol,
    channel: "ouvidoria-municipal",
    agency: "Prefeitura municipal",
    official_protocol_number: `RLS-${stamp}`,
    submitted_by_user: true,
    submitted_at: new Date().toISOString(),
    expected_response_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "response_received",
    generated_text: `Ha registro comunitario no COMUN pelo protocolo ${protocol}.`,
    response_text: responseSecret,
    response_received_at: new Date().toISOString(),
    public_summary: "Resumo publico seguro do retorno oficial.",
    internal_notes: internalNotes,
  }).select("id").single();
  if (insertOfficial.error) throw new Error(insertOfficial.error.message);
  officialProtocolId = insertOfficial.data.id;
  ok("dados sensiveis de protocolo oficial criados via service_role");

  const directAnon = await anon.from("comun_official_protocols").select("response_text, internal_notes").eq("id", officialProtocolId);
  if (!directAnon.error) throw new Error("anon leu campos sensiveis diretamente apos insert");
  ok("anon segue bloqueado apos criacao de dados sensiveis");

  const follow = await fetchText(`/comun/acompanhar/${protocol}`);
  if (follow.status !== 200) throw new Error(`rota publica retornou ${follow.status}`);
  for (const expected of [protocol, `RLS-${stamp}`, "Resumo publico seguro do retorno oficial.", "Resposta recebida"]) {
    if (!follow.text.includes(expected)) throw new Error(`rota publica nao contem campo seguro esperado: ${expected}`);
  }
  for (const forbidden of [
    responseSecret,
    rawSecret,
    privateContact,
    internalNotes,
    "response_text",
    "raw_text",
    "private_contact",
    "internal_notes",
    "storage_path",
    "signed_url",
  ]) {
    if (follow.text.includes(forbidden)) throw new Error(`rota publica vazou campo sensivel: ${forbidden}`);
  }
  ok("rota publica segue funcionando sem vazamento");

  const adminSurface = await service
    .from("comun_official_protocols")
    .select("id, response_text, internal_notes, report:comun_reports!inner(protocol)")
    .eq("id", officialProtocolId)
    .single();
  if (adminSurface.error || adminSurface.data?.response_text !== responseSecret) throw new Error("admin/server-side nao acessa dados completos");
  ok("admin/server-side segue acessando dados completos via service_role");

  console.log("RLS_HARDENING_SMOKE_OK");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
    ok("dados de smoke removidos");
  }
}

function signLocalJwt(payload) {
  const secret = process.env.SUPABASE_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}
