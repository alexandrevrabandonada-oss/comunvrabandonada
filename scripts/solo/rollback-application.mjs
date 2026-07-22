import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let checkpoint;
try { checkpoint = JSON.parse(readFileSync(".solo-checkpoint/vercel.json", "utf8")); } catch { checkpoint = null; }
const previous = checkpoint?.previousDeployment?.url;
if (previous && process.env.VERCEL_TOKEN) {
  execFileSync("npx", ["--yes", "vercel@46.2.0", "rollback", previous, "--yes", `--token=${process.env.VERCEL_TOKEN}`, ...(process.env.VERCEL_TEAM_ID ? ["--scope", process.env.VERCEL_TEAM_ID] : [])], { stdio: "inherit" });
}
if (process.env.GH_TOKEN) {
  const title = `Incidente de promoção solo ${process.env.SHA?.slice(0, 12) ?? "desconhecido"}`;
  execFileSync("gh", ["issue", "create", "--title", title, "--body", "A promoção automatizada falhou. O banco permanece forward-compatible e nenhum SQL reverso foi executado. Verificar os logs sanitizados do workflow."], { stdio: "inherit" });
}
console.log(previous ? "COMUN_APPLICATION_ROLLBACK_REQUESTED" : "COMUN_APPLICATION_ROLLBACK_UNAVAILABLE");
