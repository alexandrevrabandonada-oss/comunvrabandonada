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
const secret = `ADMIN-NOTIFICATION-SECRET-${stamp}`;
const assignedTo = `Equipe Interna ${stamp}`;
const publicSlug = `smoke-admin-notifications-${stamp}`;
let pautaId = null;
let dossierId = null;
let notificationIds = [];
let snapshotIds = [];

async function createNotification(kind, title, priority = "normal") {
  const inserted = await service.from("comun_admin_notifications").insert({
    kind,
    target_type: "pauta_dossier",
    target_id: dossierId,
    title,
    body: "Resumo operacional seguro.",
    priority,
    assigned_to: assignedTo,
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  notificationIds.push(inserted.data.id);
  return inserted.data.id;
}

try {
  const dueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-admin-notifications-pauta-${stamp}`,
    title: "Smoke notificacoes admin",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `admin-notifications-${stamp}`,
    title: "Smoke notificacoes internas",
    status: "draft",
    review_status: "published",
    public_slug: publicSlug,
    public_title: "Dossie publico smoke notificacoes",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem notificacoes internas.",
    published_at: new Date().toISOString(),
    factual_reviewer_assigned: assignedTo,
    editorial_reviewer_assigned: assignedTo,
    review_priority: "urgent",
    review_due_at: dueAt,
    review_notes_internal: secret,
    internal_notes: secret,
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;
  const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_slug: publicSlug,
    public_title: "Dossie publico smoke notificacoes",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem notificacoes internas.",
    snapshot_status: "published",
  }).select("id").single();
  if (snapshot.error) throw new Error(snapshot.error.message);
  snapshotIds.push(snapshot.data.id);
  ok("dossie teste criado");

  const assigned = await createNotification("dossier_factual_assigned", "Dossie atribuido para revisao factual", "high");
  await createNotification("dossier_overdue", "Dossie vencido", "urgent");
  await createNotification("dossier_ready_to_publish", "Dossie pronto para publicacao", "high");
  ok("notificacoes internas criadas");

  const read = await service.from("comun_admin_notifications").update({ status: "read", read_at: new Date().toISOString() }).eq("id", assigned);
  if (read.error) throw new Error(read.error.message);
  ok("notificacao marcada como lida");

  const archiveTarget = await createNotification("dossier_changes_requested", "Ajustes solicitados", "normal");
  const archived = await service.from("comun_admin_notifications").update({ status: "archived" }).eq("id", archiveTarget);
  if (archived.error) throw new Error(archived.error.message);
  ok("notificacao arquivada");

  const adminSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/notificacoes/page.tsx"), "utf8");
  for (const expected of ["Notificacoes", "Nao lidas", "Vencidas", "Prontas para publicar", "Arquivadas", "Abrir dossie"]) {
    if (!adminSource.includes(expected)) throw new Error(`pagina admin nao contem texto esperado: ${expected}`);
  }
  ok("pagina admin de notificacoes contem estados esperados");

  const adminResponse = await fetch(new URL("/comun/admin/notificacoes", process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  const adminBody = normalize(await adminResponse.text());
  if (adminResponse.status === 200 && adminBody.includes(secret)) throw new Error("rota admin sem sessao expos segredo");
  ok("rota admin sem sessao nao expoe conteudo interno");

  const publicResponse = await fetch(new URL(`/comun/dossies/${publicSlug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!publicResponse.ok) throw new Error(`rota publica retornou status ${publicResponse.status}`);
  const publicHtml = normalize(await publicResponse.text());
  for (const forbidden of [secret, assignedTo, "comun_admin_notifications", "dossier_overdue", "Dossie vencido", "Dossie atribuido"]) {
    if (publicHtml.includes(forbidden)) throw new Error(`notificacao interna vazou publicamente: ${forbidden}`);
  }
  ok("notificacoes internas nao aparecem na rota publica");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (notificationIds.length) await service.from("comun_admin_notifications").delete().in("id", notificationIds);
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
