import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();

const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; npx supabase status -o env"], { encoding: "utf8" });
const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1).replace(/^\"|\"$/g, "")];
}));

assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):/);
const base = process.env.COMUN_BASE_URL || "http://localhost:3000";
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);

process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
process.env.MEDIA_STORAGE_PROVIDER = "supabase-local";

const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const tag = `smoke-sidewalk-${crypto.randomUUID().slice(0, 8)}`;
const secret = `PRIVATE-${crypto.randomUUID()}`;

let pautaId = null;
let reportId = null;
let memberId = null;
let circleId = null;
let contributionId = null;
let taskId = null;
let actionId = null;
let protocolId = null;
let resultId = null;

const one = async (query) => {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
};

try {
  const pauta = await one(db.from("comun_pauta_spaces").insert({
    slug: `${tag}-pauta`,
    title: `Mapa Popular das Calçadas — ${tag}`,
    summary: "Piloto local de acessibilidade urbana com mapa, observatório e circulação comunitária.",
    status: "organizing",
    visibility: "public",
    public_synthesis: "Diagnóstico comunitário em construção.",
    next_step: "Revisar contribuições e publicar síntese.",
  }).select("id, slug").single());
  pautaId = pauta.id;

  memberId = crypto.randomUUID();
  await one(db.from("comun_member_profiles").insert({
    user_id: memberId,
    display_name: "Membro piloto de calçadas",
    status: "active",
    profile_visibility: "private",
    participation_visibility: "private",
  }));

  const rows = [
    { pauta_id: pautaId, module_type: "overview", title_override: "Visão geral", public_description: "Objetivo do piloto e etapa atual.", position: 0, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "reports", title_override: "Relatos", public_description: "Contribuições recebidas e pendentes.", position: 1, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "map", title_override: "Mapa", public_description: "Localização aproximada dos problemas.", position: 2, status: "active", visibility: "public", config: { contributionEnabled: true, defaultView: "map", layerIds: [], territoryIds: [] } },
    { pauta_id: pautaId, module_type: "observatory", title_override: "Observatório", public_description: "Indicadores iniciais do piloto.", position: 3, status: "active", visibility: "public", config: { showMetrics: true, showMethodology: true, showCampaigns: false } },
    { pauta_id: pautaId, module_type: "evidence", title_override: "Evidências", public_description: "Fotos e registros revisados.", position: 4, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "construction_circle", title_override: "Roda", public_description: "Construção coletiva das prioridades.", position: 5, status: "active", visibility: "public", config: { showPreviousRounds: true, showSynthesis: true, allowPublicContribution: true } },
    { pauta_id: pautaId, module_type: "proposals", title_override: "Propostas", public_description: "Propostas e prioridades da pauta.", position: 6, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "actions", title_override: "Ações", public_description: "Encaminhamentos e ações abertas.", position: 7, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "tasks", title_override: "Tarefas", public_description: "Tarefas para revisão e organização.", position: 8, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "results", title_override: "Resultados", public_description: "Resultados registrados e acompanhados.", position: 9, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "art_gallery", title_override: "Arte dos territórios", public_description: "Obras relacionando o tema.", position: 10, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "community_radio", title_override: "Rádio comunitária", public_description: "Boletins e histórias do território.", position: 11, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "archive", title_override: "Memória", public_description: "Protocolos, relatórios e memória do ciclo.", position: 12, status: "active", visibility: "public", config: {} },
    { pauta_id: pautaId, module_type: "participation", title_override: "Minha participação", public_description: "Próximas ações para quem participa.", position: 13, status: "active", visibility: "public", config: {} },
  ];
  await one(db.from("comun_pauta_modules").insert(rows));

  const pageUrl = `${base}/comun/pautas/${pauta.slug}`;
  const pageRes = await fetch(pageUrl);
  assert.equal(pageRes.status, 200, `Página da pauta retornou ${pageRes.status}`);
  const html = await pageRes.text();
  assert.match(html, /Mapa Popular das Calçadas/i);
  assert.ok(html.includes('href="#map"'));
  assert.ok(html.includes('href="#construction_circle"'));
  assert.ok(html.includes('href="#community_radio"'));

  const circle = await one(db.from("comun_construction_circles").insert({
    pauta_id: pautaId,
    title: `Roda piloto ${tag}`,
    public_question: "Quais caminhos de circulação precisam ser priorizados?",
    public_context: "Contexto público de teste para a pauta de calçadas.",
    status: "open",
    participation_mode: "moderated_public",
  }).select("id").single());
  circleId = circle.id;

  const round = await one(db.from("comun_construction_circle_rounds").insert({
    circle_id: circleId,
    round_type: "listening",
    title: "Escuta inicial",
    public_prompt: "Compartilhe um relato da circulação local.",
    position: 0,
    status: "open",
  }).select("id").single());
  await one(db.from("comun_construction_circles").update({ current_round_id: round.id }).eq("id", circleId));

  const contribution = await one(db.from("comun_circle_contributions").insert({
    circle_id: circleId,
    round_id: round.id,
    contribution_type: "testimony",
    public_body: "Contribuição de teste para o piloto de calçadas com conteúdo suficiente para revisão.",
    author_member_id: memberId,
    status: "pending",
    public_protocol: `PROTO-${tag}`,
  }).select("id").single());
  contributionId = contribution.id;

  const pendingCheck = await one(db.from("comun_circle_contributions").select("status").eq("id", contributionId).single());
  assert.equal(pendingCheck.status, "pending", "Contribuição deve nascer pending");

  await one(db.from("comun_circle_contributions").update({ status: "visible" }).eq("id", contributionId));

  await one(db.from("comun_circle_syntheses").insert({
    circle_id: circleId,
    round_id: round.id,
    public_summary: `Síntese piloto ${tag}`,
    agreements: ["Priorizar calçadas com barreiras de acesso"],
    disagreements: [],
    open_questions: ["Qual trecho revisar primeiro?"],
    proposed_next_steps: ["Organizar vistoria comunitária"],
    status: "published",
    published_at: new Date().toISOString(),
  }));

  const task = await one(db.from("comun_pauta_tasks").insert({
    pauta_id: pautaId,
    title: `Tarefa piloto ${tag}`,
    description: "Revisar o relato e preparar a próxima roda.",
    status: "open",
    visibility: "public",
  }).select("id").single());
  taskId = task.id;

  const action = await one(db.from("comun_mobilization_actions").insert({
    pauta_id: pautaId,
    slug: `${tag}-acao`,
    title: `Ação piloto ${tag}`,
    action_type: "meeting",
    objective_public: "Organizar a proposta pública do piloto.",
    objective_internal: secret,
    status: "confirmed",
    visibility: "public",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
  }).select("id").single());
  actionId = action.id;

  const reportProtocol = `CAL-${tag.toUpperCase()}`;
  const report = await one(db.from("comun_reports").insert({
    protocol: reportProtocol,
    community_slug: "cidade",
    issue_slug: "buracos-calcadas-abandono-bairros",
    title: `[Piloto calçadas] Relato ${tag}`,
    raw_text: secret,
    public_text: "Relato público sanitizado do piloto local de calçadas.",
    period_text: "Fixture de teste",
    approximate_location: "local aproximado sintético",
    neighborhood: "Centro fixture",
    is_anonymous: true,
    can_publish_sanitized: true,
    accepts_contact: false,
    internal_notes: secret,
    status: "published",
    risk_level: "unknown",
    quick_report: true,
    public_location_level: "approximate",
    source_channel: "pauta_pilot",
    has_attachments: false,
    photo_count: 0,
    published_at: new Date().toISOString(),
  }).select("id").single());
  reportId = report.id;

  const protocol = await one(db.from("comun_official_protocols").insert({
    report_id: reportId,
    comun_protocol: reportProtocol,
    channel: "ouvidoria",
    status: "draft",
    public_summary: "Resumo público do protocolo do piloto local.",
    internal_notes: secret,
  }).select("id").single());
  protocolId = protocol.id;

  const result = await one(db.from("comun_hub_results").insert({
    pauta_id: pautaId,
    slug: `${tag}-resultado`,
    title: `Resultado piloto ${tag}`,
    result_type: "achievement",
    public_summary: "Resultado de teste do piloto local.",
    verification_status: "verified",
    visibility: "public",
    occurred_at: new Date().toISOString(),
  }).select("id").single());
  resultId = result.id;

  const memberships = await one(db.from("comun_pauta_memberships").insert({
    pauta_id: pautaId,
    member_user_id: memberId,
    role: "participant",
    status: "active",
  }).select("id"));
  assert.ok(memberships?.length || memberships?.id, "Membership do piloto não criada.");

  const finalRes = await fetch(pageUrl);
  const finalHtml = await finalRes.text();
  assert.ok(!finalHtml.includes(secret), "Vazamento de dado privado detectado");

  console.log("smoke:sidewalk-pilot local ok");
} finally {
  if (memberId) {
    await db.from("comun_pauta_memberships").delete().eq("member_user_id", memberId);
    await db.from("comun_member_profiles").delete().eq("user_id", memberId);
  }
  if (reportId) {
    await db.from("comun_official_protocols").delete().eq("report_id", reportId);
    await db.from("comun_reports").delete().eq("id", reportId);
  }
  if (pautaId) {
    await db.from("comun_hub_results").delete().eq("pauta_id", pautaId);
    await db.from("comun_pauta_tasks").delete().eq("pauta_id", pautaId);
    await db.from("comun_mobilization_actions").delete().eq("pauta_id", pautaId);
    await db.from("comun_circle_syntheses").delete().eq("circle_id", circleId);
    await db.from("comun_circle_contributions").delete().eq("circle_id", circleId);
    await db.from("comun_construction_circle_rounds").delete().eq("circle_id", circleId);
    await db.from("comun_construction_circles").delete().eq("id", circleId);
    await db.from("comun_pauta_modules").delete().eq("pauta_id", pautaId);
    await db.from("comun_pauta_spaces").delete().eq("id", pautaId);
    const { count } = await db.from("comun_pauta_spaces").select("id", { count: "exact", head: true }).eq("slug", `${tag}-pauta`);
    assert.equal(count, 0, "Pauta fixture residual detectada após cleanup");
  }
  console.log("COMUN_TEST_FIXTURES_CLEAN");
}
