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
const secret = `REVIEW-OPS-INTERNAL-${stamp}`;
const factualReviewer = `Factual Ops ${stamp}`;
const editorialReviewer = `Editorial Ops ${stamp}`;
const publicSlug = `smoke-review-ops-${stamp}`;
let pautaId = null;
let dossierId = null;
let snapshotIds = [];

try {
  const dueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const createPauta = await service.from("comun_pauta_spaces").insert({
    slug: `smoke-review-ops-pauta-${stamp}`,
    title: "Smoke operacao revisoes",
    status: "drafting",
    visibility: "public",
  }).select("id").single();
  if (createPauta.error) throw new Error(createPauta.error.message);
  pautaId = createPauta.data.id;
  ok("pauta teste criada");

  const createDossier = await service.from("comun_pauta_dossiers").insert({
    pauta_id: pautaId,
    slug: `review-ops-${stamp}`,
    title: "Smoke fila operacional",
    status: "draft",
    review_status: "published",
    public_slug: publicSlug,
    public_title: "Dossie publico smoke ops",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem campos operacionais.",
    published_at: new Date().toISOString(),
    factual_reviewer_assigned: factualReviewer,
    editorial_reviewer_assigned: editorialReviewer,
    review_priority: "high",
    review_due_at: dueAt,
    review_notes_internal: secret,
    internal_notes: secret,
  }).select("id, factual_reviewer_assigned, editorial_reviewer_assigned, review_priority, review_due_at, review_notes_internal").single();
  if (createDossier.error) throw new Error(createDossier.error.message);
  dossierId = createDossier.data.id;
  const snapshot = await service.from("comun_pauta_dossier_publication_snapshots").insert({
    dossier_id: dossierId,
    public_slug: publicSlug,
    public_title: "Dossie publico smoke ops",
    public_summary: "Resumo publico seguro.",
    public_body: "Corpo publico seguro sem campos operacionais.",
    snapshot_status: "published",
  }).select("id").single();
  if (snapshot.error) throw new Error(snapshot.error.message);
  snapshotIds.push(snapshot.data.id);
  ok("dossie teste criado com responsaveis, prioridade alta e prazo vencido");

  if (createDossier.data.factual_reviewer_assigned !== factualReviewer) throw new Error("responsavel factual nao foi persistido");
  if (createDossier.data.editorial_reviewer_assigned !== editorialReviewer) throw new Error("responsavel editorial nao foi persistido");
  if (createDossier.data.review_priority !== "high") throw new Error("prioridade alta nao foi persistida");
  if (!createDossier.data.review_due_at) throw new Error("prazo nao foi persistido");
  ok("campos operacionais persistidos");

  const source = fs.readFileSync(path.join(rootDir, "app/comun/admin/dossies/revisoes/page.tsx"), "utf8");
  for (const expected of ["responsavel", "prioridade", "vencidos", "Vence hoje", "Vencidos"]) {
    if (!source.includes(expected)) throw new Error(`fila admin nao contem filtro/indicador esperado: ${expected}`);
  }
  ok("UI da fila contem filtros e indicadores operacionais");

  const rows = await service
    .from("comun_pauta_dossiers")
    .select("id, title, factual_reviewer_assigned, editorial_reviewer_assigned, review_priority, review_due_at")
    .eq("id", dossierId)
    .eq("review_priority", "high")
    .lt("review_due_at", new Date().toISOString());
  if (rows.error) throw new Error(rows.error.message);
  const filteredRow = rows.data?.find((row) => row.factual_reviewer_assigned === factualReviewer || row.editorial_reviewer_assigned === factualReviewer);
  if (!filteredRow) throw new Error("dossie nao apareceu nos filtros de responsavel/prioridade/vencido");
  ok("filtros de responsavel, prioridade e vencido confirmados no dado");

  const adminResponse = await fetch(new URL(`/comun/admin/dossies/revisoes?responsavel=${encodeURIComponent(factualReviewer)}&prioridade=high&vencidos=1`, process.env.NEXT_PUBLIC_SITE_URL), { redirect: "manual" });
  const adminBody = normalize(await adminResponse.text());
  if (adminResponse.status === 200 && adminBody.includes(secret)) throw new Error("rota admin sem sessao expos nota operacional interna");
  ok("rota admin sem sessao nao expoe nota operacional");

  const publicResponse = await fetch(new URL(`/comun/dossies/${publicSlug}`, process.env.NEXT_PUBLIC_SITE_URL));
  if (!publicResponse.ok) throw new Error(`rota publica retornou status ${publicResponse.status}`);
  const publicHtml = normalize(await publicResponse.text());
  for (const forbidden of [secret, factualReviewer, editorialReviewer, "review_priority", "review_due_at", "review_notes_internal", "factual_reviewer_assigned", "editorial_reviewer_assigned"]) {
    if (publicHtml.includes(forbidden)) throw new Error(`campo operacional vazou publicamente: ${forbidden}`);
  }
  ok("campos operacionais nao aparecem na rota publica");
} catch (error) {
  fail(error instanceof Error ? error.message : "erro desconhecido");
} finally {
  if (snapshotIds.length) await service.from("comun_pauta_dossier_publication_snapshots").delete().in("id", snapshotIds);
  if (pautaId) await service.from("comun_pauta_spaces").delete().eq("id", pautaId);
  ok("dados de smoke removidos");
}
