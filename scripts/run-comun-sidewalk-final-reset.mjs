import { spawn, spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const round = process.argv[2];
if (!["1", "2"].includes(round)) throw new Error("Use rodada 1 ou 2.");
const runId = `sidewalk-reset-${round}-${randomUUID()}`;
const startedAt = new Date().toISOString();
const commit = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const output = `reports/comun-reset-${round}-calcadas-sprint-37-2.json`;
const records = [];
const baseEnv = {
  ...process.env,
  ALLOW_LOCAL_TESTS: "true",
  COMUN_TEST_RUN_ID: runId,
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  DO_NOT_TRACK: "1",
  SUPABASE_DISABLE_TELEMETRY: "1",
};
const local = (command, args) => ["node", ["scripts/comun-local-env.mjs", "run", command, ...args]];
const steps = [
  ["db-reset", ...local("npx", ["supabase", "db", "reset", "--local"])],
  ["storage-readiness", ...local("npm", ["run", "storage:readiness"])],
  ["auth-readiness", ...local("npm", ["run", "auth:readiness:local"])],
  ["unit", "npm", ["run", "test:unit"]],
  ["rls", "npm", ["run", "audit:rls-matrix"]],
  ["db-lint", ...local("npx", ["supabase", "db", "lint", "--local"])],
  ["sidewalk-real-map", "npm", ["run", "test:e2e:comun-sidewalk-real-map"]],
  ["sidewalk-pilot", "npm", ["run", "test:e2e:sidewalk-pilot"]],
  ["primeira-participacao", "npm", ["run", "test:e2e:comun-first-pilot-integrated"]],
  ["experiencia-integral", ...local("npm", ["run", "test:e2e:comun-integral-experience"])],
  ["pwa", "npm", ["run", "test:e2e:comun-pwa-experience"]],
  ["comunidades", "npm", ["run", "test:e2e:comun-community-experience"]],
  ["auth", ...local("npm", ["run", "smoke:community-auth:local"])],
  ["experiencia-central", "npm", ["run", "test:e2e:central-experience"]],
  ["operacao-editorial", ...local("npm", ["run", "test:e2e:editorial-operation-authenticated"])],
  ["performance-clustering", "npm", ["run", "perf:comun-sidewalk-real-map"]],
  ["cleanup", ...local("npm", ["run", "test:fixtures:cleanup"])],
  ["assert-clean", ...local("npm", ["run", "test:fixtures:assert-clean"])],
  ["build", "npm", ["run", "build"]],
];

function run(label, command, args, env = baseEnv) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: process.cwd(), env, encoding: "utf8", shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024,
  });
  const record = {
    label, command: [command, ...args].join(" "), ok: result.status === 0,
    exitCode: result.status, durationMs: Date.now() - started,
    stdout: result.stdout?.slice(-12000) ?? "", stderr: result.stderr?.slice(-12000) ?? "",
  };
  records.push(record);
  console.log(`${record.ok ? "OK" : "FAIL"} ${label} ${record.durationMs}ms`);
  if (!record.ok) throw new Error(`${label} falhou`);
}
async function save(failure = null) {
  await writeFile(output, `${JSON.stringify({ round, runId, commit, startedAt, finishedAt: new Date().toISOString(), ok: !failure, failure, records }, null, 2)}\n`);
}

let server;
try {
  for (const [label, command, args] of steps) run(label, command, args);
  server = spawn("node", ["scripts/comun-local-env.mjs", "run", "npm", "run", "start", "--", "-p", "3000"], {
    cwd: process.cwd(), env: baseEnv, stdio: "ignore", shell: process.platform === "win32",
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try { if ((await fetch("http://127.0.0.1:3000/comun")).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (Date.now() >= deadline) throw new Error("next start não ficou pronto");
  run("production-like", "node", ["scripts/comun-local-env.mjs", "run", "npx", "playwright", "test", "tests/comun-integral-experience/visitor-flow.spec.ts", "--project=1366x768", "-c", "playwright.comun-integral-experience.config.ts"], { ...baseEnv, COMUN_BASE_URL: "http://127.0.0.1:3000", PLAYWRIGHT_SKIP_WEBSERVER: "1" });
  run("production-pauta-miniapp", ...local("npm", ["run", "smoke:pauta-miniapp"]), { ...baseEnv, COMUN_BASE_URL: "http://127.0.0.1:3000" });
  run("production-no-leak", ...local("npm", ["run", "smoke:no-leak-http"]));
  run("final-cleanup", ...local("npm", ["run", "test:fixtures:cleanup"]));
  run("final-assert-clean", ...local("npm", ["run", "test:fixtures:assert-clean"]));
  await save();
  console.log(`COMUN_SIDEWALK_REAL_MAP_RESET_${round}_OK runId=${runId}`);
} catch (error) {
  await save(String(error?.message ?? error));
  throw error;
} finally {
  if (server?.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill("SIGTERM");
  }
}
