import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();

const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; npx supabase status -o env"], { encoding: "utf8" });
const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map(x => {
  const i = x.indexOf("=");
  return [x.slice(0, i), x.slice(i + 1).replace(/^\"|\"$/g, "")];
}));

assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):/);
const base = process.env.COMUN_BASE_URL || "http://localhost:3000";
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);

process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
process.env.MEDIA_STORAGE_PROVIDER = "supabase-local";

const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const tag = `smoke-miniapp-${crypto.randomUUID().slice(0, 8)}`;
const secret = `PRIVATE-${crypto.randomUUID()}`;

let pautaId = null;
let memberId = null;
let circleId = null;

try {
  // 1. criar pauta fixture
  const { data: pauta, error: pautaErr } = await db.from("comun_pauta_spaces").insert({
    slug: `${tag}-pauta`,
    title: `Pauta Fixture Miniapp ${tag}`,
    summary: "Pauta para validar o catálogo de miniaplicativos",
    status: "organizing",
    visibility: "public"
  }).select("id").single();
  if (pautaErr) throw pautaErr;
  pautaId = pauta.id;

  // Insert a member profile
  memberId = crypto.randomUUID();
  const { error: profileErr } = await db.from("comun_member_profiles").insert({
    user_id: memberId,
    display_name: "Membro Fixture Miniapp",
    status: "active",
    profile_visibility: "private",
    participation_visibility: "private"
  });
  if (profileErr) throw profileErr;

  // 2. aplicar template
  const templateModules = ["overview", "archive", "timeline", "construction_circle", "results"];
  const rows = templateModules.map((moduleType, position) => ({
    pauta_id: pautaId,
    module_type: moduleType,
    position: position,
    status: "draft",
    visibility: "private",
    config: {},
    created_by: memberId,
  }));
  const { error: templateErr } = await db.from("comun_pauta_modules").insert(rows);
  if (templateErr) throw templateErr;

  // 3. confirmar módulos persistidos
  const { data: modules, error: modErr } = await db.from("comun_pauta_modules").select("module_type").eq("pauta_id", pautaId);
  if (modErr) throw modErr;
  assert.ok(modules.length > 0);

  // 4. confirmar art_gallery (ativar/upsert real)
  const { error: artErr } = await db.from("comun_pauta_modules").upsert({
    pauta_id: pautaId,
    module_type: "art_gallery",
    title_override: "Arte dos territórios",
    public_description: "Obras públicas relacionadas.",
    position: 10,
    status: "active",
    visibility: "public",
    config: {},
    created_by: memberId,
    updated_at: new Date().toISOString()
  }, { onConflict: "pauta_id,module_type" });
  if (artErr) throw artErr;

  const { data: artMod, error: artModErr } = await db.from("comun_pauta_modules").select("id").eq("pauta_id", pautaId).eq("module_type", "art_gallery").single();
  if (artModErr) throw artModErr;
  assert.ok(artMod);

  // 5. confirmar community_radio (ativar/upsert real)
  const { error: radioErr } = await db.from("comun_pauta_modules").upsert({
    pauta_id: pautaId,
    module_type: "community_radio",
    title_override: "Rádio comunitária",
    public_description: "Programas e episódios publicados ligados à pauta.",
    position: 11,
    status: "active",
    visibility: "public",
    config: {},
    created_by: memberId,
    updated_at: new Date().toISOString()
  }, { onConflict: "pauta_id,module_type" });
  if (radioErr) throw radioErr;

  const { data: radioMod, error: radioModErr } = await db.from("comun_pauta_modules").select("id").eq("pauta_id", pautaId).eq("module_type", "community_radio").single();
  if (radioModErr) throw radioModErr;
  assert.ok(radioMod);

  // Activate timeline and archive modules since they were applied in draft/private by template
  await db.from("comun_pauta_modules").update({ status: "active", visibility: "public" }).eq("pauta_id", pautaId);

  // 6. abrir página pública
  const pageUrl = `${base}/comun/pautas/${tag}-pauta`;
  const res = await fetch(pageUrl);
  assert.equal(res.status, 200, `Página de pauta retornou status ${res.status}`);
  const html = await res.text();
  assert.match(html, new RegExp(`Pauta Fixture Miniapp ${tag}`), "HTML não contém título da pauta");

  // 7. navegar entre módulos (verificar âncoras/IDs dos novos módulos)
  assert.ok(html.includes('href="#art_gallery"'), "Âncora da Galeria de Arte ausente");
  assert.ok(html.includes('href="#community_radio"'), "Âncora da Rádio Comunitária ausente");
  assert.ok(html.includes('id="art_gallery"'), "Seção scroll-mt da Galeria de Arte ausente");
  assert.ok(html.includes('id="community_radio"'), "Seção scroll-mt da Rádio Comunitária ausente");

  // 8. criar roda
  const { data: circle, error: circleErr } = await db.from("comun_construction_circles").insert({
    pauta_id: pautaId,
    title: `Roda Fixture Miniapp ${tag}`,
    public_question: "Pergunta de teste para miniapp?",
    public_context: "Contexto público de teste",
    status: "open",
    participation_mode: "moderated_public"
  }).select("id").single();
  if (circleErr) throw circleErr;
  circleId = circle.id;

  // 9. criar rodada
  const { data: round, error: roundErr } = await db.from("comun_construction_circle_rounds").insert({
    circle_id: circleId,
    round_type: "listening",
    title: "Escuta inicial",
    public_prompt: "Contribua para a rodada",
    position: 0,
    status: "open"
  }).select("id").single();
  if (roundErr) throw roundErr;
  const roundId = round.id;

  // Associar rodada atual à roda
  await db.from("comun_construction_circles").update({ current_round_id: roundId }).eq("id", circleId);

  // 10. enviar contribuição
  const { data: contrib, error: contribErr } = await db.from("comun_circle_contributions").insert({
    circle_id: circleId,
    round_id: roundId,
    contribution_type: "proposal",
    public_body: "Esta é uma contribuição de teste estruturada com tamanho suficiente.",
    author_member_id: memberId,
    status: "pending",
    public_protocol: `PROTO-${tag}`
  }).select("id").single();
  if (contribErr) throw contribErr;
  const contribId = contrib.id;

  // 11. confirmar pending
  const { data: checkPending, error: checkPendingErr } = await db.from("comun_circle_contributions").select("status").eq("id", contribId).single();
  if (checkPendingErr) throw checkPendingErr;
  assert.equal(checkPending.status, "pending");

  // 12. moderar (status de pending para visible)
  const { error: updateErr } = await db.from("comun_circle_contributions").update({ status: "visible" }).eq("id", contribId);
  if (updateErr) throw updateErr;

  // 13. criar síntese
  const { error: synthesisErr } = await db.from("comun_circle_syntheses").insert({
    circle_id: circleId,
    round_id: roundId,
    public_summary: `Síntese Fixture ${tag}`,
    agreements: ["Melhorar"],
    disagreements: [],
    open_questions: [],
    proposed_next_steps: [],
    status: "published",
    published_at: new Date().toISOString()
  });
  if (synthesisErr) throw synthesisErr;

  // 14. gerar tarefa
  const { data: taskObj, error: taskErr } = await db.from("comun_pauta_tasks").insert({
    pauta_id: pautaId,
    title: `Tarefa Fixture ${tag}`,
    description: "Tarefa para validar Minha Participação",
    status: "open",
    visibility: "public"
  }).select("id").single();
  if (taskErr) throw taskErr;

  // 15. gerar ação (com informação privada a ser testada na etapa 17)
  const { data: actionObj, error: actionErr } = await db.from("comun_mobilization_actions").insert({
    pauta_id: pautaId,
    slug: `acao-${tag}`,
    title: `Ação Fixture ${tag}`,
    action_type: "meeting",
    objective_public: "Objetivo público da ação",
    objective_internal: secret, // segredo para auditar vazamento
    status: "confirmed",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    visibility: "public"
  }).select("id").single();
  if (actionErr) throw actionErr;

  // Add membership for the member on this pauta so they show up in listMyParticipation
  await db.from("comun_pauta_memberships").insert({
    pauta_id: pautaId,
    member_user_id: memberId,
    role: "participant",
    status: "active"
  });

  // 16. validar Minha Participação
  const [membershipsRes, contributionsRes] = await Promise.all([
    db.from("comun_pauta_memberships").select("id, role, status, joined_at, pauta:comun_pauta_spaces(title, slug)").eq("member_user_id", memberId),
    db.from("comun_circle_contributions").select("id, contribution_type, status, public_protocol, created_at, circle:comun_construction_circles(title)").eq("author_member_id", memberId)
  ]);
  if (membershipsRes.error) throw membershipsRes.error;
  if (contributionsRes.error) throw contributionsRes.error;

  assert.ok(membershipsRes.data.length > 0, "Deveria ter pelo menos uma associação");
  assert.ok(contributionsRes.data.length > 0, "Deveria ter pelo menos uma contribuição");
  const associatedPauta = membershipsRes.data.find(m => m.pauta?.slug === `${tag}-pauta`);
  assert.ok(associatedPauta, "Pauta não encontrada em Minha Participação");

  // 17. confirmar ausência de dados privados
  const finalRes = await fetch(pageUrl);
  const finalHtml = await finalRes.text();
  assert.ok(!finalHtml.includes(secret), "Vazamento de dado privado (objective_internal) detectado!");

  console.log("smoke:pauta-miniapp local ok");
} finally {
  // 18. cleanup
  if (memberId) {
    await db.from("comun_pauta_memberships").delete().eq("member_user_id", memberId);
    await db.from("comun_member_profiles").delete().eq("user_id", memberId);
  }
  if (pautaId) {
    await db.from("comun_pauta_spaces").delete().eq("id", pautaId);
  }
  // 19. assert-clean
  if (pautaId) {
    const { count } = await db.from("comun_pauta_spaces").select("id", { count: "exact", head: true }).eq("slug", `${tag}-pauta`);
    assert.equal(count, 0, "Pauta fixture residual detectada após cleanup");
  }
}
