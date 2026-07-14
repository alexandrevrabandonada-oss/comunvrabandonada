import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
if (process.env.RUN_REAL_R2_SMOKE !== "true")
  throw new Error("Smoke real bloqueado. Defina RUN_REAL_R2_SMOKE=true.");
for (const k of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ENDPOINT",
])
  if (!process.env[k]) throw new Error(`Configuracao ausente: ${k}`);
console.log(
  "[ok] gate de escrita habilitado; use a verificacao server-side/admin para fixture e cleanup",
);
