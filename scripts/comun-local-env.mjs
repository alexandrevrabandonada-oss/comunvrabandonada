import { execFileSync, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readSupabaseLocalEnv } from "./ci/read-supabase-local-env.mjs";

const mode = process.argv[2] || "check";
process.env.DO_NOT_TRACK = "1";
process.env.SUPABASE_DISABLE_TELEMETRY = "1";

export function parseLocalStatus(raw) {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          line.slice(separator + 1).replace(/^"|"$/g, ""),
        ];
      }),
  );
}

export function buildLocalEnvironment(local, inherited = process.env) {
  const localAppUrl = inherited.COMUN_BASE_URL || "http://localhost:3000";
  if (
    !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):\d{1,5}\/postgres(?:[/?]|$)/.test(
      local.DB_URL || "",
    )
  )
    throw new Error("PostgreSQL local obrigatório.");
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(local.API_URL || ""))
    throw new Error("Supabase local obrigatório.");
  const risky = [
    inherited.COMUN_BASE_URL,
    inherited.VERCEL_URL,
    inherited.R2_PUBLIC_BASE_URL,
    local.DB_URL,
    local.API_URL,
  ]
    .filter(Boolean)
    .join(" ");
  if (/supabase\.co|vercel\.app|r2\.cloudflarestorage|cloudflare/i.test(risky))
    throw new Error("Destino remoto detectado no ambiente.");
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(localAppUrl))
    throw new Error("Aplicação local obrigatória.");
  return {
    ...inherited,
    DO_NOT_TRACK: "1",
    SUPABASE_DISABLE_TELEMETRY: "1",
    ALLOW_LOCAL_TESTS: "true",
    COMUN_BASE_URL: localAppUrl,
    NEXT_PUBLIC_SITE_URL: localAppUrl,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL: local.DB_URL,
    PR23_DATABASE_URL: local.DB_URL,
    SUPABASE_PROJECT_REF: "LOCAL_VALIDATION",
    PR23_ALLOWED_PROJECT_REFS: "LOCAL_VALIDATION",
    MEDIA_STORAGE_PROVIDER: "supabase-local",
    COMUN_TERRITORY_CATALOG_LOCAL: inherited.COMUN_TERRITORY_CATALOG_LOCAL || "enabled",
  };
}

export function printSafeEnvironment(env) {
  return {
    application: env.COMUN_BASE_URL,
    supabase: env.NEXT_PUBLIC_SUPABASE_URL,
    storage_provider: env.MEDIA_STORAGE_PROVIDER,
    mode: "local",
    secrets: "redacted",
  };
}

export function readLocalStatus({
  inherited = process.env,
  platform = process.platform,
  retryReader = readSupabaseLocalEnv,
} = {}) {
  const isWindows = platform === "win32";
  const localProjectId = "COMUM_VR_ABANDONADA";
  const statusEnv = {
    ...inherited,
    // .env.local contains the Production project reference. The local CLI
    // must resolve only containers named by supabase/config.toml.
    SUPABASE_PROJECT_ID: localProjectId,
    SUPABASE_PROJECT_REF: localProjectId,
  };
  if (!isWindows && inherited.GITHUB_ACTIONS === "true") {
    const result = retryReader({
      invoke: () =>
        spawnSync("supabase", ["status", "-o", "env"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          env: statusEnv,
        }),
    });
    if (!result.ok) throw new Error("COMUN_LOCAL_STATUS_RETRY_FAILED");
    return result.output;
  }
  const statusCommand = isWindows ? "powershell" : "npx";
  const statusArgs = isWindows
    ? [
        "-NoProfile",
        "-Command",
        "$env:DO_NOT_TRACK='1'; $env:SUPABASE_DISABLE_TELEMETRY='1'; npx supabase status -o env",
      ]
    : ["supabase", "status", "-o", "env"];
  const raw = execFileSync(statusCommand, statusArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: statusEnv,
  });
  return raw;
}

function values() {
  const raw = readLocalStatus();
  return buildLocalEnvironment(parseLocalStatus(raw));
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const env = values();
  if (mode === "check") {
    console.log("COMUN_LOCAL_ENV_OK");
    process.exit(0);
  }
  if (mode === "print-safe") {
    console.log(JSON.stringify(printSafeEnvironment(env), null, 2));
    process.exit(0);
  }
  const command = process.argv[3];
  const args = process.argv.slice(4);
  if (!command) throw new Error("Comando filho ausente.");
  const child = spawn(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
