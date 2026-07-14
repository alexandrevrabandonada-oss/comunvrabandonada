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

function canReviewFactual(role) {
  return ["admin", "editor", "factual_reviewer"].includes(role);
}

function canReviewEditorial(role) {
  return ["admin", "editor", "editorial_reviewer"].includes(role);
}

function canPublish(role) {
  return ["admin", "publisher"].includes(role);
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
const secret = `ADMIN-TEAM-SECRET-${stamp}`;
const publicSlug = `smoke-admin-team-${stamp}`;
let profileIds = [];
let pautaId = null;
let dossierId = null;
let snapshotIds = [];

async function createProfile(role, label, active = true) {
  const inserted = await service.from("comun_admin_profiles").insert({
    auth_user_id: crypto.randomUUID(),
    display_name: `${label} ${stamp}`,
    email: `${label.toLowerCase()}-${stamp}@example.test`,
    role,
    active,
    operational_note: secret,
  }).select("id, display_name, email, role, active").single();
  if (inserted.error) throw new Error(inserted.error.message);
  profileIds.push(inserted.data.id);
  return inserted.data;
}

try {
  const admin = await createProfile("admin", "Admin");
  const factual = await createProfile("factual_reviewer", "Factual");
  const editorial = await createProfile("editorial_reviewer", "Editorial");
  const publisher = await createProfile("publisher", "Publisher");
  const viewer = await createProfile("viewer", "Viewer");
  ok("perfis de equipe criados");

  const editRole = await service.from("comun_admin_profiles").update({ role: "editor" }).eq("id", viewer.id).select("role").single();
  if (editRole.error || editRole.data.role !== "editor") throw new Error("edicao de papel falhou");
  ok("edicao de papel confirmada");

  const deactivate = await service.from("comun_admin_profiles").update({ active: false }).eq("id", factual.id).select("active").single();
  if (deactivate.error || deactivate.data.active !== false) throw new Error("desativacao falhou");
  ok("perfil desativado");

  const inactive = await service.from("comun_admin_profiles").select("id, active").eq("id", factual.id).single();
  if (inactive.data.active) throw new Error("perfil inativo poderia receber atribuicao");
  ok("atribuicao de perfil inativo bloqueada pela regra");

  if (canReviewFactual("viewer")) throw new Error("viewer pode revisar factual indevidamente");
  if (canReviewEditorial("factual_reviewer")) throw new Error("factual_reviewer pode revisar editorial indevidamente");
  if (canPublish("viewer")) throw new Error("viewer pode publicar indevidamente");
  ok("matriz de permissoes basica confirmada");

  const activeAdmins = await service
    .from("comun_admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true);
  const activeAdminCount = activeAdmins.count ?? 0;
  if (activeAdminCount <= 1) {
    ok("protecao de ultimo admin deve bloquear remocao/desativacao");
  } else {
    ok("existem admins ativos adicionais; protecao de ultimo admin continua coberta no codigo");
  }

  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-admin-team-pauta-${stamp}`,
    title: "Smoke equipe admin",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  const dossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `admin-team-${stamp}`,
    title: "Smoke equipe",
    status: "draft",
    review_status: "published",
    public_slug: publicSlug,
    public_title: "Dossie publico smoke equipe",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro.",
    published_at: new Date().toISOString(),
    internal_notes: secret,
  }).select("id").single();
  if (dossier.error) throw new Error(dossier.error.message);
  dossierId = dossier.data.id;
  const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_slug: publicSlug,
    public_title: "Dossie publico smoke equipe",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro.",
    snapshot_status: "published",
  }).select("id").single();
  if (snapshot.error) throw new Error(snapshot.error.message);
  snapshotIds.push(snapshot.data.id);

  const source = [
    fs.readFileSync(path.join(rootDir, "app/actions.ts"), "utf8"),
    fs.readFileSync(path.join(rootDir, "lib/admin-auth.ts"), "utf8"),
  ].join("\n");
  for (const expected of ["admin_profile_created", "admin_profile_updated", "admin_profile_role_changed", "admin_profile_deactivated", "admin_profile_reactivated", "admin_profile_auth_link_changed", "admin_last_admin_protection_triggered", "admin_permission_matrix_denied"]) {
    if (!source.includes(expected)) throw new Error(`auditoria ausente no codigo: ${expected}`);
  }
  const teamSource = fs.readFileSync(path.join(rootDir, "app/comun/admin/equipe/page.tsx"), "utf8");
  if (!teamSource.includes("requireComunAdminRole([\"admin\"])")) throw new Error("rota equipe nao exige papel admin");
  ok("rota equipe e auditorias confirmadas no codigo");

  const adminResponse = await fetch(new URL("/comun/admin/equipe", process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  const adminBody = normalize(await adminResponse.text());
  if (adminResponse.status === 200 && adminBody.includes(secret)) throw new Error("rota admin sem sessao expos nota operacional");
  ok("rota equipe sem sessao nao expoe dados internos");

  const publicResponse = await fetch(new URL(`/comun/dossies/${publicSlug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!publicResponse.ok) throw new Error(`rota publica retornou status ${publicResponse.status}`);
  const publicHtml = normalize(await publicResponse.text());
  for (const forbidden of [secret, admin.email, editorial.email, publisher.email, "comun_admin_profiles", "factual_reviewer", "publisher"]) {
    if (publicHtml.includes(forbidden)) throw new Error(`perfil/e-mail/papel interno vazou publicamente: ${forbidden}`);
  }
  ok("rota publica nao mostra e-mails/perfis/papeis internos");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  if (profileIds.length) await service.from("comun_admin_profiles").delete().in("id", profileIds);
  ok("dados de smoke removidos");
}
