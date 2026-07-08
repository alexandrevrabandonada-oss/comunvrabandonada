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

function state(reviews) {
  const approved = reviews.filter((review) => review.decision === "approved");
  const factual = approved.filter((review) => review.review_stage === "factual_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const editorial = approved.filter((review) => review.review_stage === "editorial_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const factualName = String(factual?.reviewer_name ?? "").trim().toLowerCase();
  const editorialName = String(editorial?.reviewer_name ?? "").trim().toLowerCase();
  const tags = [];
  if (!factual) tags.push("pending_factual");
  if (!editorial) tags.push("pending_editorial");
  if (factual && !editorial) tags.push("factual_without_editorial");
  if (editorial && !factual) tags.push("editorial_without_factual");
  if (factual && editorial && factualName === editorialName) tags.push("blocked_same_reviewer");
  if (reviews.some((review) => review.decision === "changes_requested")) tags.push("changes_requested");
  if (reviews.some((review) => review.decision === "rejected")) tags.push("rejected");
  if (factual && editorial && factualName !== editorialName) tags.push("ready_to_publish");
  return tags;
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
const secret = "REVIEW-QUEUE-INTERNAL-SECRET";
let pautaId = null;

async function createDossier(kind) {
  const created = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `queue-${kind}-${stamp}`,
    title: `Queue ${kind}`,
    status: "draft",
    review_status: kind === "ready" ? "approved" : "editorial_review",
    public_slug: `queue-public-${kind}-${stamp}`,
    public_title: `Queue public ${kind}`,
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro.",
    internal_notes: secret,
  }).select("id").single();
  if (created.error) throw new Error(created.error.message);
  return created.data.id;
}

async function addReview(dossierId, stage, reviewer, decision = "approved") {
  const inserted = await service.from("comun_pauta_dossier_reviews").insert({
    dossier_id: dossierId,
    review_stage: stage,
    reviewer_name: reviewer,
    reviewer_role: "smoke",
    decision,
    checklist: { smoke: true },
    notes: secret,
  });
  if (inserted.error) throw new Error(inserted.error.message);
}

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-review-queue-${stamp}`,
    title: "Smoke fila de revisoes",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const pending = await createDossier("pending");
  const factualOnly = await createDossier("factual");
  const editorialOnly = await createDossier("editorial");
  const blocked = await createDossier("blocked");
  const changes = await createDossier("changes");
  const rejected = await createDossier("rejected");
  const ready = await createDossier("ready");

  await addReview(factualOnly, "factual_review", "Factual A");
  await addReview(editorialOnly, "editorial_review", "Editorial A");
  await addReview(blocked, "factual_review", "Mesmo Revisor");
  await addReview(blocked, "editorial_review", "Mesmo Revisor");
  await addReview(changes, "factual_review", "Pessoa Ajuste", "changes_requested");
  await addReview(rejected, "editorial_review", "Pessoa Rejeicao", "rejected");
  await addReview(ready, "factual_review", "Factual B");
  await addReview(ready, "editorial_review", "Editorial B");
  ok("dossies em estados diferentes criados");

  const rows = await service
    .from("comun_pauta_dossiers")
    .select("id, title, reviews:comun_pauta_dossier_reviews(review_stage, reviewer_name, decision, created_at)")
    .eq("pauta_id", pautaId);
  if (rows.error) throw new Error(rows.error.message);
  const byTitle = Object.fromEntries(rows.data.map((row) => [row.title, state(row.reviews ?? [])]));
  if (!byTitle["Queue pending"].includes("pending_factual") || !byTitle["Queue pending"].includes("pending_editorial")) throw new Error("pendente total nao classificado");
  if (!byTitle["Queue factual"].includes("factual_without_editorial")) throw new Error("factual sem editorial nao classificado");
  if (!byTitle["Queue editorial"].includes("editorial_without_factual")) throw new Error("editorial sem factual nao classificado");
  if (!byTitle["Queue blocked"].includes("blocked_same_reviewer")) throw new Error("bloqueio por mesmo revisor nao classificado");
  if (!byTitle["Queue changes"].includes("changes_requested")) throw new Error("ajustes solicitados nao classificado");
  if (!byTitle["Queue rejected"].includes("rejected")) throw new Error("rejeitado nao classificado");
  if (!byTitle["Queue ready"].includes("ready_to_publish")) throw new Error("pronto para publicar nao classificado");
  ok("classificacao de fila confirmada");

  await addReview(factualOnly, "editorial_review", "Editorial C");
  const moved = await service
    .from("comun_pauta_dossiers")
    .select("reviews:comun_pauta_dossier_reviews(review_stage, reviewer_name, decision, created_at)")
    .eq("id", factualOnly)
    .single();
  if (moved.error) throw new Error(moved.error.message);
  if (!state(moved.data.reviews ?? []).includes("ready_to_publish")) throw new Error("dossie nao mudou para pronto apos revisao editorial");
  ok("mudanca de categoria apos revisao confirmada");

  const adminSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/dossies/revisoes/page.tsx"), "utf8");
  if (!adminSource.includes("Fila de revisoes") || !adminSource.includes("Pendente factual") || !adminSource.includes("Prontos para publicar")) {
    throw new Error("pagina admin de fila nao contem elementos esperados");
  }
  const response = await fetch(new URL("/comun/admin/dossies/revisoes", process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  const body = normalize(await response.text());
  if (response.status === 200 && body.includes(secret)) throw new Error("rota admin sem sessao expos dado interno");
  ok("rota admin exige sessao e nao expoe segredo sem login");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
