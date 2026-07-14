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

const stamp = Date.now();
const pautaSlug = `smoke-pauta-publicacao-dossie-${stamp}`;
const publicSlug = `smoke-dossie-publicado-${stamp}`;
const publicTitle = "Dossie publico smoke revisado";
const publicSummary = "Resumo publico revisado para smoke.";
const publicBody = "Corpo publico revisado com evidencia segura e sem dados privados.";
const internalSecret = "DOSSIER-PUBLICATION-INTERNAL-SECRET";
let pautaId = null;
let dossierId = null;
let snapshotId = null;

async function fetchText(pathname) {
  const response = await fetch(new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  return { status: response.status, text: normalize(await response.text()) };
}

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: pautaSlug,
    title: "Smoke publicacao de dossie",
    summary: "Pauta de smoke para publicacao de dossie.",
    status: "drafting",
    visibility: "public",
    public_synthesis: "Sintese publica segura.",
    next_step: "Publicar dossie revisado.",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const evidence = await service.from("comun_pauta_evidence_items").insert({
    pauta_id: pautaId,
    source_type: "manual",
    title: "Evidencia publica aprovada para publicacao",
    summary: "Resumo publico da evidencia.",
    evidence_type: "documento",
    sensitivity: "public_safe",
    status: "approved",
    public_note: "Nota publica.",
    internal_note: internalSecret,
  }).select("id").single();
  if (evidence.error) throw new Error(evidence.error.message);
  ok("evidencia approved public_safe criada");

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `rascunho-${publicSlug}`,
    title: "Rascunho interno smoke",
    status: "draft",
    review_status: "draft",
    executive_summary: "Sintese interna.",
    problem_statement: "Problema interno.",
    evidence_summary: "Evidencia publica aprovada para publicacao",
    official_protocols_summary: "Sem response_text completo.",
    demands: "Demandas em revisao.",
    next_steps: "Proximos passos internos.",
    public_version: `Rascunho operacional ${internalSecret}`,
    internal_notes: internalSecret,
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;

  const linkEvidence = await service.from("comun_pauta_dossier_evidence").insert({
    dossier_id: dossierId,
    evidence_id: evidence.data.id,
    position: 0,
  });
  if (linkEvidence.error) throw new Error(linkEvidence.error.message);
  ok("dossie rascunho criado");

  const preparePublic = await service.from("comun_pauta_dossiers").update({
    public_slug: publicSlug,
    public_title: publicTitle,
    public_summary: publicSummary,
    public_body: publicBody,
    publication_notes: "Revisao humana simulada por smoke.",
  }).eq("id", dossierId);
  if (preparePublic.error) throw new Error(preparePublic.error.message);
  ok("versao publica preparada");

  const beforePublish = await fetchText(`/comun/dossies/${publicSlug}`);
  if (beforePublish.status !== 404 && beforePublish.text.includes(publicTitle)) throw new Error("dossie apareceu antes da publicacao");
  ok("rota publica nao aparece antes de publicar");

  const sendReview = await service.from("comun_pauta_dossiers").update({ review_status: "editorial_review", reviewed_by_editor_at: new Date().toISOString() }).eq("id", dossierId);
  if (sendReview.error) throw new Error(sendReview.error.message);
  const approve = await service.from("comun_pauta_dossiers").update({ review_status: "approved", approved_for_publication_at: new Date().toISOString() }).eq("id", dossierId);
  if (approve.error) throw new Error(approve.error.message);
  ok("dossie enviado para revisao e aprovado");

  const reviews = await service.from("comun_pauta_dossier_reviews").insert([
    {
      dossier_id: dossierId,
      review_stage: "factual_review",
      reviewer_name: "Revisor Factual Smoke",
      decision: "approved",
      checklist: { public_evidence_reviewed: true, no_personal_data: true },
      notes: "Nota factual interna que nao deve aparecer.",
    },
    {
      dossier_id: dossierId,
      review_stage: "editorial_review",
      reviewer_name: "Revisor Editorial Smoke",
      decision: "approved",
      checklist: { clear_text: true, objective_language: true },
      notes: "Nota editorial interna que nao deve aparecer.",
    },
  ]);
  if (reviews.error) throw new Error(reviews.error.message);
  ok("dupla revisao registrada");

  const publish = await service.from("comun_pauta_dossiers").update({ review_status: "published", published_at: new Date().toISOString(), unpublished_at: null }).eq("id", dossierId);
  if (publish.error) throw new Error(publish.error.message);
  const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_slug: publicSlug,
    public_title: publicTitle,
    public_summary: publicSummary,
    public_body: publicBody,
    snapshot_status: "published",
    public_version_label: "Versao revisada",
    public_change_note: "Publicacao segura validada por smoke.",
    public_updated_at: new Date().toISOString(),
  }).select("id").single();
  if (snapshot.error || !snapshot.data) throw new Error(`falha ao criar snapshot publico: ${snapshot.error?.message ?? "sem retorno"}`);
  snapshotId = snapshot.data.id;
  ok("dossie publicado");

  const publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status !== 200) throw new Error(`rota publica retornou ${publicPage.status}`);
  if (!publicPage.text.includes(publicTitle) || !publicPage.text.includes(publicSummary) || !publicPage.text.includes(publicBody)) throw new Error("conteudo publico revisado nao apareceu");
  for (const forbidden of [internalSecret, "raw_text", "private_contact", "response_text", "signed_url", "storage_path", "internal_notes"]) {
    if (publicPage.text.includes(forbidden)) throw new Error(`campo sensivel vazou no dossie publico: ${forbidden}`);
  }
  ok("rota publica mostra apenas versao revisada");

  const listPage = await fetchText("/comun/dossies");
  if (listPage.status !== 200 || !listPage.text.includes(publicTitle) || !listPage.text.includes("Ler dossie")) throw new Error("listagem publica nao mostra o dossie publicado");
  ok("listagem publica mostra dossie publicado");

  const unpublish = await service.from("comun_pauta_dossiers").update({ review_status: "unpublished", unpublished_at: new Date().toISOString() }).eq("id", dossierId);
  if (unpublish.error) throw new Error(unpublish.error.message);
  const unpublishSnapshot = await service.from("comun_pauta_dossier_publication_snapshots").update({
    snapshot_status: "unpublished",
    unpublished_at: new Date().toISOString(),
    unpublish_reason: "Smoke despublicou a versao publica.",
  }).eq("id", snapshotId);
  if (unpublishSnapshot.error) throw new Error(unpublishSnapshot.error.message);
  const afterUnpublish = await fetchText(`/comun/dossies/${publicSlug}`);
  if (afterUnpublish.status === 200 && afterUnpublish.text.includes(publicTitle)) throw new Error("dossie continuou publico apos despublicar");
  ok("despublicar remove acesso publico");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
