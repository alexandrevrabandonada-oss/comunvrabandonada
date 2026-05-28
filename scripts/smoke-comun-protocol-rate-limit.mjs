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

async function fetchHtml(pathname) {
  const response = await fetch(new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL), {
    headers: { "user-agent": "COMUN protocol rate-limit smoke" },
  });
  if (!response.ok) throw new Error(`${pathname} retornou ${response.status}`);
  return normalize(await response.text());
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
const missingProtocol = `COMUN-20990101-${Math.floor(100000 + Math.random() * 900000)}`;
let insertedId = null;

try {
  const invalidHtml = await fetchHtml("/comun/acompanhar/protocolo-invalido");
  if (!invalidHtml.includes("Digite um protocolo COMUN valido")) {
    throw new Error("protocolo invalido nao retornou resposta generica esperada");
  }
  for (const forbidden of ["raw_text", "private_contact", "internal_notes"]) {
    if (invalidHtml.includes(forbidden)) throw new Error(`protocolo invalido vazou ${forbidden}`);
  }
  ok("protocolo invalido retorna resposta generica segura");

  const missingHtml = await fetchHtml(`/comun/acompanhar/${missingProtocol}`);
  if (!missingHtml.includes("Nao foi possivel localizar um relato publico com esse protocolo")) {
    throw new Error("protocolo inexistente nao retornou resposta generica esperada");
  }
  ok("protocolo inexistente retorna resposta generica segura");

  const insert = await anon.from("comun_reports").insert({
    protocol,
    community_slug: "trabalho",
    issue_slug: "trabalho-burnout-volta-redonda",
    title: "Smoke rate limit",
    raw_text: "RATE-LIMIT-RAW-SENSIVEL relato interno de smoke para validar limite de consultas por protocolo.",
    period_text: "maio de 2026",
    approximate_location: "bairro aproximado",
    neighborhood: "Aterrado",
    involved_entity: "empresa teste",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: true,
    private_contact: "RATE-LIMIT-PRIVADO@example.com",
    status: "received",
    risk_level: "unknown",
  });

  if (insert.error) throw new Error(insert.error.message);

  const stored = await service.from("comun_reports").select("id").eq("protocol", protocol).single();
  if (stored.error || !stored.data) throw new Error(stored.error?.message ?? "falha ao localizar relato de smoke");
  insertedId = stored.data.id;

  const validHtml = await fetchHtml(`/comun/acompanhar/${protocol}`);
  if (!validHtml.includes(protocol) || !validHtml.includes("Recebido pelo COMUN")) {
    throw new Error("protocolo valido nao retornou status seguro");
  }
  for (const forbidden of ["RATE-LIMIT-RAW-SENSIVEL", "RATE-LIMIT-PRIVADO@example.com", "raw_text", "private_contact"]) {
    if (validHtml.includes(forbidden)) throw new Error(`protocolo valido vazou ${forbidden}`);
  }
  ok("protocolo valido retorna resposta segura");

  let limited = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const html = await fetchHtml(`/comun/acompanhar/${protocol}`);
    if (html.includes("Muitas tentativas em pouco tempo")) {
      limited = true;
      break;
    }
  }

  if (!limited) throw new Error("limite de consultas repetidas nao foi acionado");
  ok("limite de consultas repetidas acionado");

  const events = await service
    .from("comun_public_lookup_events")
    .select("result_type")
    .eq("normalized_protocol", protocol)
    .order("created_at", { ascending: false })
    .limit(20);

  if (events.error) throw new Error(events.error.message);
  const resultTypes = (events.data ?? []).map((event) => event.result_type);
  if (!resultTypes.includes("found_received") || !resultTypes.includes("rate_limited")) {
    throw new Error("eventos de observabilidade esperados nao foram registrados");
  }
  ok("eventos de observabilidade registrados");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (insertedId) {
    await service.from("comun_reports").delete().eq("id", insertedId);
    await service.from("comun_public_lookup_events").delete().eq("normalized_protocol", protocol);
    ok("dados de smoke removidos");
  }
}
