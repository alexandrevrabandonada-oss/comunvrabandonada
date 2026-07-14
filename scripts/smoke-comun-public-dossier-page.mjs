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
const secret = `PUBLIC-DOSSIER-SECRET-${stamp}`;
const publicSlug = `smoke-public-dossier-page-${stamp}`;
let pautaId = null;
let dossierId = null;
let snapshotIds = [];

async function insertSnapshot({ title, body, status = "published", changeNote = "Publicacao inicial segura." }) {
  const inserted = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_title: title,
    public_summary: "Resumo publico seguro para compartilhamento.",
    public_body: body,
    public_slug: publicSlug,
    snapshot_status: status,
    public_change_note: changeNote,
    public_version_label: "Versao revisada",
    public_updated_at: new Date().toISOString(),
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  snapshotIds.push(inserted.data.id);
  return inserted.data;
}

try {
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-public-dossier-pauta-${stamp}`,
    title: "Pauta publica smoke",
    summary: "Resumo seguro da pauta.",
    community: "Centro",
    category: "Infraestrutura",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;

  const publicBody = [
    "## O que este dossie mostra",
    "Mostra problemas recorrentes de zeladoria com evidencias publicas revisadas.",
    "",
    "## Demandas",
    "1. Publicar cronograma de reparos.",
    "2. Informar responsavel institucional.",
    "",
    "## Proximos passos",
    "Acompanhar retorno publico e atualizar a sintese comunitaria.",
  ].join("\n");
  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `public-dossier-page-${stamp}`,
    title: "Dossie interno smoke publico",
    status: "draft",
    review_status: "published",
    public_slug: publicSlug,
    public_title: "Dossie publico forte",
    public_summary: "Resumo publico seguro para compartilhamento.",
    public_body: publicBody,
    published_at: new Date().toISOString(),
    internal_notes: secret,
    review_notes_internal: secret,
  }).select("id").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;
  ok("dossie e pauta teste criados");

  const first = await insertSnapshot({ title: "Dossie publico forte", body: publicBody });
  ok("snapshot publico criado");

  let publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status !== 200) throw new Error(`rota publica retornou ${publicPage.status}`);
  for (const expected of [
    "Dossie publico forte",
    "Resumo publico seguro para compartilhamento.",
    "O que este dossie mostra",
    "Demandas publicas",
    "Proximos passos",
    "Publicado em",
    "Ultima atualizacao publica",
    "Changelog publico",
    "Versao revisada",
    "Publicacao inicial segura.",
    "Pauta relacionada",
  ]) {
    if (!publicPage.text.includes(expected)) throw new Error(`pagina publica nao contem: ${expected}`);
  }
  ok("pagina publica contem leitura social e changelog limitado");

  for (const meta of ["og:title", "og:description", "twitter:card", "canonical"]) {
    if (!publicPage.text.includes(meta)) throw new Error(`metadata publico ausente: ${meta}`);
  }
  ok("metadados sociais publicos presentes");

  const editDraft = await service.from("comun_pauta_dossiers").update({
    public_title: "Titulo alterado apenas no draft",
    public_body: `Corpo alterado no draft com ${secret}`,
  }).eq("id", dossierId);
  if (editDraft.error) throw new Error(editDraft.error.message);
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.text.includes("Titulo alterado apenas no draft") || publicPage.text.includes(secret)) throw new Error("edicao do draft alterou pagina publica");
  ok("edicao do draft nao alterou snapshot publico");

  const supersede = await service.from("comun_pauta_dossier_publication_snapshots").update({ snapshot_status: "superseded" }).eq("id", first.id);
  if (supersede.error) throw new Error(supersede.error.message);
  const rollbackSnapshot = await insertSnapshot({
    title: "Dossie publico forte",
    body: publicBody,
    status: "rollback",
    changeNote: "Versao revisada publicada.",
  });
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (!publicPage.text.includes("Versao revisada publicada.")) throw new Error("nota publica de versao revisada nao apareceu");
  if (publicPage.text.toLowerCase().includes("rollback")) throw new Error("palavra rollback apareceu publicamente");
  ok("estado rollback aparece como versao revisada sem termo interno");

  const unpublish = await service.from("comun_pauta_dossier_publication_snapshots").update({
    snapshot_status: "unpublished",
    unpublished_at: new Date().toISOString(),
    unpublish_reason: `Motivo interno ${secret}`,
  }).eq("id", rollbackSnapshot.id);
  if (unpublish.error) throw new Error(unpublish.error.message);
  publicPage = await fetchText(`/comun/dossies/${publicSlug}`);
  if (publicPage.status === 200 && (publicPage.text.includes("Motivo interno") || publicPage.text.includes(secret) || publicPage.text.includes("Dossie publico forte"))) {
    throw new Error("estado despublicado revelou dados internos ou conteudo antigo");
  }
  ok("despublicado nao revela dados nem historico interno");

  for (const forbidden of [
    secret,
    "internal_notes",
    "review_notes_internal",
    "private_contact",
    "raw_text",
    "response_text",
    "storage_path",
    "signed_url",
    "checklist",
    "auditoria",
    "reviewer",
    "publisher",
    "@example.test",
  ]) {
    if (publicPage.text.includes(forbidden)) throw new Error(`campo interno vazou: ${forbidden}`);
  }
  ok("campos internos ausentes da pagina publica");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
