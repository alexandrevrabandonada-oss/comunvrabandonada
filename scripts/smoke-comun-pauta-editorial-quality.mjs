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

const slug = `smoke-pauta-editorial-${Date.now()}`;
const oldSynthesis = "Sintese publica inicial segura.";
const newSynthesis = "Sintese publica revisada com criterio editorial.";
const candidateTitle = "Evidencia candidate invisivel";
const approvedTitle = "Evidencia publica aprovada smoke";
const privateTitle = "Evidencia privada invisivel";
const internalSecret = "INTERNAL-EVIDENCE-NOTE-SMOKE";
let pautaId = null;

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug,
    title: "Smoke qualidade editorial",
    summary: "Pauta para smoke editorial.",
    status: "organizing",
    visibility: "public",
    public_synthesis: oldSynthesis,
    next_step: "Passo inicial.",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const updatePauta = await service.from("comun_pauta_spaces").update({
    public_synthesis: newSynthesis,
    next_step: "Passo revisado.",
    editorial_checklist: ["no_personal_data", "clear_next_step", "no_pending_publication"],
  }).eq("id", pautaId);
  if (updatePauta.error) throw new Error(updatePauta.error.message);

  const insertVersion = await service.from("comun_pauta_synthesis_versions").insert({
    pauta_id: pautaId,
    previous_public_synthesis: oldSynthesis,
    new_public_synthesis: newSynthesis,
    previous_next_step: "Passo inicial.",
    new_next_step: "Passo revisado.",
    editor_note: "Smoke editorial",
  });
  if (insertVersion.error) throw new Error(insertVersion.error.message);

  const versions = await service.from("comun_pauta_synthesis_versions").select("id").eq("pauta_id", pautaId);
  if (versions.error) throw new Error(versions.error.message);
  if (!versions.data?.length) throw new Error("versao de sintese nao foi criada");
  ok("historico de versao criado");

  const candidate = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: candidateTitle,
    summary: "Resumo candidate.",
    evidence_type: "documento",
    sensitivity: "public_safe",
    status: "candidate",
    public_note: "Nota candidate.",
    internal_note: internalSecret,
  }).select("id").single();
  if (candidate.error) throw new Error(candidate.error.message);

  const candidateHtml = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  if (candidateHtml.includes(candidateTitle)) throw new Error("evidencia candidate apareceu publicamente");
  ok("evidencia candidate nao aparece publicamente");

  const approve = await service.from("comun_pauta_evidence_items").update({ status: "approved" }).eq("id", candidate.data.id);
  if (approve.error) throw new Error(approve.error.message);

  const approved = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: approvedTitle,
    summary: "Resumo publico aprovado.",
    evidence_type: "dado_agregado",
    sensitivity: "public_safe",
    status: "approved",
    public_note: "Nota publica aprovada.",
    internal_note: internalSecret,
  });
  if (approved.error) throw new Error(approved.error.message);

  const privateOnly = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: privateTitle,
    summary: "Resumo privado.",
    evidence_type: "documento",
    sensitivity: "private_only",
    status: "approved",
    public_note: "Nota privada nao deve aparecer.",
    internal_note: internalSecret,
  });
  if (privateOnly.error) throw new Error(privateOnly.error.message);

  const publicHtml = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  if (!publicHtml.includes(candidateTitle)) throw new Error("evidencia candidate aprovada/public_safe nao apareceu publicamente");
  if (!publicHtml.includes(approvedTitle)) throw new Error("evidencia approved public_safe nao apareceu publicamente");
  if (publicHtml.includes(privateTitle)) throw new Error("evidencia private_only apareceu publicamente");
  if (publicHtml.includes(internalSecret) || publicHtml.includes("internal_note")) throw new Error("internal_note vazou publicamente");
  for (const forbidden of ["raw_text", "private_contact", "response_text", "storage_path", "signed_url"]) {
    if (publicHtml.includes(forbidden)) throw new Error(`campo sensivel apareceu publicamente: ${forbidden}`);
  }
  ok("evidencias publicas respeitam status/sensibilidade e nao vazam nota interna");

  const adminSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/pautas/[id]/page.tsx"), "utf8");
  if (!adminSource.includes("Checklist editorial") || !adminSource.includes("Historico de versoes") || !adminSource.includes("Evidencias")) {
    throw new Error("admin de pauta nao contem secoes editoriais esperadas");
  }
  ok("admin contem checklist, evidencias e historico");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) {
    await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  }
  ok("dados de smoke removidos");
}
