import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const mode = process.argv[2] ?? "prepare";
const root = process.cwd();
const localDir = path.join(root, ".local", "comun-sidewalk-human-gate");
const manifestPath = path.join(localDir, "manifest.json");
const pidPath = path.join(localDir, "server.json");
const prefix = "demo-human-gate-s37-2";
const baseUrl = "http://127.0.0.1:3000";
const password = "comun-demo-local-37-2";
const personas = [
  ["facilitador", "facilitator"],
  ["operador-protocolo", "protocol_operator"],
  ["curador-resultado", "result_editor"],
];

function localEnvironment() {
  process.env.DO_NOT_TRACK = "1";
  process.env.SUPABASE_DISABLE_TELEMETRY = "1";
  const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; $env:SUPABASE_DISABLE_TELEMETRY='1'; npx supabase status -o env"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const values = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^\"|\"$/g, "")];
  }));
  assert.match(values.API_URL ?? "", /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, "Supabase local obrigatório");
  assert.ok(values.SERVICE_ROLE_KEY && values.ANON_KEY, "Credenciais do Supabase local ausentes");
  const risky = [process.env.COMUN_BASE_URL, process.env.VERCEL_URL, process.env.R2_PUBLIC_BASE_URL].filter(Boolean).join(" ");
  assert.doesNotMatch(risky, /supabase\.co|vercel\.app|cloudflare|r2\.cloudflarestorage/i, "Destino remoto bloqueado");
  return {
    values,
    env: {
      ...process.env,
      ALLOW_LOCAL_TESTS: "true",
      COMUN_BASE_URL: baseUrl,
      NEXT_PUBLIC_SITE_URL: baseUrl,
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
      MEDIA_STORAGE_PROVIDER: "supabase-local",
    },
  };
}

