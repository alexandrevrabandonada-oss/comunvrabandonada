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

loadEnvFile(envPath);
assertProductionChecksAllowed(process.env.NEXT_PUBLIC_SITE_URL);

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
const missingVars = requiredVars.filter((name) => !process.env[name]);
if (missingVars.length) {
  fail(`faltam variaveis obrigatorias: ${missingVars.join(", ")}`);
  process.exit();
}

const authenticatedToken = signLocalJwt({
  aud: "authenticated",
  role: "authenticated",
  sub: "00000000-0000-4000-8000-000000000030",
  exp: Math.floor(Date.now() / 1000) + 3600,
});
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const authenticated = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${authenticatedToken}` } },
});
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const protectedTables = [
  "comun_admin_notifications",
  "comun_admin_profiles",
  "comun_official_protocols",
  "comun_pauta_contributions",
  "comun_pauta_dossiers",
  "comun_pauta_dossier_reviews",
  "comun_pauta_dossier_evidence",
  "comun_pauta_dossier_publication_snapshots",
  "comun_pauta_synthesis_versions",
  "comun_public_dossier_features",
  "comun_public_lookup_events",
  "comun_report_attachments",
];

try {
  for (const table of protectedTables) {
    await expectBlocked(anon, table, "anon");
    await expectBlocked(authenticated, table, "authenticated");
  }
  ok("tabelas internas sem acesso direto anon/authenticated");

  const serviceProtocol = await service.from("comun_official_protocols").select("id").limit(1);
  if (serviceProtocol.error) throw new Error(`service_role falhou em protocolos oficiais: ${serviceProtocol.error.message}`);
  ok("protocolos oficiais seguem acessiveis server-side");

  const reportsProbe = await anon.from("comun_reports").select("raw_text, private_contact, internal_notes").limit(1);
  if (reportsProbe.error && !["42501", "PGRST301"].includes(reportsProbe.error.code ?? "")) {
    throw new Error(`comun_reports teve erro inesperado em leitura bloqueada por RLS: ${reportsProbe.error.message}`);
  }
  if (!reportsProbe.error && (reportsProbe.data ?? []).length > 0) throw new Error("comun_reports retornou campos brutos para anon");
  const attachmentsProbe = await anon.from("comun_report_attachments").select("storage_path, public_storage_path").limit(1);
  if (!attachmentsProbe.error) throw new Error("anexos permitiram leitura direta anon");
  ok("relatos brutos e anexos/storage paths protegidos");

  const publicEvidence = await anon.from("comun_pauta_evidence_items").select("title, summary, public_note, internal_note, sensitivity, status").limit(5);
  if (publicEvidence.error) throw new Error(`evidencias publicas falharam: ${publicEvidence.error.message}`);
  for (const item of publicEvidence.data ?? []) {
    if (item.internal_note) throw new Error("internal_note apareceu em leitura direta de evidencia publica");
    if (item.sensitivity !== "public_safe" || item.status !== "approved") throw new Error("evidencia nao segura apareceu publicamente");
  }
  ok("tabelas public_read_safe retornam apenas linhas sanitizadas por RLS");

  if (process.env.COMUN_RLS_SKIP_HTTP === "1") {
    ok("no-leak HTTP delegado ao restore isolado da aplicação");
  } else {
    const index = await fetch(new URL("/comun/dossies", process.env.NEXT_PUBLIC_SITE_URL));
    if (!index.ok) throw new Error(`/comun/dossies retornou ${index.status}`);
    const indexText = await index.text();
    for (const forbidden of ["internal_notes", "review_notes_internal", "unpublish_reason", "storage_path", "signed_url", "checklist", "comun_admin_profiles"]) {
      if (indexText.includes(forbidden)) throw new Error(`indice publico vazou ${forbidden}`);
    }
    ok("snapshots/dossies publicos seguem acessiveis somente por pagina segura");
  }

  console.log("RLS_MATRIX_SMOKE_OK");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
}

async function expectBlocked(client, table, role) {
  const result = await client.from(table).select("*").limit(1);
  if (!result.error) throw new Error(`${role} conseguiu acessar ${table}`);
  if (!["42501", "PGRST301"].includes(result.error.code ?? "")) throw new Error(`${role}/${table} erro inesperado: ${result.error.message}`);
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
