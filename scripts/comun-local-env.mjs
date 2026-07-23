import { execFileSync, spawn } from "node:child_process";

const mode = process.argv[2] || "check";
process.env.DO_NOT_TRACK = "1";
process.env.SUPABASE_DISABLE_TELEMETRY = "1";

function values() {
  const isWindows = process.platform === "win32";
  const statusCommand = isWindows ? "powershell" : "npx";
  const statusArgs = isWindows
    ? ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; $env:SUPABASE_DISABLE_TELEMETRY='1'; npx supabase status -o env"]
    : ["supabase", "status", "-o", "env"];
  const raw = execFileSync(statusCommand, statusArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: process.env,
  });
  const local = Object.fromEntries(
    raw.split(/\r?\n/).filter(Boolean).map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
    }),
  );
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(local.API_URL || "")) throw new Error("Supabase local obrigatório.");
  const risky = [process.env.COMUN_BASE_URL, process.env.VERCEL_URL, process.env.R2_PUBLIC_BASE_URL].filter(Boolean).join(" ");
  if (/supabase\.co|vercel\.app|r2\.cloudflarestorage|cloudflare/i.test(risky)) throw new Error("Destino remoto detectado no ambiente.");
  return {
    ...process.env,
    DO_NOT_TRACK: "1",
    SUPABASE_DISABLE_TELEMETRY: "1",
    ALLOW_LOCAL_TESTS: "true",
    COMUN_BASE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    MEDIA_STORAGE_PROVIDER: "supabase-local",
  };
}

const env = values();
if (mode === "check") {
  console.log("COMUN_LOCAL_ENV_OK");
  process.exit(0);
}
if (mode === "print-safe") {
  console.log(JSON.stringify({ application: env.COMUN_BASE_URL, supabase: env.NEXT_PUBLIC_SUPABASE_URL, storage_provider: env.MEDIA_STORAGE_PROVIDER, mode: "local", secrets: "redacted" }, null, 2));
  process.exit(0);
}
const command = process.argv[3];
const args = process.argv.slice(4);
if (!command) throw new Error("Comando filho ausente.");
const child = spawn(command, args, { env, stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));
