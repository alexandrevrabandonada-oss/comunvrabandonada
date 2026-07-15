import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "../../../scripts/local-environment.mjs";

export const localPersonaEmails = {
  admin: "admin-local@comun.test",
  facilitator: "facilitador-local@comun.test",
  participant: "participante-local@comun.test",
  unattached: "membro-sem-vinculo@comun.test",
  user: "usuario-comum-local@comun.test",
};
export const localFixturePassword = "comun-local-fixture-only";
const prefix = "fixture-s28-2-";

function localServiceConfig() {
  assertLocalEnvironment();
  const raw = process.platform === "win32"
    ? execFileSync("powershell", ["-NoProfile", "-Command", "npx supabase status -o env"], { encoding: "utf8", env: { ...process.env, SUPABASE_DISABLE_TELEMETRY: "1" } })
    : execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8", env: { ...process.env, SUPABASE_DISABLE_TELEMETRY: "1" } });
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")]; }));
  if (!env.SERVICE_ROLE_KEY || !env.API_URL?.match(/^https?:\/\/(localhost|127\.0\.0\.1)/)) throw new Error("Configuração local do Supabase ausente.");
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL || env.API_URL, serviceKey: env.SERVICE_ROLE_KEY };
}

export function localServiceClient() { const config = localServiceConfig(); return createClient(config.url, config.serviceKey, { auth: { persistSession: false } }); }

export async function createLocalAuthFixtures() {
  const db = localServiceClient(); const users = {};
  for (const [persona, email] of Object.entries(localPersonaEmails)) {
    const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = existing?.users.find((user) => user.email === email);
    if (found) await db.auth.admin.deleteUser(found.id);
    const { data, error } = await db.auth.admin.createUser({ email, password: localFixturePassword, email_confirm: true, user_metadata: { fixture: "s28-2", persona } });
    if (error || !data.user) throw new Error(`auth fixture ${persona}: ${error?.message ?? "sem usuário"}`);
    users[persona] = data.user.id;
  }
  const adminId = users.admin;
  await db.from("comun_admin_users").upsert({ user_id: adminId, email: localPersonaEmails.admin, role: "admin", is_active: true }, { onConflict: "email" });
  await db.from("comun_admin_profiles").upsert({ auth_user_id: adminId, email: localPersonaEmails.admin, display_name: "Admin local", role: "admin", active: true }, { onConflict: "email" });
  return users;
}

export async function createLocalPautaMiniappFixture() {
  const db = localServiceClient(); const tag = `${prefix}${randomUUID().slice(0, 8)}`;
  const { data: pauta, error } = await db.from("comun_pauta_spaces").insert({ slug: tag, title: "Pauta pública de fixture", summary: "Resumo estável para smoke local.", visibility: "public", public_synthesis: "Síntese estável da fixture.", next_step: "Próxima ação de teste." }).select("id,slug").single();
  if (error || !pauta) throw new Error(error?.message ?? "Pauta fixture não criada.");
  await db.from("comun_pauta_modules").insert([{ pauta_id: pauta.id, module_type: "overview", title_override: "Visão geral de teste", status: "active", visibility: "public", position: 0, config: {} }, { pauta_id: pauta.id, module_type: "construction_circle", title_override: "Roda pública de teste", status: "active", visibility: "public", position: 1, config: {} }]);
  const { data: circle, error: circleError } = await db.from("comun_construction_circles").insert({ pauta_id: pauta.id, title: "Roda de escuta fixture", public_question: "O que deve acontecer agora?", status: "open" }).select("id").single();
  if (circleError || !circle) throw new Error(circleError?.message ?? "Roda fixture não criada.");
  const { data: round, error: roundError } = await db.from("comun_construction_circle_rounds").insert({ circle_id: circle.id, round_type: "listening", title: "Escuta aberta", public_prompt: "Compartilhe uma contribuição segura.", position: 0, status: "open" }).select("id").single();
  if (roundError || !round) throw new Error(roundError?.message ?? "Rodada fixture não criada.");
  await db.from("comun_construction_circles").update({ current_round_id: round.id }).eq("id", circle.id);
  await db.from("comun_circle_contributions").insert({ circle_id: circle.id, round_id: round.id, contribution_type: "testimony", public_body: "Contribuição pública e moderada da fixture.", status: "visible", public_protocol: `RODA-${tag}` });
  await db.from("comun_circle_syntheses").insert({ circle_id: circle.id, round_id: round.id, public_summary: "Síntese publicada da fixture.", agreements: ["Acordo de teste"], disagreements: ["Divergência preservada"], status: "published", published_at: new Date().toISOString() });
  return { db, pautaId: pauta.id, slug: pauta.slug, tag };
}

export async function cleanupLocalComunFixtures() {
  const db = localServiceClient();
  const { data: pautas } = await db.from("comun_pauta_spaces").select("id").like("slug", `${prefix}%`);
  for (const pauta of pautas ?? []) await db.from("comun_pauta_spaces").delete().eq("id", pauta.id);
  for (const email of Object.values(localPersonaEmails)) {
    await db.from("comun_admin_profiles").delete().eq("email", email);
    await db.from("comun_admin_users").delete().eq("email", email);
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 }); const user = data?.users.find((item) => item.email === email);
    if (user) await db.auth.admin.deleteUser(user.id);
  }
}

export async function assertNoComunTestFixtures() {
  const db = localServiceClient(); const { count, error } = await db.from("comun_pauta_spaces").select("id", { count: "exact", head: true }).like("slug", `${prefix}%`);
  if (error || count) throw new Error(`Fixtures COMUN restantes: ${count ?? "erro"}`);
  console.log("COMUN_TEST_FIXTURES_CLEAN");
}
