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

function reviewState(reviews) {
  const approved = reviews.filter((review) => review.decision === "approved");
  const factual = approved.filter((review) => review.review_stage === "factual_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const editorial = approved.filter((review) => review.review_stage === "editorial_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const factualName = String(factual?.reviewer_name ?? "").trim().toLowerCase();
  const editorialName = String(editorial?.reviewer_name ?? "").trim().toLowerCase();
  return {
    factual,
    editorial,
    canPublish: Boolean(factual && editorial && factualName && editorialName && factualName !== editorialName),
  };
}

async function fetchText(pathname) {
  const response = await fetch(new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  return { status: response.status, text: normalize(await response.text()) };
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
const pautaSlug = `smoke-pauta-dupla-revisao-${stamp}`;
const publicSlug = `smoke-dupla-revisao-${stamp}`;
const secret = "DOUBLE-REVIEW-INTERNAL-SECRET";
let pautaId = null;
let dossierId = null;

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: pautaSlug,
    title: "Smoke dupla revisao",
    summary: "Pauta de teste para dupla revisao.",
    status: "drafting",
    visibility: "public",
    public_synthesis: "Sintese publica segura.",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `rascunho-${publicSlug}`,
    title: "Rascunho dupla revisao",
    status: "draft",
    review_status: "approved",
    public_slug: publicSlug,
    public_title: "Dossie dupla revisao smoke",
    public_summary: "Resumo publico de dupla revisao.",
    public_body: "Corpo publico revisado sem dados sensiveis.",
    public_version: `Rascunho interno ${secret}`,
    internal_notes: secret,
    approved_for_publication_at: new Date().toISOString(),
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;
  ok("dossie com versao publica preparado");

  const source = fs.readFileSync(path.join(rootDir, "app/actions.ts"), "utf8");
  if (!source.includes("pauta_dossier_publication_blocked_missing_reviews") || !source.includes("review_state.canPublish")) {
    throw new Error("action de publicacao nao contem bloqueio por dupla revisao");
  }
  ok("bloqueio de publicacao existe na action");

  let reviews = [];
  if (reviewState(reviews).canPublish) throw new Error("publicacao sem revisao nao foi bloqueada pela regra");
  ok("publicacao sem revisao bloqueada pela regra");

  const factual = await service.from("comun_pauta_dossier_reviews").insert({
    dossier_id: dossierId,
    review_stage: "factual_review",
    reviewer_name: "Pessoa Revisora",
    reviewer_role: "checagem factual",
    decision: "approved",
    checklist: {
      public_evidence_reviewed: true,
      no_personal_data: true,
      no_private_contact: true,
      no_full_response: true,
      no_unsupported_accusation: true,
      fact_report_demand_distinction: true,
      public_names_checked: true,
    },
    notes: secret,
  });
  if (factual.error) throw new Error(factual.error.message);
  reviews = (await service.from("comun_pauta_dossier_reviews").select("*").eq("dossier_id", dossierId)).data ?? [];
  if (reviewState(reviews).canPublish) throw new Error("publicacao com apenas revisao factual nao foi bloqueada");
  ok("publicacao com apenas revisao factual bloqueada");

  const sameReviewer = await service.from("comun_pauta_dossier_reviews").insert({
    dossier_id: dossierId,
    review_stage: "editorial_review",
    reviewer_name: "Pessoa Revisora",
    reviewer_role: "edicao",
    decision: "approved",
    checklist: { clear_text: true, objective_language: true },
    notes: secret,
  });
  if (sameReviewer.error) throw new Error(sameReviewer.error.message);
  reviews = (await service.from("comun_pauta_dossier_reviews").select("*").eq("dossier_id", dossierId)).data ?? [];
  if (reviewState(reviews).canPublish) throw new Error("publicacao com mesmo revisor nao foi bloqueada");
  ok("publicacao com mesmo revisor bloqueada");

  const distinctReviewer = await service.from("comun_pauta_dossier_reviews").insert({
    dossier_id: dossierId,
    review_stage: "editorial_review",
    reviewer_name: "Outra Pessoa Revisora",
    reviewer_role: "edicao",
    decision: "approved",
    checklist: {
      clear_text: true,
      objective_language: true,
      adequate_title: true,
      faithful_summary: true,
      clear_demands: true,
      clear_next_step: true,
      no_unnecessary_exposure: true,
    },
    notes: secret,
  });
  if (distinctReviewer.error) throw new Error(distinctReviewer.error.message);
  reviews = (await service.from("comun_pauta_dossier_reviews").select("*").eq("dossier_id", dossierId)).data ?? [];
  if (!reviewState(reviews).canPublish) throw new Error("dupla revisao distinta nao liberou publicacao");
  ok("dupla revisao distinta liberou publicacao");

  const publish = await service.from("comun_pauta_dossiers").update({
    review_status: "published",
    published_at: new Date().toISOString(),
    unpublished_at: null,
  }).eq("id", dossierId);
  if (publish.error) throw new Error(publish.error.message);
  const publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status !== 200 || !publicPage.text.includes("Dossie dupla revisao smoke")) throw new Error("dossie publicado nao apareceu publicamente");
  for (const forbidden of [secret, "review_stage", "reviewer_name", "checklist", "raw_text", "private_contact", "internal_notes", "response_text", "signed_url", "storage_path"]) {
    if (publicPage.text.includes(forbidden)) throw new Error(`dado interno vazou publicamente: ${forbidden}`);
  }
  ok("rota publica nao exibe notas/checklists internos");

  const unpublish = await service.from("comun_pauta_dossiers").update({ review_status: "unpublished", unpublished_at: new Date().toISOString() }).eq("id", dossierId);
  if (unpublish.error) throw new Error(unpublish.error.message);
  const afterUnpublish = await fetchText(`/comun/dossies/${publicSlug}`);
  if (afterUnpublish.status === 200 && afterUnpublish.text.includes("Dossie dupla revisao smoke")) throw new Error("despublicar nao removeu acesso publico");
  ok("despublicar continua funcionando");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
