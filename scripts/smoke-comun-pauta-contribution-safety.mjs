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

function parseHiddenInputs(html) {
  const fields = {};
  for (const match of html.matchAll(/<input[^>]+type="hidden"[^>]*>/g)) {
    const tag = match[0];
    const name = tag.match(/\sname="([^"]+)"/)?.[1];
    const value = tag.match(/\svalue="([^"]*)"/)?.[1] ?? "";
    if (name) fields[name] = value.replaceAll("&quot;", "\"").replaceAll("&amp;", "&");
  }
  return fields;
}

async function postContribution({ slug, hiddenFields, body, answer = "5", honeypot = "", forwardedFor }) {
  const form = new FormData();
  for (const [key, value] of Object.entries(hiddenFields)) form.set(key, value);
  form.set("author_alias", "Smoke");
  form.set("contribution_type", "proposta");
  form.set("body", body);
  form.set("contact_private", "PRIVATE-CONTACT-SAFETY-SMOKE");
  form.set("human_check", answer);
  form.set("company_website", honeypot);
  return fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL), {
    method: "POST",
    headers: {
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
    body: form,
    redirect: "manual",
  });
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

const slug = `smoke-pauta-safety-${Date.now()}`;
const validBody = `Contribuicao valida de seguranca ${Date.now()} com texto suficiente para moderacao.`;
const invalidBody = `Contribuicao invalida por desafio ${Date.now()} com texto suficiente.`;
const repeatedIp = `203.0.113.${Math.floor(10 + Math.random() * 100)}`;
let pautaId = null;

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug,
    title: "Smoke seguranca contribuicoes",
    summary: "Pauta para smoke de seguranca.",
    status: "organizing",
    visibility: "public",
    public_synthesis: "Sintese segura.",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const pageResponse = await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!pageResponse.ok) throw new Error(`pauta retornou ${pageResponse.status}`);
  const pageHtml = await pageResponse.text();
  const hiddenFields = parseHiddenInputs(pageHtml);
  if (!Object.keys(hiddenFields).some((key) => key.startsWith("$ACTION_"))) throw new Error("campos de Server Action nao encontrados");
  if (!pageHtml.includes("quanto e 2 + 3")) throw new Error("desafio leve nao apareceu no formulario");
  ok("formulario publico contem desafio leve");

  const validPost = await postContribution({ slug, hiddenFields, body: validBody });
  if (![200, 303, 307, 308].includes(validPost.status)) throw new Error(`envio valido retornou ${validPost.status}`);
  const validRows = await service.from("comun_pauta_contributions").select("*").eq("pauta_id", pautaId).eq("body", validBody);
  if (validRows.error) throw new Error(validRows.error.message);
  const valid = validRows.data?.[0];
  if (!valid || valid.status !== "pending") throw new Error("contribuicao valida nao entrou como pending");
  if (valid.risk_level !== "normal") throw new Error("contribuicao valida deveria ter risco normal");
  if (!valid.submitter_hash || !valid.user_agent_hash) throw new Error("hashes internos nao foram gerados");
  ok("contribuicao valida entrou como pending com hashes internos");

  const publicPending = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  if (publicPending.includes(validBody)) throw new Error("pending apareceu publicamente");
  if (publicPending.includes(String(valid.submitter_hash)) || publicPending.includes(String(valid.user_agent_hash))) throw new Error("hash apareceu publicamente");
  ok("pending e hashes nao aparecem publicamente");

  const approve = await service.from("comun_pauta_contributions").update({ status: "approved" }).eq("id", valid.id);
  if (approve.error) throw new Error(approve.error.message);
  const publicApproved = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  if (!publicApproved.includes(validBody)) throw new Error("contribuicao aprovada nao apareceu publicamente");
  ok("contribuicao aprovada aparece publicamente");

  const invalidPost = await postContribution({ slug, hiddenFields, body: invalidBody, answer: "4", honeypot: "bot-field" });
  if (![200, 303, 307, 308].includes(invalidPost.status)) throw new Error(`envio suspeito retornou ${invalidPost.status}`);
  const invalidRows = await service.from("comun_pauta_contributions").select("status, risk_level, risk_reasons, moderation_priority").eq("pauta_id", pautaId).eq("body", invalidBody);
  if (invalidRows.error) throw new Error(invalidRows.error.message);
  const invalid = invalidRows.data?.[0];
  if (!invalid || invalid.status !== "archived" || invalid.risk_level !== "high") throw new Error("desafio/honeypot nao arquivou contribuicao suspeita");
  if (!invalid.risk_reasons.includes("desafio_invalido") || !invalid.risk_reasons.includes("honeypot_preenchido")) throw new Error("motivos de risco esperados nao foram registrados");
  ok("desafio invalido/honeypot arquiva contribuicao suspeita");

  let rateLimited = false;
  for (let index = 0; index < 7; index += 1) {
    const response = await postContribution({
      slug,
      hiddenFields,
      body: `Envio repetido ${index} ${Date.now()} com texto suficiente para teste de limite.`,
      forwardedFor: repeatedIp,
    });
    if (response.status >= 500 || response.status === 429) {
      rateLimited = true;
      break;
    }
  }
  if (!rateLimited) throw new Error("controle de uso excessivo nao bloqueou envios repetidos");
  ok("controle de uso excessivo bloqueia repeticao");

  const queue = await service
    .from("comun_pauta_contributions")
    .select("id, status, risk_level, risk_reasons, moderation_priority, pauta:comun_pauta_spaces!inner(id, title)")
    .eq("pauta_id", pautaId)
    .eq("status", "pending");
  if (queue.error) throw new Error(queue.error.message);
  if (!queue.data?.length) throw new Error("fila global nao teria pending para listar");
  ok("dados da fila global possuem pendentes e risco");

  const publicFinal = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  for (const forbidden of ["PRIVATE-CONTACT-SAFETY-SMOKE", "submitter_hash", "user_agent_hash", "risk_reasons", "RAW-TEXT", "INTERNAL-NOTES", "RESPONSE-TEXT", "storage_path"]) {
    if (publicFinal.includes(forbidden)) throw new Error(`metadado/segredo apareceu publicamente: ${forbidden}`);
  }
  ok("metadados e dados sensiveis nao aparecem publicamente");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) {
    await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  }
  ok("dados de smoke removidos");
}
