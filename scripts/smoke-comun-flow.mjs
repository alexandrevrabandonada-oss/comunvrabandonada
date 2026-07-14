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

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function logOk(message) {
  console.log(`[ok] ${message}`);
}

function logFail(message) {
  console.error(`[fail] ${message}`);
}

function fail(message) {
  logFail(message);
  process.exitCode = 1;
}

function formatError(error) {
  if (!(error instanceof Error)) return "erro desconhecido no smoke";
  const causeCode = error.cause?.code;
  return causeCode ? `${error.message} (${causeCode})` : error.message;
}

loadEnvFile(envPath);

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias em .env.local: ${missingVars.join(", ")}`);
  process.exit();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const testProtocol = `SMOKE-${Date.now()}`;
let insertedReportId = null;

try {
  logOk(".env.local carregado sem expor segredos");

  const insertPayload = {
    protocol: testProtocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: "Smoke test do fluxo COMUN",
    raw_text: "Relato de smoke test para validar o fluxo completo com sanitizacao e publicacao segura no COMUN.",
    period_text: "maio de 2026",
    approximate_location: "bairro aproximado",
    neighborhood: "Centro",
    involved_entity: "Servico municipal",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: true,
    private_contact: "contato-interno-smoke@example.com",
    status: "received",
    risk_level: "unknown",
  };

  const insertResult = await anonClient.from("comun_reports").insert(insertPayload);
  if (insertResult.error) {
    throw new Error(`falha ao inserir relato de teste: ${insertResult.error.message}`);
  }
  logOk("relato de teste inserido pela chave publica");

  const internalResult = await serviceClient
    .from("comun_reports")
    .select("id, protocol, raw_text, private_contact, public_text, status")
    .eq("protocol", testProtocol)
    .single();

  if (internalResult.error || !internalResult.data) {
    throw new Error(`falha ao localizar relato interno: ${internalResult.error?.message ?? "sem retorno"}`);
  }

  insertedReportId = internalResult.data.id;
  logOk("relato confirmado na tabela interna comun_reports");

  const sanitizedText = "Versao sanitizada de teste: problema recorrente em servico municipal, sem dados pessoais.";
  const publishResult = await serviceClient
    .from("comun_reports")
    .update({
      public_text: sanitizedText,
      status: "published",
      published_at: new Date().toISOString(),
      internal_notes: "Publicado apenas para smoke test automatizado.",
    })
    .eq("id", insertedReportId)
    .select("id, status, public_text, published_at")
    .single();

  if (publishResult.error || !publishResult.data) {
    throw new Error(`falha ao publicar relato sanitizado: ${publishResult.error?.message ?? "sem retorno"}`);
  }

  logOk("versao sanitizada publicada no registro interno");

  const publicResult = await anonClient
    .from("comun_public_reports")
    .select("*")
    .eq("id", insertedReportId)
    .single();

  if (publicResult.error || !publicResult.data) {
    throw new Error(`falha ao consultar view publica: ${publicResult.error?.message ?? "sem retorno"}`);
  }

  if (publicResult.data.public_text !== sanitizedText) {
    throw new Error("view publica nao refletiu o public_text sanitizado");
  }

  const forbiddenFields = ["raw_text", "private_contact", "internal_notes"].filter((field) => field in publicResult.data);
  if (forbiddenFields.length) {
    throw new Error(`view publica expôs campos privados: ${forbiddenFields.join(", ")}`);
  }

  logOk("view comun_public_reports retorna apenas o relato publicado e sem campos privados");

  const cleanupResult = await serviceClient.from("comun_reports").delete().eq("id", insertedReportId);
  if (cleanupResult.error) {
    throw new Error(`falha ao limpar relato de teste: ${cleanupResult.error.message}`);
  }

  insertedReportId = null;
  logOk("relato de smoke removido ao final");
} catch (error) {
  fail(formatError(error));

  if (insertedReportId) {
    const cleanupResult = await serviceClient.from("comun_reports").delete().eq("id", insertedReportId);
    if (cleanupResult.error) {
      logFail("nao foi possivel limpar o relato de smoke apos a falha");
    } else {
      logOk("cleanup de contingencia executado");
    }
  }
}
