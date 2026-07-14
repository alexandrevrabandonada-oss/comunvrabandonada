import { createClient } from "@supabase/supabase-js";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
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
assertProductionChecksAllowed(process.env.NEXT_PUBLIC_SITE_URL);

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias: ${missingVars.join(", ")}`);
  process.exit();
}

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const slug = `smoke-pauta-social-${Date.now()}`;
const pendingBody = "CONTRIBUICAO-PENDING-NAO-DEVE-APARECER";
const approvedBody = "Contribuicao aprovada de smoke para pauta social.";
const privateContact = "PRIVATE-CONTACT-PAUTA-SMOKE";
const rawSecret = "RAW-TEXT-PAUTA-SMOKE";
const notesSecret = "INTERNAL-NOTES-PAUTA-SMOKE";
const responseSecret = "RESPONSE-TEXT-PAUTA-SMOKE";
const storageSecret = "storage_path/pauta-smoke-secret";
let pautaId = null;
let reportId = null;

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug,
    title: "Smoke pauta social",
    summary: "Pauta social de teste automatizado.",
    category: "buracos-calcadas-abandono-bairros",
    community: "cidade",
    status: "organizing",
    visibility: "public",
    public_synthesis: "Sintese publica segura do smoke.",
    next_step: "Validar contribuicoes moderadas.",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const protocol = `COMUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(100000 + Math.random() * 900000)}`;
  const createReport = await service.from("comun_reports").insert({
    protocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "[Rapido: Buraco ou calcada] Smoke pauta",
    raw_text: rawSecret,
    public_text: "Texto publico seguro associado a pauta social.",
    period_text: "Hoje",
    approximate_location: "local aproximado",
    neighborhood: "Centro",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    internal_notes: notesSecret,
    status: "published",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (createReport.error) throw new Error(createReport.error.message);
  reportId = createReport.data.id;

  const createProtocol = await service.from("comun_official_protocols").insert({
    report_id: reportId,
    comun_protocol: protocol,
    channel: "ouvidoria-municipal",
    agency: "Prefeitura municipal",
    official_protocol_number: "OUV-PAUTA-SMOKE",
    submitted_by_user: true,
    submitted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expected_response_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "waiting_response",
    generated_text: "Texto seguro gerado.",
    response_text: responseSecret,
  });
  if (createProtocol.error) throw new Error(createProtocol.error.message);

  const createContribution = await service.from("comun_pauta_contributions").insert({
    pauta_id: pautaId,
    contribution_type: "proposta",
    author_alias: "Smoke",
    body: pendingBody,
    contact_private: privateContact,
    status: "pending",
    moderator_notes: notesSecret,
  }).select("id").single();
  if (createContribution.error) throw new Error(createContribution.error.message);
  const contributionId = createContribution.data.id;

  const listResponse = await fetch(new URL("/comun/pautas", process.env.NEXT_PUBLIC_SITE_URL));
  if (!listResponse.ok) throw new Error(`/comun/pautas retornou ${listResponse.status}`);
  const listHtml = normalize(await listResponse.text());
  if (!listHtml.includes("Smoke pauta social")) throw new Error("pauta nao apareceu na listagem publica");
  ok("listagem publica abriu pauta");

  const detailResponse = await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!detailResponse.ok) throw new Error(`/comun/pautas/${slug} retornou ${detailResponse.status}`);
  const pendingHtml = normalize(await detailResponse.text());
  if (pendingHtml.includes(pendingBody)) throw new Error("contribuicao pending apareceu publicamente");
  for (const forbidden of [privateContact, rawSecret, notesSecret, responseSecret, storageSecret]) {
    if (pendingHtml.includes(forbidden)) throw new Error(`segredo apareceu publicamente: ${forbidden}`);
  }
  ok("contribuicao pending e campos privados nao aparecem");

  const approve = await service.from("comun_pauta_contributions").update({
    status: "approved",
    body: approvedBody,
  }).eq("id", contributionId);
  if (approve.error) throw new Error(approve.error.message);

  const createTask = await service.from("comun_pauta_tasks").insert({
    pauta_id: pautaId,
    title: "Tarefa publica de smoke",
    description: "Descricao segura de tarefa publica.",
    status: "open",
    help_needed: true,
    owner_alias: "Equipe",
  });
  if (createTask.error) throw new Error(createTask.error.message);

  const approvedResponse = await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!approvedResponse.ok) throw new Error(`pauta aprovada retornou ${approvedResponse.status}`);
  const approvedHtml = normalize(await approvedResponse.text());
  if (!approvedHtml.includes(approvedBody)) throw new Error("contribuicao aprovada nao apareceu publicamente");
  if (!approvedHtml.includes("Tarefa publica de smoke")) throw new Error("tarefa publica nao apareceu");
  for (const forbidden of [privateContact, rawSecret, notesSecret, responseSecret, storageSecret]) {
    if (approvedHtml.includes(forbidden)) throw new Error(`segredo apareceu apos aprovacao: ${forbidden}`);
  }
  ok("contribuicao aprovada e tarefa aparecem sem vazamento");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) {
    await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  }
  if (reportId) {
    await service.from("comun_reports").delete().eq("id", reportId);
  }
  ok("dados de smoke removidos");
}
