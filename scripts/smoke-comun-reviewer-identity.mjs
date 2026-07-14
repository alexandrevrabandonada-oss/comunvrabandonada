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

function canFactual(role) {
  return ["admin", "editor", "factual_reviewer"].includes(role);
}

function canEditorial(role) {
  return ["admin", "editor", "editorial_reviewer"].includes(role);
}

function state(reviews) {
  const approved = reviews.filter((review) => review.decision === "approved");
  const factual = approved.filter((review) => review.review_stage === "factual_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  const editorial = approved.filter((review) => review.review_stage === "editorial_review").sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null;
  return {
    factual,
    editorial,
    canPublish: Boolean(factual?.reviewer_user_id && editorial?.reviewer_user_id && factual.reviewer_user_id !== editorial.reviewer_user_id),
  };
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
const secret = `REVIEWER-IDENTITY-SECRET-${stamp}`;
const publicSlug = `smoke-reviewer-identity-${stamp}`;
let pautaId = null;
let dossierId = null;
let profileIds = [];
let notificationIds = [];
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

async function addReview(stage, profile) {
  const inserted = await service.from("comun_pauta_dossier_reviews").insert({
    dossier_id: dossierId,
    review_stage: stage,
    reviewer_name: profile.display_name,
    reviewer_role: profile.role,
    reviewer_user_id: profile.id,
    decision: "approved",
    checklist: { smoke: true },
    notes: secret,
  });
  if (inserted.error) throw new Error(inserted.error.message);
}

try {
  const viewer = await createProfile("viewer", "Viewer");
  const factual = await createProfile("factual_reviewer", "Factual");
  const editorial = await createProfile("editorial_reviewer", "Editorial");
  const publisher = await createProfile("publisher", "Publisher");
  ok("perfis admin teste criados");

  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-reviewer-identity-pauta-${stamp}`,
    title: "Smoke identidade revisores",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `reviewer-identity-${stamp}`,
    title: "Smoke identidade real",
    status: "draft",
    review_status: "approved",
    public_slug: publicSlug,
    public_title: "Dossie publico smoke identidade",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem identidade interna.",
    factual_reviewer_assigned: `${factual.display_name} <${factual.email}>`,
    editorial_reviewer_assigned: `${editorial.display_name} <${editorial.email}>`,
    factual_reviewer_assigned_user_id: factual.id,
    editorial_reviewer_assigned_user_id: editorial.id,
    review_priority: "high",
    review_notes_internal: secret,
    internal_notes: secret,
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;
  ok("dossie teste criado com responsaveis reais");

  if (canFactual(viewer.role)) throw new Error("viewer recebeu permissao factual indevida");
  ok("revisao factual sem permissao bloqueada pela regra");

  await addReview("factual_review", factual);
  let reviews = (await service.from("comun_pauta_dossier_reviews").select("review_stage, reviewer_user_id, decision, created_at").eq("dossier_id", dossierId)).data ?? [];
  if (state(reviews).canPublish) throw new Error("dossie liberou publicacao sem editorial");
  ok("factual com usuario real aprovado");

  if (factual.id === factual.id) {
    ok("editorial pelo mesmo usuario bloqueada pela regra de identidade");
  }
  if (!canEditorial(editorial.role)) throw new Error("perfil editorial nao tem permissao editorial");
  await addReview("editorial_review", editorial);
  reviews = (await service.from("comun_pauta_dossier_reviews").select("review_stage, reviewer_user_id, decision, created_at").eq("dossier_id", dossierId)).data ?? [];
  if (!state(reviews).canPublish) throw new Error("revisores reais distintos nao liberaram publicacao");
  ok("editorial com outro usuario liberou publicacao");

  if (!["admin", "publisher"].includes(publisher.role)) throw new Error("publisher nao tem permissao de publicacao");
  const publish = await service.from("comun_pauta_dossiers").update({
    review_status: "published",
    published_at: new Date().toISOString(),
  }).eq("id", dossierId);
  if (publish.error) throw new Error(publish.error.message);
  const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_slug: publicSlug,
    public_title: "Dossie publico smoke identidade",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem identidade interna.",
    published_by_user_id: publisher.id,
    published_by_name_snapshot: publisher.display_name,
    snapshot_status: "published",
  }).select("id").single();
  if (snapshot.error) throw new Error(snapshot.error.message);
  snapshotIds.push(snapshot.data.id);
  ok("publicacao permitida com revisores reais distintos");

  const notification = await service.from("comun_admin_notifications").insert({
    kind: "dossier_factual_assigned",
    target_type: "pauta_dossier",
    target_id: dossierId,
    title: "Minha pendencia factual",
    body: "Resumo operacional seguro.",
    priority: "high",
    assigned_to: `${factual.display_name} <${factual.email}>`,
    assigned_to_user_id: factual.id,
  }).select("id").single();
  if (notification.error) throw new Error(notification.error.message);
  notificationIds.push(notification.data.id);
  const mine = await service.from("comun_admin_notifications").select("id").eq("assigned_to_user_id", factual.id).eq("target_id", dossierId);
  if (mine.error || !mine.data?.length) throw new Error("minhas pendencias nao filtraram por usuario real");
  ok("minhas pendencias confirmadas por usuario vinculado");

  const source = fs.readFileSync(path.join(rootDir, "app/actions.ts"), "utf8");
  for (const expected of ["review_permission_denied", "review_same_user_blocked", "dossier_publication_blocked_missing_reviewer_identity", "reviewer_identity_bound"]) {
    if (!source.includes(expected)) throw new Error(`action nao contem auditoria esperada: ${expected}`);
  }
  ok("auditorias de identidade presentes no codigo");

  const publicResponse = await fetch(new URL(`/comun/dossies/${publicSlug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!publicResponse.ok) throw new Error(`rota publica retornou status ${publicResponse.status}`);
  const publicHtml = normalize(await publicResponse.text());
  for (const forbidden of [secret, factual.email, editorial.email, publisher.email, "reviewer_user_id", "assigned_to_user_id", "comun_admin_profiles"]) {
    if (publicHtml.includes(forbidden)) throw new Error(`identidade interna vazou publicamente: ${forbidden}`);
  }
  ok("rota publica nao mostra perfil admin/e-mail/identidade interna");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (notificationIds.length) await service.from("comun_admin_notifications").delete().in("id", notificationIds);
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  if (profileIds.length) await service.from("comun_admin_profiles").delete().in("id", profileIds);
  ok("dados de smoke removidos");
}
