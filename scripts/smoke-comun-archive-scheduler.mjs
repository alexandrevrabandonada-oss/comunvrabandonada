import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const base = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
for (const path of ["run", "health"]) {
  const r = await fetch(`${base}/api/internal/archive-processing/${path}`, {
    method: path === "run" ? "POST" : "GET",
  });
  if (r.status !== 401) throw new Error(`${path} exposto`);
}
const get = await fetch(`${base}/api/internal/archive-processing/run`);
if (get.status !== 405) throw new Error("run aceita GET");
console.log("[ok] scheduler e health protegidos");