const required = async (query, label) => {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

async function deleteDemoData(db) {
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const demoUsers = (users?.users ?? []).filter((user) => user.email?.startsWith(`${prefix}-`));
  const ids = demoUsers.map((user) => user.id);
  const emails = demoUsers.map((user) => user.email).filter(Boolean);
  if (emails.length) {
    await db.from("comun_admin_profiles").delete().in("email", emails);
    await db.from("comun_admin_users").delete().in("email", emails);
  }
  if (ids.length) await db.from("comun_member_profiles").delete().in("user_id", ids);
  for (const user of demoUsers) await required(db.auth.admin.deleteUser(user.id), `remover conta ${user.email}`);

  const { data: records } = await db.from("comun_sidewalk_records").select("id").like("slug", `${prefix}-%`);
  const recordIds = (records ?? []).map((row) => row.id);
  if (recordIds.length) await db.from("comun_sidewalk_record_links").delete().in("record_id", recordIds);
  await db.from("comun_sidewalk_cycle_memories").delete().like("slug", `${prefix}-%`);
  await db.from("comun_hub_results").delete().like("slug", `${prefix}-%`);
  await db.from("comun_mobilization_actions").delete().like("slug", `${prefix}-%`);
  await db.from("comun_sidewalk_records").delete().like("slug", `${prefix}-%`);
  const { data: reports } = await db.from("comun_reports").select("id").like("protocol", "COMUN-DEMO-CALC-%");
  const reportIds = (reports ?? []).map((row) => row.id);
  if (reportIds.length) await db.from("comun_official_protocols").delete().in("report_id", reportIds);
  if (reportIds.length) await db.from("comun_reports").delete().in("id", reportIds);
}

function stopOwnedServer() {
  if (!process.platform.startsWith("win") || !readable(pidPath)) return;
  const { pid } = JSON.parse(readFileSync(pidPath, "utf8"));
  if (!Number.isInteger(pid) || pid < 1) return;
  const command = execFileSync("powershell", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\").CommandLine`], { encoding: "utf8" }).trim();
  if (!command || !command.includes("node_modules\\next\\dist\\bin\\next")) return;
  execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
}

function readable(file) {
  try { readFileSync(file); return true; } catch { return false; }
}

async function cleanup() {
  const { values } = localEnvironment();
  const db = createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  stopOwnedServer();
  await deleteDemoData(db);
  const checks = await Promise.all([
    db.from("comun_sidewalk_records").select("id", { count: "exact", head: true }).like("slug", `${prefix}-%`),
    db.from("comun_mobilization_actions").select("id", { count: "exact", head: true }).like("slug", `${prefix}-%`),
    db.from("comun_hub_results").select("id", { count: "exact", head: true }).like("slug", `${prefix}-%`),
    db.from("comun_sidewalk_cycle_memories").select("id", { count: "exact", head: true }).like("slug", `${prefix}-%`),
  ]);
  assert.ok(checks.every((result) => !result.error && (result.count ?? 0) === 0), "Fixtures de conteúdo não foram removidas");
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.equal((users?.users ?? []).filter((user) => user.email?.startsWith(`${prefix}-`)).length, 0, "Contas fixture não foram removidas");
  rmSync(localDir, { recursive: true, force: true });
  console.log("COMUN_HUMAN_GATE_DEMO_CLEAN");
}

async function prepare() {
  const { values, env } = localEnvironment();
  execFileSync(process.execPath, ["scripts/check-comun-auth-readiness.mjs"], { cwd: root, env, stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/wait-comun-local-storage.mjs"], { cwd: root, env, stdio: "inherit" });
  const db = createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  stopOwnedServer();
  await deleteDemoData(db);
  rmSync(localDir, { recursive: true, force: true });
  mkdirSync(localDir, { recursive: true });

  const pauta = await required(db.from("comun_pauta_spaces").select("id,slug,title").eq("slug", "calcadas-em-circulacao").single(), "pauta canônica");
  const community = await required(db.from("comun_communities").select("slug,name").eq("slug", "cidade").single(), "comunidade canônica");
  const now = new Date().toISOString();
  const records = await required(db.from("comun_sidewalk_records").insert([
    { pauta_id: pauta.id, slug: `${prefix}-travessia`, name: "Travessia demonstrativa", public_geometry_geojson: { type: "Point", coordinates: [-44.104, -22.52] }, private_geometry_geojson: { type: "Point", coordinates: [-44.10412, -22.52008] }, municipality: "Volta Redonda", neighborhood: "Centro — demonstração", location_source: "editorial", location_precision: "approximate", condition: "terrible", forwarding_status: "priority", categories: ["sem_rampa"], impact_level: "critical", affected_groups: ["wheelchair_users"], status: "published", verification_status: "verified", visibility: "public", public_summary: "DEMONSTRAÇÃO LOCAL: ponto inventado para observar compreensão do mapa.", public_location_level: "approximate", approximate_location: "Centro — referência fictícia", last_observed_at: now },
    { pauta_id: pauta.id, slug: `${prefix}-piso`, name: "Piso irregular demonstrativo", public_geometry_geojson: { type: "Point", coordinates: [-44.111, -22.516] }, private_geometry_geojson: { type: "Point", coordinates: [-44.11108, -22.51604] }, municipality: "Volta Redonda", neighborhood: "Aterrado — demonstração", location_source: "editorial", location_precision: "approximate", condition: "bad", forwarding_status: "no_action", categories: ["irregular"], impact_level: "high", affected_groups: ["older_people"], status: "published", verification_status: "verified", visibility: "public", public_summary: "DEMONSTRAÇÃO LOCAL: trecho sintético, sem alegação sobre local real.", public_location_level: "approximate", approximate_location: "Aterrado — referência fictícia", last_observed_at: now },
    { pauta_id: pauta.id, slug: `${prefix}-obstaculo`, name: "Obstáculo demonstrativo", public_geometry_geojson: { type: "Point", coordinates: [-44.096, -22.525] }, private_geometry_geojson: { type: "Point", coordinates: [-44.09606, -22.52503] }, municipality: "Volta Redonda", neighborhood: "Vila — demonstração", location_source: "editorial", location_precision: "approximate", condition: "regular", forwarding_status: "no_action", categories: ["obstaculo"], impact_level: "medium", affected_groups: [], status: "published", verification_status: "verified", visibility: "public", public_summary: "DEMONSTRAÇÃO LOCAL: marcador fictício para validação humana.", public_location_level: "approximate", approximate_location: "Vila — referência fictícia", last_observed_at: now },
    { pauta_id: pauta.id, slug: `${prefix}-em-revisao`, name: "Registro demonstrativo em revisão", public_geometry_geojson: null, private_geometry_geojson: { type: "Point", coordinates: [-44.1, -22.519] }, municipality: "Volta Redonda", neighborhood: "Demonstração", location_source: "manual", location_precision: "exact", condition: "bad", forwarding_status: "no_action", categories: ["buraco"], impact_level: "high", affected_groups: [], status: "under_review", verification_status: "community_report", visibility: "internal", public_summary: "Conteúdo sintético aguardando revisão.", public_location_level: "hidden", approximate_location: "Local protegido — demonstração", last_observed_at: now },
  ]).select("id,slug"), "registros demonstrativos");
  const publicRecord = records[0];
  const priority = await required(db.from("comun_sidewalk_priorities").insert({ pauta_id: pauta.id, record_id: publicRecord.id, decision_public: "Priorizar travessia acessível demonstrativa", criteria_public: ["impacto", "acessibilidade", "recorrência simulada"], evidence_summary_public: "Decisão inteiramente fictícia para ensaio local.", limitations_public: "Não representa levantamento nem deliberação real.", decided_by: prefix, decided_at: now, status: "approved" }).select("id").single(), "prioridade");
  const action = await required(db.from("comun_mobilization_actions").insert({ pauta_id: pauta.id, sidewalk_record_id: publicRecord.id, slug: `${prefix}-mobilizacao`, title: "Mobilização demonstrativa pela circulação", action_type: "digital_pressure", objective_public: "Ensaiar a passagem da prioridade para uma ação coletiva fictícia.", status: "confirmed", responsible_public: "Equipe de demonstração local", starts_at: new Date(Date.now() + 86400000).toISOString(), participation_public: "Somente ensaio local; nenhuma mobilização real.", expected_result_public: "Compreensão da cadeia pelo participante.", visibility: "public" }).select("id,slug").single(), "mobilização");
  const result = await required(db.from("comun_hub_results").insert({ pauta_id: pauta.id, action_id: action.id, sidewalk_record_id: publicRecord.id, slug: `${prefix}-resultado`, title: "Resultado demonstrativo documentado", result_type: "learning", public_summary: "A equipe registrou um aprendizado fictício para o ensaio.", what_was_done_public: "Fluxo local preparado sem contato externo.", remaining_public: "Realizar gate humano e ensaio operacional.", verification_status: "verified", visibility: "public", occurred_at: now, evidence_summary_public: "Evidência sintética, identificada como demonstração.", created_by: prefix }).select("id,slug").single(), "resultado");
  const memory = await required(db.from("comun_sidewalk_cycle_memories").insert({ pauta_id: pauta.id, record_id: publicRecord.id, action_id: action.id, result_id: result.id, priority_id: priority.id, slug: `${prefix}-memoria`, title: "Memória demonstrativa do ciclo", public_summary: "Memória inteiramente sintética para testar descoberta e compreensão.", methodology_snapshot: "Fixture local sem pessoas, dados ou protocolos reais.", status: "published", visibility: "public", published_at: now }).select("id,slug").single(), "memória");
  const report = await required(db.from("comun_reports").insert({ protocol: `COMUN-DEMO-CALC-${Date.now()}`, community_slug: "cidade", title: "Encaminhamento exclusivamente fictício", raw_text: "DEMONSTRAÇÃO LOCAL. Nenhum envio institucional ocorreu.", public_text: "Protocolo fixture para ensaio operacional.", is_anonymous: true, can_publish_sanitized: true, accepts_contact: false, status: "published", risk_level: "low", source_channel: "sidewalk_forwarding" }).select("id,protocol").single(), "relato fixture");
  const protocol = await required(db.from("comun_official_protocols").insert({ report_id: report.id, sidewalk_record_id: publicRecord.id, comun_protocol: report.protocol, channel: "fixture_local", agency: "Órgão fictício — não contatado", official_protocol_number: "FICTICIO-0000", status: "response_received", public_summary: "PROTOCOLO FICTÍCIO: usado somente no ensaio local.", response_text: "Resposta sintética sem origem externa.", response_received_at: now, internal_notes: "Nenhum protocolo real foi enviado." }).select("id").single(), "protocolo fixture");
  await required(db.from("comun_sidewalk_record_links").insert([
    { record_id: publicRecord.id, target_type: "action", target_id: action.id, public_note: "Mobilização demonstrativa." },
    { record_id: publicRecord.id, target_type: "protocol", target_id: protocol.id, public_note: "Protocolo explicitamente fictício." },
    { record_id: publicRecord.id, target_type: "result", target_id: result.id, public_note: "Resultado demonstrativo." },
    { record_id: publicRecord.id, target_type: "memory", target_id: memory.id, public_note: "Memória demonstrativa." },
  ]), "vínculos públicos");

  const accounts = [];
  for (const [label, operationalRole] of personas) {
    const email = `${prefix}-${label}@comun.test`;
    const created = await required(db.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { fixture: prefix, persona: operationalRole } }), `conta ${label}`);
    await required(db.from("comun_member_profiles").insert({ user_id: created.user.id, display_name: `Demonstração ${label}`, status: "active", participation_visibility: "private", onboarding_completed_at: now }), `perfil ${label}`);
    await required(db.from("comun_admin_users").insert({ user_id: created.user.id, email, role: "viewer", is_active: true }), `admin ${label}`);
    await required(db.from("comun_admin_profiles").insert({ auth_user_id: created.user.id, email, display_name: `Demonstração ${label}`, role: "viewer", operational_role: operationalRole, active: true, operational_note: prefix }), `papel ${label}`);
    accounts.push({ role: operationalRole, email });
  }

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#d9d3c5"/><path d="M0 650 L1200 230" stroke="#555" stroke-width="160"/><path d="M0 665 L1200 245" stroke="#ffd400" stroke-width="18"/><circle cx="920" cy="210" r="70" fill="#222"/><text x="55" y="100" font-family="Arial" font-size="44" font-weight="bold">DEMONSTRAÇÃO LOCAL — SEM PESSOAS</text></svg>';
  const imagePath = path.join(localDir, "calcada-demonstracao-sem-pessoa.jpg");
  await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(imagePath);
  writeFileSync(manifestPath, `${JSON.stringify({ prefix, createdAt: now, pauta, community, records, priority, action, result, memory, report, protocol, accounts, imagePath }, null, 2)}\n`);

  let reused = false;
  try { reused = (await fetch(`${baseUrl}/comun/calcadas`)).ok; } catch {}
  if (!reused) {
    const out = openSync(path.join(localDir, "next.stdout.log"), "a");
    const err = openSync(path.join(localDir, "next.stderr.log"), "a");
    const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
    const child = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], { cwd: root, env, detached: true, stdio: ["ignore", out, err], windowsHide: true });
    child.unref(); closeSync(out); closeSync(err);
    writeFileSync(pidPath, `${JSON.stringify({ pid: child.pid, startedAt: new Date().toISOString(), nextBin })}\n`);
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      try { if ((await fetch(`${baseUrl}/comun/calcadas`)).ok) break; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(Date.now() < deadline, "App local não ficou pronto em 120 s");
  }

  console.log("\nCOMUN HUMAN GATE — DEMONSTRAÇÃO LOCAL");
  console.log(`Mapa: ${baseUrl}/comun/calcadas`);
  console.log(`Contribuir: ${baseUrl}/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao`);
  console.log(`Minha área: ${baseUrl}/comun/minha-participacao`);
  console.log(`Fila: ${baseUrl}/comun/admin/calcadas`);
  console.log(`Prioridade: ${baseUrl}/comun/admin/calcadas/prioridade`);
  console.log(`Encaminhamentos: ${baseUrl}/comun/admin/calcadas/encaminhamentos`);
  console.log(`Imagem sem pessoas: ${imagePath}`);
  for (const account of accounts) console.log(`${account.role}: ${account.email} | senha fixture: ${password}`);
  console.log("Estados vazios: use um filtro sem correspondência no mapa ou uma fila já concluída.");
  console.log("Nenhum teste humano foi preenchido. Nenhum protocolo real foi enviado.");
}

if (mode === "prepare") await prepare();
else if (mode === "cleanup") await cleanup();
else throw new Error("Use prepare ou cleanup.");
