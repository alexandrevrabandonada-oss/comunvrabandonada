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
const secret = `PUBLIC-DOSSIER-INDEX-SECRET-${stamp}`;
const ids = { pauta: [], dossier: [], snapshot: [] };

async function createPauta(label, community, category) {
  const inserted = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-index-pauta-${label}-${stamp}`,
    title: `Pauta ${label} ${stamp}`,
    summary: "Resumo publico seguro.",
    community,
    category,
    status: "drafting",
    visibility: "public",
  }).select("id, title, community, category").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.pauta.push(inserted.data.id);
  return inserted.data;
}

async function createDossier(pauta, label, reviewStatus = "published") {
  const inserted = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pauta.id,
    slug: `smoke-index-dossier-${label}-${stamp}`,
    title: `Interno ${label} ${secret}`,
    status: "draft",
    review_status: reviewStatus,
    public_slug: `smoke-index-${label}-${stamp}`,
    public_title: `Dossie indice ${label}`,
    public_summary: `Resumo indice ${label} seguro.`,
    public_body: `Corpo publico indice ${label} com termo-busca-${label}.`,
    internal_notes: secret,
    review_notes_internal: secret,
    published_at: reviewStatus === "published" ? new Date().toISOString() : null,
  }).select("id, public_slug").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.dossier.push(inserted.data.id);
  return inserted.data;
}

async function createSnapshot(dossier, label, status = "published") {
  const inserted = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossier.id,
    public_title: `Dossie indice ${label}`,
    public_summary: `Resumo indice ${label} seguro.`,
    public_body: `Corpo publico indice ${label} com termo-busca-${label}.`,
    public_slug: dossier.public_slug,
    snapshot_status: status,
    unpublished_at: status === "unpublished" ? new Date().toISOString() : null,
    unpublish_reason: status === "unpublished" ? `Motivo interno ${secret}` : null,
    public_change_note: `Nota publica ${label}.`,
    public_version_label: status === "rollback" ? "Versao revisada" : "Versao publicada",
    public_updated_at: new Date().toISOString(),
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  ids.snapshot.push(inserted.data.id);
  return inserted.data;
}

try {
  const pautaA = await createPauta("zeladoria", "Centro", "Infraestrutura");
  const pautaB = await createPauta("saude", "Norte", "Saude");
  const activeA = await createDossier(pautaA, "zeladoria");
  const activeB = await createDossier(pautaB, "saude");
  const noSnapshot = await createDossier(pautaA, "sem-snapshot", "approved");
  const superseded = await createDossier(pautaA, "superseded");
  const unpublished = await createDossier(pautaB, "unpublished");
  await createSnapshot(activeA, "zeladoria", "published");
  await createSnapshot(activeB, "saude", "rollback");
  await createSnapshot(superseded, "superseded", "superseded");
  await createSnapshot(unpublished, "unpublished", "unpublished");
  ok("dados de indice criados");

  let index = await fetchText("/comun/dossies");
  if (index.status !== 200) throw new Error(`indice retornou ${index.status}`);
  for (const expected of [
    "Dossies publicados",
    "Dossie indice zeladoria",
    "Dossie indice saude",
    "Resumo indice zeladoria seguro.",
    "Pauta",
    "Comunidade",
    "Centro",
    "Categoria",
    "Infraestrutura",
    "Publicado:",
    "Atualizado:",
    "Versao revisada",
    "og:title",
    "twitter:card",
  ]) {
    if (!index.text.includes(expected)) throw new Error(`indice nao contem campo publico esperado: ${expected}`);
  }
  ok("cards publicos e metadata do indice confirmados");

  for (const forbidden of [
    noSnapshot.public_slug,
    "Dossie indice sem-snapshot",
    "Dossie indice superseded",
    "Dossie indice unpublished",
    secret,
    "internal_notes",
    "review_notes_internal",
    "unpublish_reason",
    "Motivo interno",
    "comun_admin_profiles",
    "@example.test",
    "storage_path",
    "signed_url",
    "checklist",
    "auditoria",
  ]) {
    if (index.text.includes(forbidden)) throw new Error(`indice vazou item/campo proibido: ${forbidden}`);
  }
  ok("indice nao lista dossies sem snapshot, superseded ou unpublished");

  const byCommunity = await fetchText(`/comun/dossies?comunidade=${encodeURIComponent("Centro")}`);
  if (!byCommunity.text.includes("Dossie indice zeladoria") || byCommunity.text.includes("Dossie indice saude")) throw new Error("filtro de comunidade falhou");
  const byCategory = await fetchText(`/comun/dossies?categoria=${encodeURIComponent("Saude")}`);
  if (!byCategory.text.includes("Dossie indice saude") || byCategory.text.includes("Dossie indice zeladoria")) throw new Error("filtro de categoria falhou");
  const byPauta = await fetchText(`/comun/dossies?pauta=${encodeURIComponent(pautaA.title)}`);
  if (!byPauta.text.includes("Dossie indice zeladoria") || byPauta.text.includes("Dossie indice saude")) throw new Error("filtro de pauta falhou");
  ok("filtros publicos confirmados");

  const search = await fetchText("/comun/dossies?busca=termo-busca-saude");
  if (!search.text.includes("Dossie indice saude") || search.text.includes("Dossie indice zeladoria")) throw new Error("busca publica falhou");
  ok("busca publica confirmada");

  const individual = await fetchText(`/comun/dossies/${activeA.public_slug}`);
  if (individual.status !== 200 || !individual.text.includes("Dossie indice zeladoria")) throw new Error("rota individual publicada falhou");
  ok("rota individual continua funcionando");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (ids.snapshot.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", ids.snapshot);
  if (ids.pauta.length) await service.from("comun_pauta_spaces").delete().in("id", ids.pauta);
  ok("dados de smoke removidos");
}
