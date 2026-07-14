import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const base = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const page = await fetch(`${base}/comun/admin/acervo/verificacao`, {
  redirect: "manual",
});
if (![302, 303, 307, 308].includes(page.status))
  throw new Error(`Rota admin exposta: ${page.status}`);
const html = await page.text();
for (const marker of [
  "R2_SECRET_ACCESS_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "signed_url",
])
  if (html.includes(marker)) throw new Error("Marcador sensivel exposto");
const publicPage = await fetch(`${base}/comun/acervo`, { cache: "no-store" });
const publicHtml = await publicPage.text();
if (
  publicHtml.includes("comun_system_verification_runs") ||
  publicHtml.includes("production-verification/")
)
  throw new Error("Verificacao exposta publicamente");
console.log("[ok] pagina de verificacao protegida e sem vazamentos");
