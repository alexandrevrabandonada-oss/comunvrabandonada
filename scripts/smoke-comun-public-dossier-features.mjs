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
const secret = `PUBLIC-DOSSIER-FEATURE-SECRET-${stamp}`;
const ids = { pauta: [], dossier: [], snapshot: [], feature: [] };

async function createPauta(label, community, category) {
  const inserted = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-feature-pauta-${label}-${stamp}`,
    title: `Pauta destaque ${label} ${stamp}`,
    summary: "Resumo publico seguro.",
    public_synthesis: "Sintese publica segura.",
    next_step: "Acompanhar encaminhamentos publicos.",
    community,
    category,
    status: "drafting",
    visibility: "public",
  }).select("id, slug, title, community, category").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.pauta.push(inserted.data.id);
  return inserted.data;
}

async function createDossier(pauta, label) {
  const inserted = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pauta.id,
    slug: `smoke-feature-dossier-${label}-${stamp}`,
    title: `Interno feature ${label} ${secret}`,
    status: "draft",
    review_status: "published",
    public_slug: `smoke-feature-${label}-${stamp}`,
    public_title: `Dossie destaque ${label}`,
    public_summary: `Resumo destaque ${label} seguro.`,
    public_body: `Corpo publico destaque ${label} com recomendacao por pauta comunidade categoria.`,
    internal_notes: secret,
    review_notes_internal: secret,
    published_at: new Date().toISOString(),
  }).select("id, public_slug").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.dossier.push(inserted.data.id);
  return inserted.data;
}

async function createSnapshot(dossier, label, status = "published") {
  const inserted = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossier.id,
    public_title: `Dossie destaque ${label}`,
    public_summary: `Resumo destaque ${label} seguro.`,
    public_body: `Corpo publico destaque ${label} com recomendacao por pauta comunidade categoria.`,
    public_slug: dossier.public_slug,
    snapshot_status: status,
    unpublished_at: status === "unpublished" ? new Date().toISOString() : null,
    unpublish_reason: status === "unpublished" ? `Motivo interno ${secret}` : null,
    public_change_note: `Nota publica ${label}.`,
    public_version_label: status === "rollback" ? "Versao revisada" : "Versao publicada",
    public_updated_at: new Date(Date.now() + (label.length * 1000)).toISOString(),
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.snapshot.push(inserted.data.id);
  return inserted.data;
}

async function createFeature(snapshot, label, active = true) {
  const inserted = await service.from("comun_public_dossier_features").insert({
    snapshot_id: snapshot.id,
    slot: "featured",
    public_label: `Destaque ${label}`,
    public_note: `Nota publica de destaque ${label}.`,
    priority: 10,
    active,
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.feature.push(inserted.data.id);
  return inserted.data;
}

try {
  const tableCheck = await service.from("comun_public_dossier_features").select("id", { count: "exact", head: true });
  if (tableCheck.error) throw new Error(`tabela comun_public_dossier_features indisponivel: ${tableCheck.error.message}`);

  const pautaA = await createPauta("principal", "cidade", "infraestrutura");
  const pautaB = await createPauta("relacionada", "cidade", "infraestrutura");
  const main = await createDossier(pautaA, "principal");
  const samePauta = await createDossier(pautaA, "mesma-pauta");
  const sameCategory = await createDossier(pautaB, "mesma-categoria");
  const superseded = await createDossier(pautaA, "superseded");
  const unpublished = await createDossier(pautaA, "unpublished");
  const activeSnapshot = await createSnapshot(main, "principal", "published");
  await createSnapshot(samePauta, "mesma-pauta", "rollback");
  await createSnapshot(sameCategory, "mesma-categoria", "published");
  const supersededSnapshot = await createSnapshot(superseded, "superseded", "superseded");
  const unpublishedSnapshot = await createSnapshot(unpublished, "unpublished", "unpublished");
  await createFeature(activeSnapshot, "principal", true);
  await createFeature(supersededSnapshot, "superseded", true);
  await createFeature(unpublishedSnapshot, "unpublished", true);
  ok("dados de destaque criados");

  let index = await fetchText("/comun/dossies");
  if (index.status !== 200) throw new Error(`indice retornou ${index.status}`);
  for (const expected of [
    "Dossies em destaque",
    "Destaque principal",
    "Nota publica de destaque principal.",
    "Mais recentes",
    "Atualizados recentemente",
    "Por pauta",
    "Por comunidade",
    "Por categoria",
    "Dossie destaque mesma-pauta",
    "Dossie destaque mesma-categoria",
  ]) {
    if (!index.text.includes(expected)) throw new Error(`indice nao contem destaque/recomendacao esperada: ${expected}`);
  }
  for (const forbidden of ["Destaque superseded", "Destaque unpublished", "Dossie destaque superseded", "Dossie destaque unpublished"]) {
    if (index.text.includes(forbidden)) throw new Error(`indice exibiu destaque proibido: ${forbidden}`);
  }
  ok("destaques e recomendacoes publicas confirmados");

  await service.from("comun_public_dossier_features").update({ active: false, updated_at: new Date().toISOString() }).eq("snapshot_id", activeSnapshot.id);
  index = await fetchText("/comun/dossies");
  if (index.text.includes("Destaque principal") || index.text.includes("Nota publica de destaque principal.")) throw new Error("destaque desativado continuou visivel");
  ok("destaque desativado deixou de aparecer");

  const home = await fetchText("/comun");
  if (home.status !== 200) throw new Error(`home retornou ${home.status}`);
  if (!home.text.includes("Dossies em destaque")) throw new Error("home nao exibiu bloco de destaques");

  const pautaPage = await fetchText(`/comun/pautas/${pautaA.slug}`);
  if (pautaPage.status !== 200) throw new Error(`pauta retornou ${pautaPage.status}`);
  if (!pautaPage.text.includes("Dossies publicados desta pauta") || !pautaPage.text.includes("Dossie destaque mesma-pauta")) throw new Error("pauta nao exibiu dossies ativos da pauta");
  ok("home e pauta confirmadas");

  for (const html of [index.text, home.text, pautaPage.text]) {
    for (const forbidden of [
      secret,
      "internal_notes",
      "review_notes_internal",
      "unpublish_reason",
      "Motivo interno",
      "responsavel",
      "revisor",
      "comun_admin_profiles",
      "@example.test",
      "storage_path",
      "signed_url",
      "private_contact",
      "raw_text",
      "response_text",
      "checklist",
      "auditoria",
    ]) {
      if (html.includes(forbidden)) throw new Error(`destaques publicos vazaram campo interno: ${forbidden}`);
    }
  }
  ok("ausencia de campos internos confirmada");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (ids.feature.length) await service.from("comun_public_dossier_features").delete().in("id", ids.feature);
  if (ids.snapshot.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", ids.snapshot);
  if (ids.pauta.length) await service.from("comun_pauta_spaces").delete().in("id", ids.pauta);
  ok("dados de smoke removidos");
}
