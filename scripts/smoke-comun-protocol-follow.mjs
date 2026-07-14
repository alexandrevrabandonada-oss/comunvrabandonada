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

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
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

try {
  const insert = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "trabalho",
    issue_slug: "trabalho-burnout-volta-redonda",
    title: "Smoke protocolo",
    raw_text: "TEXTO-SENSIVEL-PROTOCOLO relato interno de smoke para validar a consulta segura por protocolo no COMUN.",
    period_text: "maio de 2026",
    approximate_location: "bairro aproximado",
    neighborhood: "Aterrado",
    involved_entity: "empresa teste",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: true,
    private_contact: "PROTOCOLO-PRIVADO@example.com",
    status: "received",
    risk_level: "unknown",
    internal_notes: null,
  });

  if (insert.error) throw new Error(insert.error.message);

  const stored = await service.from("comun_reports").select("id").eq("protocol", protocol).single();
  if (stored.error || !stored.data) throw new Error(stored.error?.message ?? "falha ao localizar relato de smoke");
  insertedId = stored.data.id;

  const firstResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!firstResponse.ok) throw new Error(`pagina de acompanhamento inicial retornou ${firstResponse.status}`);
  const firstHtml = normalize(await firstResponse.text());

  for (const text of [protocol, "Recebido pelo COMUN. A equipe ainda nao revisou."]) {
    if (!firstHtml.includes(normalize(text))) {
      throw new Error(`pagina inicial nao contem texto esperado: ${text}`);
    }
  }

  for (const forbidden of ["TEXTO-SENSIVEL-PROTOCOLO", "PROTOCOLO-PRIVADO@example.com", "internal_notes"]) {
    if (firstHtml.includes(normalize(forbidden))) {
      throw new Error(`pagina inicial vazou texto proibido: ${forbidden}`);
    }
  }
  ok("status inicial seguro por protocolo validado");

  const publicText = "Versao sanitizada por protocolo: problema recorrente de pressao no trabalho sem dados pessoais.";
  const publish = await service
    .from("comun_reports")
    .update({
      public_text: publicText,
      status: "published",
      published_at: new Date().toISOString(),
      internal_notes: "NAO-EXIBIR-INTERNO",
    })
    .eq("id", insertedId);

  if (publish.error) throw new Error(publish.error.message);

  const secondResponse = await fetch(new URL(`/comun/acompanhar/${protocol}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!secondResponse.ok) throw new Error(`pagina de acompanhamento publicada retornou ${secondResponse.status}`);
  const secondHtml = normalize(await secondResponse.text());

  for (const text of [protocol, "Uma versao sanitizada foi publicada.", publicText]) {
    if (!secondHtml.includes(normalize(text))) {
      throw new Error(`pagina publicada nao contem texto esperado: ${text}`);
    }
  }

  for (const forbidden of ["TEXTO-SENSIVEL-PROTOCOLO", "PROTOCOLO-PRIVADO@example.com", "NAO-EXIBIR-INTERNO", "private_contact", "raw_text"]) {
    if (secondHtml.includes(normalize(forbidden))) {
      throw new Error(`pagina publicada vazou texto proibido: ${forbidden}`);
    }
  }
  ok("status publicado seguro por protocolo validado");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (insertedId) {
    await service.from("comun_reports").delete().eq("id", insertedId);
    ok("relato de smoke removido");
  }
}
