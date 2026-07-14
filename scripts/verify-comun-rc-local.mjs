import { spawn, spawnSync } from "node:child_process";

const localSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/.test(localSiteUrl)) {
  console.error("RC local abortado: NEXT_PUBLIC_SITE_URL deve apontar para localhost ou 127.0.0.1.");
  process.exit(1);
}

const checkCommands = [
  ["npm", ["run", "lint"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "audit:rls-matrix"]],
  ["npm", ["run", "storage:setup"]],
];

const smokeCommands = [
  ["npm", ["run", "smoke:comun"]],
  ["npm", ["run", "smoke:admin-auth"]],
  ["npm", ["run", "smoke:no-leak-http"]],
  ["npm", ["run", "smoke:quick-report"]],
  ["npm", ["run", "smoke:attachment-curation"]],
  ["npm", ["run", "smoke:official-protocol"]],
  ["npm", ["run", "smoke:official-protocols-admin"]],
  ["npm", ["run", "smoke:official-protocols-metrics"]],
  ["npm", ["run", "smoke:pauta-spaces"]],
  ["npm", ["run", "smoke:pauta-contribution-safety"]],
  ["npm", ["run", "smoke:pauta-editorial-quality"]],
  ["npm", ["run", "smoke:pauta-dossier-draft"]],
  ["npm", ["run", "smoke:pauta-dossier-publication"]],
  ["npm", ["run", "smoke:pauta-dossier-double-review"]],
  ["npm", ["run", "smoke:pauta-dossier-review-queue"]],
  ["npm", ["run", "smoke:pauta-dossier-review-ops"]],
  ["npm", ["run", "smoke:admin-notifications"]],
  ["npm", ["run", "smoke:reviewer-identity"]],
  ["npm", ["run", "smoke:admin-team"]],
  ["npm", ["run", "smoke:dossier-publication-snapshots"]],
  ["npm", ["run", "smoke:public-dossier-page"]],
  ["npm", ["run", "smoke:public-dossier-index"]],
  ["npm", ["run", "smoke:public-dossier-navigation"]],
  ["npm", ["run", "smoke:public-dossier-features"]],
  ["npm", ["run", "smoke:rls-hardening"]],
  ["npm", ["run", "smoke:rls-matrix"]],
];

const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: localSiteUrl,
};

let nextProcess = null;

try {
  for (const [command, args] of checkCommands) runCommand(command, args);
  nextProcess = startNext();
  await waitForLocalNext();
  for (const [command, args] of smokeCommands) {
    const isNoLeakSmoke = command === "npm" && args.join(" ") === "run smoke:no-leak-http";
    if (isNoLeakSmoke) seedNoLeakFixture();
    try {
      runCommand(command, args);
    } finally {
      if (isNoLeakSmoke) cleanupNoLeakFixture();
    }
  }
} finally {
  if (nextProcess) stopNext(nextProcess);
}

console.log("RC_LOCAL_PASS");

function runCommand(command, args) {
  console.log(`\n==> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`RC_LOCAL_FAIL: ${command} ${args.join(" ")} saiu com status ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function startNext() {
  const port = new URL(localSiteUrl).port || "3000";
  console.log(`\n==> npm run dev -- -p ${port}`);
  return spawn("npm", ["run", "dev", "--", "-p", port], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function waitForLocalNext() {
  const deadline = Date.now() + 120_000;
  const url = new URL("/comun", localSiteUrl);
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error("RC_LOCAL_FAIL: Next local nao respondeu em /comun");
  process.exit(1);
}

function stopNext(child) {
  if (!child.killed) child.kill();
  if (process.platform === "win32") {
    const port = new URL(localSiteUrl).port || "3000";
    spawnSync("powershell", [
      "-NoProfile",
      "-Command",
      `$ids = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: "ignore" });
  }
}

function seedNoLeakFixture() {
  runLocalSql(`
insert into public.comun_pauta_spaces (slug, title, summary, category, community, status, visibility, public_synthesis, next_step, created_from_signal)
values (
  'trabalho-burnout-volta-redonda',
  'Trabalho e burnout em Volta Redonda',
  'Pauta publica de smoke local para verificacao de vazamento.',
  'trabalho',
  'Volta Redonda',
  'observing',
  'public',
  'Relato aponta pressao no ambiente de trabalho e possivel atraso de direitos. A pessoa preferiu nao se identificar. O caso segue em acompanhamento.',
  'Acompanhar novas contribuicoes publicas e organizar evidencias seguras.',
  'verify-rc-local-no-leak-fixture'
)
on conflict (slug) do update set
  public_synthesis = excluded.public_synthesis,
  summary = excluded.summary,
  status = excluded.status,
  visibility = excluded.visibility,
  created_from_signal = excluded.created_from_signal,
  updated_at = now();
`);
}

function cleanupNoLeakFixture() {
  runLocalSql(`
delete from public.comun_pauta_spaces
where slug = 'trabalho-burnout-volta-redonda'
  and created_from_signal = 'verify-rc-local-no-leak-fixture';
`);
}

function runLocalSql(sql) {
  const result = spawnSync("npx", ["supabase", "db", "query", "--local"], {
    cwd: process.cwd(),
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`falha ao executar SQL local da RC: ${result.status}`);
  }
}
