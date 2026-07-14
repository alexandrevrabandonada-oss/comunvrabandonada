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

async function fetchText(pathname) {
  const response = await fetch(new URL(pathname, process.env.NEXT_PUBLIC_SITE_URL));
  return { status: response.status, text: normalize(await response.text()) };
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
const secret = `SNAPSHOT-SECRET-${stamp}`;
const publicSlug = `smoke-dossier-snapshot-${stamp}`;
let pautaId = null;
let dossierId = null;
let profileIds = [];
let snapshotIds = [];

async function createProfile(role, label) {
  const inserted = await service.from("comun_admin_profiles").insert({
    auth_user_id: crypto.randomUUID(),
    display_name: `${label} ${stamp}`,
    email: `${label.toLowerCase()}-${stamp}@example.test`,
    role,
    active: true,
  }).select("id, display_name, email, role").single();
  if (inserted.error) throw new Error(inserted.error.message);
  profileIds.push(inserted.data.id);
  return inserted.data;
}

async function insertSnapshot({ title, body, status = "published", publisher }) {
  const inserted = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_title: title,
    public_summary: `Resumo seguro ${title}.`,
    public_body: body,
    public_slug: publicSlug,
    published_by_user_id: publisher.id,
    published_by_name_snapshot: publisher.display_name,
    snapshot_status: status,
  }).select("id, public_title, public_body").single();
  if (inserted.error) throw new Error(inserted.error.message);
  snapshotIds.push(inserted.data.id);
  return inserted.data;
}

try {
  const factual = await createProfile("factual_reviewer", "Factual");
  const editorial = await createProfile("editorial_reviewer", "Editorial");
  const publisher = await createProfile("publisher", "Publisher");
  ok("perfis reais de revisao/publicacao criados");

  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-publication-snapshot-pauta-${stamp}`,
    title: "Smoke snapshots de publicacao",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;

  const finalChecklist = {
    title_reviewed: true,
    summary_reviewed: true,
    body_reviewed: true,
    slug_reviewed: true,
    no_raw_text: true,
    no_private_contact: true,
    no_full_response_text: true,
    no_internal_notes: true,
    no_signed_url: true,
    no_storage_path: true,
    evidence_public_safe: true,
    distinct_real_reviewers: true,
    publisher_confirmed: true,
  };
  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `publication-snapshot-${stamp}`,
    title: "Smoke publication snapshot interno",
    status: "draft",
    review_status: "approved",
    public_slug: publicSlug,
    public_title: "Dossie snapshot v1",
    public_summary: "Resumo publico seguro v1.",
    public_body: "Corpo publico v1 seguro.",
    internal_notes: secret,
    review_notes_internal: secret,
    final_publication_checklist: finalChecklist,
    final_publication_notes: "Checklist final preenchido para smoke.",
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;

  for (const [stage, profile] of [["factual_review", factual], ["editorial_review", editorial]]) {
    const review = await service.from("comun_pauta_dossier_reviews").insert({
      dossier_id: dossierId,
      review_stage: stage,
      reviewer_name: profile.display_name,
      reviewer_role: profile.role,
      reviewer_user_id: profile.id,
      decision: "approved",
      checklist: { smoke: true },
      notes: secret,
    });
    if (review.error) throw new Error(review.error.message);
  }
  ok("dossie aprovado com revisores reais distintos e checklist final");

  const firstSnapshot = await insertSnapshot({ title: "Dossie snapshot v1", body: "Corpo publico v1 seguro.", publisher });
  const publishDossier = await service.from("comun_pauta_dossiers").update({
    review_status: "published",
    published_at: new Date().toISOString(),
    unpublished_at: null,
  }).eq("id", dossierId);
  if (publishDossier.error) throw new Error(publishDossier.error.message);
  ok("snapshot inicial criado");

  let publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status !== 200 || !publicPage.text.includes("Dossie snapshot v1") || !publicPage.text.includes("Corpo publico v1 seguro.")) {
    throw new Error("rota publica nao usou snapshot inicial");
  }

  const editDraft = await service.from("comun_pauta_dossiers").update({
    public_title: "Dossie snapshot v1 editado no draft",
    public_body: `Corpo draft alterado com ${secret}`,
  }).eq("id", dossierId);
  if (editDraft.error) throw new Error(editDraft.error.message);
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.text.includes(secret) || publicPage.text.includes("editado no draft")) throw new Error("edicao do draft alterou pagina publica sem novo snapshot");
  ok("snapshot permaneceu imutavel apos edicao do draft");

  const supersede = await service.from("comun_pauta_dossier_publication_snapshots").update({ snapshot_status: "superseded" }).eq("id", firstSnapshot.id);
  if (supersede.error) throw new Error(supersede.error.message);
  const secondSnapshot = await insertSnapshot({ title: "Dossie snapshot v2", body: "Corpo publico v2 seguro.", publisher });
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (!publicPage.text.includes("Dossie snapshot v2") || publicPage.text.includes("Corpo publico v1 seguro.")) throw new Error("nova publicacao nao substituiu snapshot ativo");
  ok("nova publicacao supersedeu a anterior");

  const unpublish = await service.from("comun_pauta_dossier_publication_snapshots").update({
    snapshot_status: "unpublished",
    unpublished_at: new Date().toISOString(),
    unpublished_by_user_id: publisher.id,
    unpublish_reason: "Smoke despublicacao segura.",
  }).eq("id", secondSnapshot.id);
  if (unpublish.error) throw new Error(unpublish.error.message);
  const unpublishDossier = await service.from("comun_pauta_dossiers").update({ review_status: "unpublished", unpublished_at: new Date().toISOString() }).eq("id", dossierId);
  if (unpublishDossier.error) throw new Error(unpublishDossier.error.message);
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status === 200 && publicPage.text.includes("Dossie snapshot v2")) throw new Error("despublicacao manteve snapshot ativo publico");
  ok("despublicacao removeu acesso publico");

  await insertSnapshot({ title: firstSnapshot.public_title, body: firstSnapshot.public_body, status: "rollback", publisher });
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status !== 200 || !publicPage.text.includes("Dossie snapshot v1") || publicPage.text.includes(secret)) throw new Error("rollback nao restaurou snapshot seguro anterior");
  ok("rollback restaurou snapshot anterior");

  const actionSource = [
    fs.readFileSync(path.join(rootDir, "app/actions.ts"), "utf8"),
    fs.readFileSync(path.join(rootDir, "app/comun/admin/dossies/[id]/page.tsx"), "utf8"),
  ].join("\n");
  for (const expected of [
    "dossier_publication_snapshot_created",
    "dossier_publication_snapshot_superseded",
    "dossier_unpublished_with_reason",
    "dossier_publication_rollback_created",
    "dossier_publication_final_checklist_saved",
    "dossier_publication_blocked_final_checklist",
    "dossier_publication_diff_viewed",
  ]) {
    if (!actionSource.includes(expected)) throw new Error(`auditoria ausente no codigo: ${expected}`);
  }
  ok("auditorias de publicacao assistida presentes");

  for (const forbidden of [secret, factual.email, editorial.email, publisher.email, "internal_notes", "review_notes_internal", "signed_url", "storage_path"]) {
    if (publicPage.text.includes(forbidden)) throw new Error(`conteudo sensivel vazou publicamente: ${forbidden}`);
  }
  ok("rota publica nao vazou campos sensiveis");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  if (profileIds.length) await service.from("comun_admin_profiles").delete().in("id", profileIds);
  ok("dados de smoke removidos");
}
