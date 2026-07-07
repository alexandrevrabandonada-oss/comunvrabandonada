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

const stamp = Date.now();
const slug = `smoke-pauta-dossie-${stamp}`;
const publicEvidenceTitle = "Evidencia publica para dossie smoke";
const privateEvidenceTitle = "Evidencia privada fora do dossie smoke";
const secret = "DOSSIER-INTERNAL-SECRET-SMOKE";
let pautaId = null;
let dossierId = null;

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug,
    title: "Smoke dossie por pauta",
    summary: "Pauta para validar rascunho de dossie.",
    category: "smoke-dossie",
    community: "volta-redonda",
    status: "drafting",
    visibility: "public",
    public_synthesis: "Sintese publica segura para gerar dossie.",
    next_step: "Cobrar retorno e organizar demandas.",
    editorial_checklist: ["no_personal_data", "has_approved_evidence", "dossier_candidate"],
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const publicEvidence = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: publicEvidenceTitle,
    summary: "Resumo publico da evidencia.",
    evidence_type: "documento",
    sensitivity: "public_safe",
    status: "approved",
    public_note: "Nota publica segura.",
    internal_note: secret,
  }).select("id").single();
  if (publicEvidence.error) throw new Error(publicEvidence.error.message);

  const privateEvidence = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: privateEvidenceTitle,
    summary: "Resumo que nao deve entrar.",
    evidence_type: "documento",
    sensitivity: "private_only",
    status: "approved",
    public_note: "Nota privada nao publica.",
    internal_note: secret,
  });
  if (privateEvidence.error) throw new Error(privateEvidence.error.message);
  ok("evidencias de teste criadas");

  const createTask = await service.from("comun_pauta_tasks").insert({
    pauta_id: pautaId,
    title: "Cobrar retorno oficial",
    description: "Tarefa operacional de smoke.",
    status: "open",
    help_needed: true,
  });
  if (createTask.error) throw new Error(createTask.error.message);

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `dossie-${slug}`,
    title: "Dossie: Smoke dossie por pauta",
    status: "draft",
    executive_summary: "Sintese publica segura para gerar dossie.",
    problem_statement: "Problema publico sanitizado.",
    affected_communities: "volta-redonda",
    evidence_summary: publicEvidenceTitle,
    official_protocols_summary: "0 protocolo(s) oficial(is) relacionado(s).",
    demands: "1. Responder oficialmente.",
    next_steps: "Cobrar retorno e organizar demandas.",
    public_version: `# Dossie: Smoke dossie por pauta\n\n${publicEvidenceTitle}\n\nSem dados sensiveis.`,
    internal_notes: secret,
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;

  const linkEvidence = await service.from("comun_pauta_dossier_evidence").insert({
    dossier_id: dossierId,
    evidence_id: publicEvidence.data.id,
    position: 0,
  });
  if (linkEvidence.error) throw new Error(linkEvidence.error.message);
  ok("dossie e vinculo de evidencia criados");

  const dossier = await service
    .from("comun_pauta_dossiers")
    .select("id, title, status, public_version, internal_notes, evidence_items:comun_pauta_dossier_evidence(evidence_id, evidence:comun_pauta_evidence_items(title, sensitivity, status, internal_note))")
    .eq("id", dossierId)
    .single();
  if (dossier.error) throw new Error(dossier.error.message);
  if (dossier.data.status !== "draft") throw new Error("dossie nao ficou como draft");
  if (!dossier.data.evidence_items?.some((item) => item.evidence?.title === publicEvidenceTitle)) throw new Error("evidencia publica nao foi vinculada ao dossie");
  if (dossier.data.evidence_items?.some((item) => item.evidence?.title === privateEvidenceTitle)) throw new Error("evidencia private_only entrou no dossie");
  ok("rascunho contem apenas evidencia publica segura");

  const updateDossier = await service.from("comun_pauta_dossiers").update({
    status: "in_review",
    public_version: `# Dossie revisado\n\n${publicEvidenceTitle}\n\nResumo publico final.`,
    internal_notes: secret,
  }).eq("id", dossierId);
  if (updateDossier.error) throw new Error(updateDossier.error.message);
  ok("edicao do dossie confirmada");

  const adminSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/dossies/[id]/page.tsx"), "utf8");
  const previewSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/dossies/[id]/preview/page.tsx"), "utf8");
  const pautaSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/pautas/[id]/page.tsx"), "utf8");
  if (!pautaSource.includes("Dossie da pauta") || !pautaSource.includes("Criar rascunho")) throw new Error("admin da pauta nao mostra bloco do dossie");
  if (!adminSource.includes("Notas internas") || !adminSource.includes("Evidencias incluidas")) throw new Error("editor admin do dossie incompleto");
  if (previewSource.includes("internal_notes") || previewSource.includes("Notas internas")) throw new Error("preview referencia notas internas");
  ok("rotas admin de dossie contem editor e preview seguro");

  const publicHtml = normalize(await (await fetch(new URL(`/comun/pautas/${slug}`, process.env.NEXT_PUBLIC_SITE_URL))).text());
  if (publicHtml.includes(secret)) throw new Error("nota interna do dossie vazou na pauta publica");
  if (publicHtml.includes("comun_pauta_dossiers")) throw new Error("nome da tabela de dossie vazou publicamente");
  ok("pauta publica nao expoe dados internos do dossie");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
