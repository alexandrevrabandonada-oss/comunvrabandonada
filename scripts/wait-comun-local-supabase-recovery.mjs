import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "./local-environment.mjs";

const project = "COMUM_VR_ABANDONADA";
const timeoutMs = Number(process.env.COMUN_SUPABASE_RECOVERY_TIMEOUT_MS ?? 120000);
const intervalMs = Number(process.env.COMUN_SUPABASE_RECOVERY_INTERVAL_MS ?? 1500);
const requiredConsecutive = Number(process.env.COMUN_SUPABASE_RECOVERY_CONSECUTIVE ?? 2);

function containerHealth(name) {
  const value = execFileSync("docker", ["inspect", "-f", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", `supabase_${name}_${project}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (value !== "healthy" && value !== "running") throw new Error(`${name}=${value || "ausente"}`);
}

async function check() {
  assertLocalEnvironment();
  const env = { API_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(env.API_URL ?? "") || !env.SERVICE_ROLE_KEY) throw new Error("credenciais locais ausentes no ambiente do recovery");
  for (const name of ["db", "rest", "kong", "auth", "storage"]) containerHealth(name);
  const health = await fetch(`${env.API_URL}/auth/v1/health`);
  if (!health.ok) throw new Error(`auth http=${health.status}`);
  const rest = await fetch(`${env.API_URL}/rest/v1/`);
  if (rest.status >= 500) throw new Error(`rest http=${rest.status}`);
  const storage = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const buckets = await storage.storage.listBuckets();
  if (buckets.error || !buckets.data?.some((bucket) => bucket.id === "archive-private-originals") || !buckets.data?.some((bucket) => bucket.id === "archive-public-derivatives")) throw new Error(`storage=${buckets.error?.message ?? "buckets ausentes"}`);
}

export async function waitForLocalSupabaseRecovery() {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let consecutive = 0;
  let attempts = 0;
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    attempts += 1;
    try {
      await check();
      consecutive += 1;
      console.log(`COMUN_LOCAL_SUPABASE_RECOVERY_CHECK attempt=${attempts} consecutive=${consecutive}`);
      if (consecutive >= requiredConsecutive) {
        const result = { ok: true, startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, attempts, consecutive, lastError };
        console.log(`COMUN_LOCAL_SUPABASE_RECOVERED durationMs=${result.durationMs} attempts=${attempts}`);
        return result;
      }
    } catch (error) {
      consecutive = 0;
      lastError = error instanceof Error ? error.message : String(error);
      console.log(`COMUN_LOCAL_SUPABASE_RECOVERY_WAIT attempt=${attempts} error=${lastError}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`COMUN_LOCAL_SUPABASE_RECOVERY_TIMEOUT attempts=${attempts} lastError=${lastError}`);
}

if (process.argv[1]?.endsWith("wait-comun-local-supabase-recovery.mjs")) await waitForLocalSupabaseRecovery();
