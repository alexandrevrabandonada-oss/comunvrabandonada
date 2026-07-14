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
const secret = `PUBLIC-DOSSIER-NAV-SECRET-${stamp}`;
const publicCommunitySlug = "cidade";
let pautaId = null;
let otherPautaId = null;
const dossierIds = [];
const snapshotIds = [];

async function createPauta(slugSuffix, title, community, category) {
  const inserted = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-nav-${slugSuffix}-${stamp}`,
    title: `${title} ${stamp}`,
    summary: "Resumo publico seguro.",
    public_synthesis: "Sintese publica segura.",
    next_step: "Acompanhar proximos passos publicos.",
    community,
    category,
    status: "drafting",
    visibility: "public",
  }).select("id, slug, title, community, category").single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}

async function createDossier(pauta, label, status = "published", snapshotStatus = "published") {
  const dossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pauta.id,
    slug: `smoke-nav-dossier-${label}-${stamp}`,
    title: `Interno nav ${label} ${secret}`,
    status: "draft",
    review_status: status,
    public_slug: `smoke-nav-${label}-${stamp}`,
    public_title: `Dossie navegacao ${label}`,
    public_summary: `Resumo navegacao ${label} seguro.`,
    public_body: "## O que este dossie mostra\nNavegacao publica segura.\n\n## Demandas\nDemandas publicas.\n\n## Proximos passos\nVoltar para a pauta publica.",
    internal_notes: secret,
    review_notes_internal: secret,
    published_at: status === "published" ? new Date().toISOString() : null,
  }).select("id, public_slug").single();
  if (dossier.error) throw new Error(dossier.error.message);
  dossierIds.push(dossier.data.id);
  if (snapshotStatus) {
    const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
      dossier_id: dossier.data.id,
      public_title: `Dossie navegacao ${label}`,
      public_summary: `Resumo navegacao ${label} seguro.`,
      public_body: "## O que este dossie mostra\nNavegacao publica segura.\n\n## Demandas\nDemandas publicas.\n\n## Proximos passos\nVoltar para a pauta publica.",
      public_slug: dossier.data.public_slug,
      snapshot_status: snapshotStatus,
      unpublished_at: snapshotStatus === "unpublished" ? new Date().toISOString() : null,
      unpublish_reason: snapshotStatus === "unpublished" ? `Motivo interno ${secret}` : null,
      public_version_label: snapshotStatus === "rollback" ? "Versao revisada" : "Versao publicada",
      public_change_note: `Nota publica ${label}.`,
      public_updated_at: new Date().toISOString(),
    }).select("id").single();
    if (snapshot.error) throw new Error(snapshot.error.message);
    snapshotIds.push(snapshot.data.id);
  }
  return dossier.data;
}

try {
  const pauta = await createPauta("principal", "Pauta navegacao", publicCommunitySlug, "infraestrutura");
  const otherPauta = await createPauta("categoria", "Pauta mesma categoria", "norte", "infraestrutura");
  pautaId = pauta.id;
  otherPautaId = otherPauta.id;
  const main = await createDossier(pauta, "principal", "published", "published");
  await createDossier(pauta, "relacionado", "published", "rollback");
  await createDossier(otherPauta, "leia-tambem", "published", "published");
  const noSnapshot = await createDossier(pauta, "sem-snapshot", "approved", null);
  await createDossier(pauta, "superseded", "published", "superseded");
  await createDossier(pauta, "unpublished", "published", "unpublished");
  ok("dados de navegacao criados");

  const dossierPage = await fetchText(`/comun/dossies/${main.public_slug}`);
  if (dossierPage.status !== 200) throw new Error(`dossie retornou ${dossierPage.status}`);
  for (const expected of [
    "COMUN",
    "Dossies",
    pauta.title,
    "Dossie navegacao principal",
    "Pauta relacionada",
    "Comunidade relacionada",
    "Dossies relacionados",
    "Dossie navegacao relacionado",
    "Dossie navegacao leia-tambem",
    `/comun/dossies?comunidade=${publicCommunitySlug}`,
  ]) {
    if (!dossierPage.text.includes(expected)) throw new Error(`pagina de dossie nao contem navegacao esperada: ${expected}`);
  }
  ok("breadcrumb e blocos relacionados confirmados");

  const pautaPage = await fetchText(`/comun/pautas/${pauta.slug}`);
  if (pautaPage.status !== 200) throw new Error(`pauta retornou ${pautaPage.status}`);
  if (!pautaPage.text.includes("Dossies publicados desta pauta") || !pautaPage.text.includes("Dossie navegacao principal") || !pautaPage.text.includes("Dossie navegacao relacionado")) {
    throw new Error("pauta nao listou dossies publicados ativos");
  }
  for (const forbidden of ["Dossie navegacao sem-snapshot", "Dossie navegacao superseded", "Dossie navegacao unpublished"]) {
    if (pautaPage.text.includes(forbidden)) throw new Error(`pauta listou item proibido: ${forbidden}`);
  }
  ok("pauta publica lista apenas snapshots ativos");

  const communityPage = await fetchText(`/comun/c/${publicCommunitySlug}`);
  if (communityPage.status !== 200) throw new Error(`comunidade retornou ${communityPage.status}`);
  if (!communityPage.text.includes("Dossies desta comunidade") || !communityPage.text.includes("Dossie navegacao principal")) throw new Error("comunidade nao listou dossies ativos");
  ok("comunidade publica lista dossies ativos");

  const index = await fetchText("/comun/dossies");
  for (const expected of [
    `pauta=${encodeURIComponent(pauta.title).replace(/%20/g, "+")}`,
    `comunidade=${publicCommunitySlug}`,
    "categoria=infraestrutura",
  ]) {
    if (!index.text.includes(expected)) throw new Error(`indice nao contem link de filtro: ${expected}`);
  }
  ok("links de filtro no indice confirmados");

  for (const html of [dossierPage.text, pautaPage.text, communityPage.text, index.text]) {
    for (const forbidden of [
      secret,
      noSnapshot.public_slug,
      "internal_notes",
      "review_notes_internal",
      "unpublish_reason",
      "Motivo interno",
      "storage_path",
      "signed_url",
      "private_contact",
      "raw_text",
      "response_text",
      "checklist",
      "auditoria",
      "@example.test",
    ]) {
      if (html.includes(forbidden)) throw new Error(`navegacao publica vazou dado interno: ${forbidden}`);
    }
  }
  ok("ausencia de campos internos confirmada");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId || otherPautaId) await service.from("comun_pauta_spaces").delete().in("id", [pautaId, otherPautaId].filter(Boolean));
  ok("dados de smoke removidos");
}
