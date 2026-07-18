import { spawn, spawnSync } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { waitForLocalSupabaseRecovery } from "./wait-comun-local-supabase-recovery.mjs";
import { buildResetEvidence, classifyReset, shouldRestartKong, truncateResetLog } from "./comun-local-reset-contract.mjs";

const round = process.argv[2];
if (!["1", "2"].includes(round)) throw new Error("Use rodada 1 ou 2.");

const startedAt = new Date().toISOString();
const runId = `auth-reset-${round}-${startedAt.replace(/[-:.TZ]/g, "")}`;
const status = spawnSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; $env:SUPABASE_DISABLE_TELEMETRY='1'; npx supabase status -o env"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
if (status.status !== 0) throw new Error("Supabase local indisponível para o runner");
const localEnv = Object.fromEntries(status.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).replace(/^\"|\"$/g, "")];
}));
Object.assign(process.env, {
  ...localEnv,
  ALLOW_LOCAL_TESTS: "true",
  COMUN_BASE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_SUPABASE_URL: localEnv.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
  MEDIA_STORAGE_PROVIDER: "supabase-local",
  DO_NOT_TRACK: "1",
  SUPABASE_DISABLE_TELEMETRY: "1",
});
const env = { ...process.env, COMUN_RESET_ROUND: round };
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
const records = [];
const outputPath = `reports/comun-reset-${round}-33-2-1-final.json`;
const local = (label, command, args) => [label, "node", ["scripts/comun-local-env.mjs", "run", command, ...args]];
const expectedMigrations = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).length;
const appliedMigrations = () => {
  const result = spawnSync("docker", ["exec", "supabase_db_COMUM_VR_ABANDONADA", "psql", "-U", "postgres", "-d", "postgres", "-tAc", "select count(*) from supabase_migrations.schema_migrations"], { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`consulta de migrations falhou: ${result.stderr.trim()}`);
  return Number(result.stdout.trim());
};
const commandText = (command, args) => [command, ...args].join(" ");
async function save(failure) {
  await writeFile(outputPath, `${JSON.stringify(buildResetEvidence({ runId, round, commit, startedAt, finishedAt: new Date().toISOString(), records, failure }), null, 2)}\n`);
}

async function rebuild() {
  const started = Date.now();
  const command = "node scripts/comun-local-env.mjs run npx supabase db reset --local";
  const result = spawnSync("node", ["scripts/comun-local-env.mjs", "run", "npx", "supabase", "db", "reset", "--local"], { cwd: process.cwd(), env, encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  let recovery;
  let restart = null;
  try {
    recovery = await waitForLocalSupabaseRecovery();
  } catch (error) {
    const recoveryError = String(error?.message ?? error);
    const authHealth = spawnSync("docker", ["inspect", "-f", "{{.State.Health.Status}}", "supabase_auth_COMUM_VR_ABANDONADA"], { encoding: "utf8" }).stdout.trim();
    if (!shouldRestartKong({ recoveryError, authHealth, alreadyRestarted: false })) throw error;
    const restarted = Date.now();
    const restartCommand = spawnSync("docker", ["restart", "supabase_kong_COMUM_VR_ABANDONADA"], { encoding: "utf8" });
    if (restartCommand.status !== 0) throw new Error(`restart restrito de Kong falhou: ${truncateResetLog(restartCommand.stderr)}`);
    recovery = await waitForLocalSupabaseRecovery();
    restart = {
      service: "kong",
      command: "docker restart supabase_kong_COMUM_VR_ABANDONADA",
      reason: "Auth saudável e Kong respondeu 502 para /auth/v1/health",
      recoveryError,
      durationMs: Date.now() - restarted,
      result: "recovered",
    };
    console.log(`COMUN_LOCAL_KONG_RESTART_RECOVERED durationMs=${restart.durationMs}`);
  }
  const migrations = appliedMigrations();
  const classification = classifyReset({ exitCode: result.status, migrations, expectedMigrations, recovered: recovery.ok });
  records.push({ label: "reset", command, ok: true, durationMs: Date.now() - started, exitCode: result.status, classification, migrations, expectedMigrations, recovered: recovery.ok, readiness: recovery, restart, stdout: truncateResetLog(result.stdout), stderr: truncateResetLog(result.stderr) });
  if (result.status !== 0) console.log(`COMUN_RESET_TRANSIENT_RECOVERED exitCode=${result.status} migrations=${migrations}`);
}

const server = spawn("node", ["scripts/comun-local-env.mjs", "run", "npm", "run", "dev"], { cwd: process.cwd(), env, stdio: "ignore", shell: process.platform === "win32" });
const deadline = Date.now() + 120000;
let ready = false;
while (Date.now() < deadline) {
  try {
    if ((await fetch("http://127.0.0.1:3000/comun")).ok) { ready = true; break; }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) throw new Error("next dev local não ficou pronto");

const commands = [
  ["reset", null, []],
  local("storage", "npm", ["run", "storage:readiness"]),
  local("auth-readiness", "npm", ["run", "auth:readiness:local"]),
  local("db-lint", "npx", ["supabase", "db", "lint", "--local"]),
  local("rls-matrix", "npm", ["run", "audit:rls-matrix"]),
  local("unit", "npm", ["run", "test:unit"]),
  local("e2e", "npm", ["run", "test:e2e:editorial-operation-authenticated"]),
  local("cleanup-e2e", "npm", ["run", "test:fixtures:cleanup"]),
  local("axe", "npm", ["run", "test:a11y:editorial-operation-authenticated"]),
  local("cleanup-axe", "npm", ["run", "test:fixtures:cleanup"]),
  local("visual", "npm", ["run", "test:visual:editorial-operation-authenticated"]),
  local("cleanup-visual", "npm", ["run", "test:fixtures:cleanup"]),
  local("rehearsal-auth", "npm", ["run", "smoke:first-pilot-authenticated-rehearsal"]),
  local("rehearsal", "npm", ["run", "smoke:first-pilot-rehearsal"]),
  local("editorial", "npm", ["run", "smoke:editorial-operation"]),
  local("sidewalk", "npm", ["run", "smoke:sidewalk-pilot"]),
  local("central", "npm", ["run", "smoke:central-experience"]),
  local("pauta", "npm", ["run", "smoke:pauta-miniapp"]),
  local("radio", "npm", ["run", "smoke:community-radio"]),
  local("art-storage", "npm", ["run", "smoke:territorial-art-storage"]),
  local("art", "npm", ["run", "smoke:territorial-art"]),
  local("community-auth", "npm", ["run", "smoke:community-auth:local"]),
  local("public-ui", "npm", ["run", "smoke:public-ui:local"]),
  local("no-leak", "npm", ["run", "smoke:no-leak-http"]),
  local("cleanup", "npm", ["run", "test:fixtures:cleanup"]),
  local("assert-clean", "npm", ["run", "test:fixtures:assert-clean"]),
];

try {
  for (const [label, command, args] of commands) {
    if (label === "reset") { await rebuild(); continue; }
    const started = Date.now();
    const result = spawnSync(command, args, { cwd: process.cwd(), env, encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    records.push({ label, command: commandText(command, args), ok: result.status === 0, durationMs: Date.now() - started, exitCode: result.status, stdout: truncateResetLog(result.stdout), stderr: truncateResetLog(result.stderr) });
    if (result.status !== 0) throw new Error(`${label} falhou: ${truncateResetLog(result.stderr || result.stdout)}`);
  }
  await save();
  console.log(`COMUN_RESET_AUTH_ROUND_${round}_OK`);
} catch (error) {
  await save(String(error?.message ?? error));
  throw error;
} finally {
  if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill();
}
