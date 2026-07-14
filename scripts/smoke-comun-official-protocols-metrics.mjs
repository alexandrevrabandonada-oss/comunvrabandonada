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

const now = Date.now();
const responseSecret = "METRICS-PRIVATE-RESPONSE";
const rawSecret = "METRICS-RAW-PRIVATE";
const contactSecret = "metrics-private-contact@example.invalid";
const notesSecret = "METRICS-INTERNAL-NOTES";
const publicSummary = "Resumo publico de smoke para metricas.";
const reportIds = [];

function protocolFor(index) {
  return `COMUN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Math.floor(100000 + Math.random() * 900000 + index)).slice(0, 6)}`;
}

try {
  const reports = [
    {
      protocol: protocolFor(1),
      community_slug: "cidade",
      issue_slug: "buracos-calcadas-abandono-bairros",
      title: "[Rapido: Buraco ou calcada] Metrics aguardando",
      status: "published",
    },
    {
      protocol: protocolFor(2),
      community_slug: "cidade",
      issue_slug: "buracos-calcadas-abandono-bairros",
      title: "[Rapido: Buraco ou calcada] Metrics vencido",
      status: "published",
    },
    {
      protocol: protocolFor(3),
      community_slug: "trabalho",
      issue_slug: "trabalho-burnout-volta-redonda",
      title: "[Burnout] Metrics resposta",
      status: "published",
    },
  ];

  const insertReports = await service.from("comun_reports").insert(reports.map((report) => ({
    ...report,
    raw_text: `${rawSecret} ${report.protocol}`,
    public_text: "Texto publico seguro para smoke de metricas.",
    period_text: "Este mes",
    approximate_location: "local aproximado",
    neighborhood: "Centro",
    involved_entity: null,
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: true,
    private_contact: contactSecret,
    internal_notes: notesSecret,
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "quick_report",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  }))).select("id, protocol");
  if (insertReports.error) throw new Error(insertReports.error.message);
  reportIds.push(...insertReports.data.map((report) => report.id));
  ok("relatos teste criados em duas pautas/comunidades");

  const reportByProtocol = new Map(insertReports.data.map((report) => [report.protocol, report.id]));
  const protocols = reports.map((report, index) => ({
    report_id: reportByProtocol.get(report.protocol),
    comun_protocol: report.protocol,
    channel: index === 2 ? "ministerio-publico-trabalho" : "ouvidoria-municipal",
    agency: index === 2 ? "MPT" : "Prefeitura municipal",
    official_protocol_number: index === 0 ? null : `OUV-METRICS-${index}`,
    submitted_by_user: true,
    submitted_at: new Date(now - (10 + index) * 24 * 60 * 60 * 1000).toISOString(),
    expected_response_at: index === 1 ? new Date(now - 24 * 60 * 60 * 1000).toISOString() : new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: index === 0 ? "waiting_response" : index === 1 ? "waiting_response" : "response_received",
    generated_text: `Ha registro comunitario no COMUN pelo protocolo ${report.protocol}.`,
    response_text: index === 2 ? responseSecret : null,
    response_received_at: index === 2 ? new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() : null,
    public_summary: index === 2 ? publicSummary : null,
  }));

  const insertProtocols = await service.from("comun_official_protocols").insert(protocols);
  if (insertProtocols.error) throw new Error(insertProtocols.error.message);
  ok("protocolos oficiais associados criados");

  const aggregateCheck = await service
    .from("comun_official_protocols")
    .select("status, response_text, public_summary, expected_response_at, report:comun_reports!inner(community_slug, issue_slug)")
    .in("report_id", reportIds);
  if (aggregateCheck.error) throw new Error(aggregateCheck.error.message);
  const rows = aggregateCheck.data ?? [];
  const reportFor = (row) => Array.isArray(row.report) ? row.report[0] : row.report;
  const citySidewalkRows = rows.filter((row) => reportFor(row)?.issue_slug === "buracos-calcadas-abandono-bairros");
  const overdueRows = rows.filter((row) => row.status === "waiting_response" && new Date(row.expected_response_at).getTime() < now);
  const responseWithoutSummaryRows = rows.filter((row) => row.response_text && !row.public_summary);
  if (citySidewalkRows.length < 2) throw new Error("agrupamento por pauta nao acumulou protocolos");
  if (!rows.some((row) => reportFor(row)?.community_slug === "trabalho")) throw new Error("agrupamento por comunidade nao incluiu segunda comunidade");
  if (!overdueRows.length) throw new Error("protocolo vencido nao foi detectado para metricas");
  if (responseWithoutSummaryRows.length) throw new Error("smoke deveria manter resposta com resumo publico");
  ok("agregacoes de pauta, comunidade, prazo e resumo validadas");

  const adminHtmlResponse = await fetch(new URL("/comun/admin/protocolos-oficiais", process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  if (![200, 307, 308].includes(adminHtmlResponse.status)) throw new Error(`admin metricas retornou ${adminHtmlResponse.status}`);
  const adminHtml = normalize(await adminHtmlResponse.text());
  if (adminHtmlResponse.status === 200) {
    for (const required of ["Inteligencia operacional", "Possiveis dossies", "Top pautas por volume", "Vencidos por pauta"]) {
      if (!adminHtml.includes(required)) throw new Error(`metricas admin nao exibiram: ${required}`);
    }
    if (adminHtml.includes(responseSecret) || adminHtml.includes(rawSecret) || adminHtml.includes(contactSecret) || adminHtml.includes(notesSecret)) {
      throw new Error("segredo apareceu no painel de metricas");
    }
    ok("metricas agregadas e possiveis dossies aparecem no admin");
  } else {
    ok("rota admin de metricas exige autenticacao em ambiente sem sessao");
  }

  const followResponse = await fetch(new URL(`/comun/acompanhar/${reports[2].protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!followResponse.ok) throw new Error(`acompanhamento retornou ${followResponse.status}`);
  const publicHtml = normalize(await followResponse.text());
  if (publicHtml.includes(responseSecret) || publicHtml.includes(rawSecret) || publicHtml.includes(contactSecret) || publicHtml.includes(notesSecret)) {
    throw new Error("dados sensiveis apareceram publicamente");
  }
  if (!publicHtml.includes(publicSummary)) throw new Error("resumo publico nao apareceu no acompanhamento");
  ok("publico mostra resumo seguro sem vazar campos privados");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (reportIds.length) {
    await service.from("comun_reports").delete().in("id", reportIds);
    ok("dados de smoke removidos");
  }
}
